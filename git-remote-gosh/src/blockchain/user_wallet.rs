use cached::proc_macro::cached;
use cached::SizedCache;
use std::cell::RefCell;
use std::sync::Once;
use tokio::runtime::Handle;
use tokio::task;

use crate::abi;
use crate::blockchain;
use crate::blockchain::contract::{Contract, ContractRead};
use crate::blockchain::BlockchainContractAddress;
use crate::blockchain::GoshContract;
use crate::blockchain::TonClient;
use crate::config::UserWalletConfig;
use crate::git_helper::GitHelper;
use ton_client::crypto::KeyPair;

use super::contract::ContractInfo;
use super::serde_number::NumberU64;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Deserialize, Debug)]
struct GetAddrWalletResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetAddrDaoResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetConfigResult {
    #[serde(rename = "value0")]
    pub max_number_of_mirror_wallets: NumberU64,
}

#[derive(Deserialize, Debug)]
struct GetWalletMirrorsCountResult {
    #[serde(rename = "value0")]
    pub number_of_mirrors: NumberU64,
}

// Note: it's default DAO config. Will be read from DAO in the next versions
thread_local! {
    static USER_WALLET_INDEX: RefCell<u64> = RefCell::new(0);
}

static INIT_USER_WALLET_MIRRORS: Once = Once::new();

pub async fn get_user_wallet(
    client: &TonClient,
    dao_address: &BlockchainContractAddress,
    pubkey: &str,
    secret: &str,
    user_wallet_index: u64,
) -> Result<GoshContract> {
    // let gosh_root_contract = GoshContract::new(
    //     gosh_root_contract_address,
    //     abi::GOSH
    // );

    // let dao_address: GetAddrDaoResult = gosh_root_contract.run_static(
    //     &client,
    //     "getAddrDao",
    //     Some(serde_json::json!({
    //         "name": dao_name
    //     }))
    // ).await?;
    let dao_contract = GoshContract::new(dao_address, abi::DAO);
    let result: GetAddrWalletResult = dao_contract
        .run_local(
            client,
            "getAddrWallet",
            Some(serde_json::json!({
                "pubkey": format!("0x{}", pubkey),
                "index": user_wallet_index
            })),
        )
        .await?;
    let user_wallet_address = result.address;
    log::trace!("user_wallet address: {:?}", user_wallet_address);
    let secrets = KeyPair::new(pubkey.into(), secret.into());

    let contract = GoshContract::new_with_keys(&user_wallet_address, abi::WALLET, secrets);
    Ok(contract)
}

lazy_static! {
    static ref _USER_WALLET: std::sync::RwLock<Option<GoshContract>> = std::sync::RwLock::new(None);
}

#[instrument(level = "debug", skip(context))]
async fn zero_user_wallet(context: &GitHelper) -> Result<GoshContract> {
    if _USER_WALLET.read().unwrap().is_none() {
        let mut user_wallet = _USER_WALLET.write().unwrap();
        if user_wallet.is_none() {
            let config = user_wallet_config(context);
            if config.is_none() {
                return Err("User wallet config must be set".into());
            }
            let config = config.expect("Guarded");
            *user_wallet = Some(
                get_user_wallet(
                    &context.es_client,
                    &context.dao_addr,
                    &config.pubkey,
                    &config.secret,
                    0,
                )
                .await?,
            );
        }
    };

    Ok(_USER_WALLET.read().unwrap().as_ref().unwrap().clone())
}

#[instrument(level = "debug", skip(context))]
pub async fn user_wallet(context: &GitHelper) -> Result<GoshContract> {
    let config = user_wallet_config(context);
    if config.is_none() {
        return Err("User wallet config must be set".into());
    }
    let config = config.expect("Guarded");
    let zero_wallet = zero_user_wallet(context).await?;

    let (user_wallet_index, max_number_of_user_wallets) = {
        match user_wallet_config_max_number_of_mirrors(&context.es_client, &zero_wallet).await {
            Err(e) => {
                log::warn!("user_wallet_config_max_number_of_mirrors error: {}", e);
                return Ok(zero_wallet);
            }
            Ok(max_number_of_user_wallets) => {
                let next_index = USER_WALLET_INDEX
                    .with(|e| e.replace_with(|&mut v| (v + 1) % max_number_of_user_wallets));
                (next_index, max_number_of_user_wallets)
            }
        }
    };

    INIT_USER_WALLET_MIRRORS.call_once(|| {
        let es_client = context.es_client.clone();
        let zero_wallet = zero_wallet.clone();
        task::block_in_place(move || {
            Handle::current().block_on(init_user_wallet_mirrors(
                &es_client,
                &zero_wallet,
                max_number_of_user_wallets,
            ));
        });
    });

    get_user_wallet(
        &context.es_client,
        &context.dao_addr,
        &config.pubkey,
        &config.secret,
        user_wallet_index,
    )
    .await
}

fn user_wallet_config(context: &GitHelper) -> Option<UserWalletConfig> {
    context
        .config
        .find_network_user_wallet(&context.remote.network)
}

async fn init_user_wallet_mirrors<C>(
    client: &TonClient,
    user_wallet_contract: &C,
    max_number_of_mirrors: u64,
) -> Result<()>
where
    C: ContractRead + ContractInfo,
{
    let n = user_wallet_config_max_number_of_mirrors(client, user_wallet_contract).await?;
    let result: GetWalletMirrorsCountResult = user_wallet_contract
        .read_state(client, "getWalletsCount", None)
        .await?;
    for _ in result.number_of_mirrors.into()..n {
        blockchain::call(client, user_wallet_contract, "deployWallet", None).await;
    }
    Ok(())
}

// Note: explicitly removing caching keys so it becomes RO global
#[cached(
    result = true,
    type = "SizedCache<String, u64>",
    create = "{ SizedCache::with_size(1) }",
    convert = r#"{ "user_wallet_config_max_number_of_mirrors".to_string() }"#
)]
async fn user_wallet_config_max_number_of_mirrors(
    client: &TonClient,
    user_wallet_contract: &impl ContractRead,
) -> Result<u64> {
    let result: GetConfigResult = user_wallet_contract
        .read_state(client, "getConfig", None)
        .await?;
    Ok(result.max_number_of_mirror_wallets.into())
}
