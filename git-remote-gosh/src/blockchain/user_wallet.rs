use async_trait::async_trait;
use cached::{proc_macro::cached, SizedCache};
use std::{cell::RefCell, sync::Once};
use tokio::{runtime::Handle, sync::RwLock, task};
use ton_client::crypto::KeyPair;

use crate::{abi, blockchain::call, config::UserWalletConfig};

use super::{
    contract::{ContractInfo, ContractRead},
    serde_number::NumberU64,
    BlockchainContractAddress, BlockchainService, EverClient, Everscale, GoshContract,
};

#[derive(Deserialize, Debug)]
struct GetProfileAddrResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetAddrWalletResult {
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
lazy_static! {
    static ref _USER_WALLET: RwLock<Option<GoshContract>> = RwLock::new(None);
}

async fn get_user_wallet(
    blockchain: &impl BlockchainService,
    gosh_root: &GoshContract,
    dao_address: &BlockchainContractAddress,
    wallet: &UserWalletConfig,
    user_wallet_index: u64,
) -> anyhow::Result<GoshContract> {
    let UserWalletConfig {
        pubkey,
        secret,
        profile,
    }: UserWalletConfig = blockchain
        .wallet_config()
        .clone()
        .ok_or_else(|| anyhow::anyhow!("Wallet config expected"))?;

    let result: GetProfileAddrResult = gosh_root
        .run_local(
            blockchain.client(),
            "getProfileAddr",
            Some(serde_json::json!({ "name": profile })),
        )
        .await?;
    let dao_contract = GoshContract::new(dao_address, abi::DAO);

    let params = serde_json::json!({
        "pubaddr": result.address,
        "index": user_wallet_index
    });
    let result: GetAddrWalletResult = dao_contract
        .run_local(blockchain.client(), "getAddrWallet", Some(params))
        .await?;
    let user_wallet_address = result.address;
    log::trace!("user_wallet address: {:?}", user_wallet_address);
    let secrets = KeyPair::new(pubkey.into(), secret.into());

    let contract = GoshContract::new_with_keys(&user_wallet_address, abi::WALLET, secrets);
    Ok(contract)
}

// #[instrument(level = "debug", skip(context))]
async fn zero_user_wallet(
    blockchain: &impl BlockchainService,
    remote_network: &str,
    root_contract: &GoshContract,
    dao_addr: &BlockchainContractAddress,
) -> anyhow::Result<GoshContract> {
    if _USER_WALLET.read().await.is_none() {
        let mut user_wallet = _USER_WALLET.write().await;
        if user_wallet.is_none() {
            // TODO: fix this madness
            let wallet_config = blockchain.wallet_config();
            if wallet_config.is_none() {
                anyhow::bail!("User wallet config must be set");
            }
            let config = wallet_config.as_ref().expect("Guarded");
            *user_wallet =
                Some(get_user_wallet(blockchain, &root_contract, &dao_addr, &config, 0).await?);
        }
    };

    Ok(_USER_WALLET.read().await.as_ref().unwrap().clone())
}

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait BlockchainUserWalletService {
    fn wallet_config(&self) -> &Option<UserWalletConfig>;
    async fn user_wallet(
        &self,
        dao_address: &BlockchainContractAddress,
        remote_network: &str,
    ) -> anyhow::Result<GoshContract>;
}

#[async_trait]
impl BlockchainUserWalletService for Everscale {
    fn wallet_config(&self) -> &Option<UserWalletConfig> {
        &self.wallet_config
    }
    // #[instrument(level = "debug", skip(context))]
    async fn user_wallet(
        &self,
        dao_address: &BlockchainContractAddress,
        remote_network: &str,
    ) -> anyhow::Result<GoshContract> {
        let client = self.client();
        let wallet_config = self.wallet_config();
        if wallet_config.is_none() {
            anyhow::bail!("User wallet config must be set");
        }
        let wallet_config = wallet_config.clone().expect("Guarded");
        let zero_wallet =
            zero_user_wallet(self, &remote_network, self.root_contract(), &dao_address).await?;

        let (user_wallet_index, max_number_of_user_wallets) = {
            match user_wallet_config_max_number_of_mirrors(&client, &zero_wallet).await {
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
            let es_client = client.clone();
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
            self,
            &self.root_contract(),
            &dao_address,
            &wallet_config,
            user_wallet_index,
        )
        .await
    }
}

async fn init_user_wallet_mirrors<C>(
    client: &EverClient,
    user_wallet_contract: &C,
    max_number_of_mirrors: u64,
) -> anyhow::Result<()>
where
    C: ContractRead + ContractInfo,
{
    let n = user_wallet_config_max_number_of_mirrors(client, user_wallet_contract).await?;
    let result: GetWalletMirrorsCountResult = user_wallet_contract
        .read_state(client, "getWalletsCount", None)
        .await?;
    for _ in result.number_of_mirrors.into()..n {
        call(client, user_wallet_contract, "deployWallet", None).await?;
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
    client: &EverClient,
    user_wallet_contract: &impl ContractRead,
) -> anyhow::Result<u64> {
    let result: GetConfigResult = user_wallet_contract
        .read_state(client, "getConfig", None)
        .await?;
    Ok(result.max_number_of_mirror_wallets.into())
}
