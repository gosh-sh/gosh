use super::call::BlockchainCall;
use async_trait::async_trait;
use cached::once_cell::sync::Lazy;
use cached::{proc_macro::cached, SizedCache};
use std::sync::atomic::AtomicU64;
use std::sync::atomic::Ordering::SeqCst;
use std::{cell::RefCell, sync::Once};
use tokio::{runtime::Handle, sync::RwLock, task};
use ton_client::crypto::KeyPair;

use crate::{abi, config::UserWalletConfig};

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
static _USER_WALLET: Lazy<RwLock<Option<GoshContract>>> = Lazy::new(|| RwLock::new(None));

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
        .read_state(
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
        .read_state(blockchain.client(), "getAddrWallet", Some(params))
        .await?;
    let user_wallet_address = result.address;
    tracing::trace!("user_wallet address: {:?}", user_wallet_address);
    let secrets = KeyPair::new(pubkey.into(), secret.into());

    let contract = GoshContract::new_with_keys(&user_wallet_address, abi::WALLET, secrets);
    Ok(contract)
}

#[instrument(level = "debug", skip(blockchain))]
async fn zero_user_wallet(
    blockchain: &impl BlockchainService,
    remote_network: &str,
    root_contract: &GoshContract,
    dao_addr: &BlockchainContractAddress,
) -> anyhow::Result<GoshContract> {
    tracing::debug!("zero_user_wallet start");
    if _USER_WALLET.read().await.is_none() {
        tracing::debug!("zero_user_wallet lock read taken");
        // TODO: fix this madness
        let wallet_config = blockchain.wallet_config();
        if wallet_config.is_none() {
            anyhow::bail!("User wallet config must be set");
        }
        let config = wallet_config.as_ref().expect("Guarded");
        let local_user_wallet =
            get_user_wallet(blockchain, &root_contract, &dao_addr, &config, 0).await?;
        let mut user_wallet = _USER_WALLET.write().await;
        tracing::debug!("zero_user_wallet lock write taken");
        if user_wallet.is_none() {
            *user_wallet = Some(local_user_wallet);
        }
    };

    let res = _USER_WALLET.read().await.as_ref().unwrap().clone();
    tracing::debug!("zero_user_wallet lock read2 taken");

    Ok(res)
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
    #[instrument(level = "debug", skip(self))]
    async fn user_wallet(
        &self,
        dao_address: &BlockchainContractAddress,
        remote_network: &str,
    ) -> anyhow::Result<GoshContract> {
        tracing::debug!("wallet_config start");
        let client = self.client();
        let wallet_config = self.wallet_config();
        if wallet_config.is_none() {
            anyhow::bail!("User wallet config must be set");
        }
        let wallet_config = wallet_config.clone().expect("Guarded");
        tracing::debug!("wallet_config before zero_user_wallet");
        let zero_wallet =
            zero_user_wallet(self, &remote_network, self.root_contract(), &dao_address).await?;

        let (user_wallet_index, max_number_of_user_wallets) = {
            match user_wallet_config_max_number_of_mirrors(&client, &zero_wallet).await {
                Err(e) => {
                    tracing::warn!("user_wallet_config_max_number_of_mirrors error: {}", e);
                    return Ok(zero_wallet);
                }
                Ok(max_number_of_user_wallets) => {
                    let next_index = USER_WALLET_INDEX
                        .with(|e| e.replace_with(|&mut v| (v + 1) % max_number_of_user_wallets));
                    (next_index, max_number_of_user_wallets)
                }
            }
        };

        tracing::debug!("about to lock on INIT_USER_WALLET_MIRRORS call_once");
        INIT_USER_WALLET_MIRRORS.call_once(|| {
            let blockchain = self.clone();
            let zero_wallet = zero_wallet.clone();
            tracing::debug!("about to lock on init_user_wallet");
            task::block_in_place(move || {
                Handle::current().block_on(init_user_wallet_mirrors(
                    &blockchain,
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

#[instrument(level = "debug", skip(blockchain))]
async fn init_user_wallet_mirrors<B, C>(
    blockchain: &B,
    wallet: &C,
    max_number_of_mirrors: u64,
) -> anyhow::Result<()>
where
    B: BlockchainService + BlockchainCall,
    C: ContractRead + ContractInfo + Sync,
{
    tracing::debug!("init_user_wallet_mirrors start");
    let result: GetWalletMirrorsCountResult = wallet
        .read_state(blockchain.client(), "getWalletsCount", None)
        .await?;
    for _ in result.number_of_mirrors.into()..max_number_of_mirrors {
        blockchain.call(wallet, "deployWallet", None).await?;
    }
    Ok(())
}

static MAX_NUMBER_OF_MIRRORS: AtomicU64 = AtomicU64::new(0);

async fn user_wallet_config_max_number_of_mirrors(
    client: &EverClient,
    user_wallet_contract: &impl ContractRead,
) -> anyhow::Result<u64> {
    let mut number = MAX_NUMBER_OF_MIRRORS.load(SeqCst);
    if number == 0u64 {
        tracing::debug!("user_wallet_config_max_number_of_mirrors");
        let result: GetConfigResult = user_wallet_contract
            .read_state(client, "getConfig", None)
            .await?;
        number = result.max_number_of_mirror_wallets.into();
        MAX_NUMBER_OF_MIRRORS.swap(number, SeqCst);
    }
    tracing::debug!("number of mirrors {}", number);
    Ok(number)
}
