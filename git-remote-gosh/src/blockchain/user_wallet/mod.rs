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
mod mirrors;

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

static ZERO_USER_WALLET: Lazy<RwLock<Option<GoshContract>>> = Lazy::new(|| RwLock::new(None));

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
    if ZERO_USER_WALLET.read().await.is_none() {
        let mut user_wallet = ZERO_USER_WALLET.write().await;
        if user_wallet.is_none() {
            tracing::debug!("zero_user_wallet lock taken");
            let wallet_config = blockchain.wallet_config();
            if wallet_config.is_none() {
                anyhow::bail!("User wallet config must be set");
            }
            let config = wallet_config.as_ref().expect("Guarded");
            *user_wallet =
                Some(get_user_wallet(blockchain, &root_contract, &dao_addr, &config, 0).await?);
        }
    };

    let res = ZERO_USER_WALLET.read().await.as_ref().unwrap().clone();
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
        return Ok(mirrors::take_next_wallet(
            self,
            zero_wallet,
            self.root_contract(),
            &dao_address,
            &wallet_config,
        )
        .await);
    }
}
