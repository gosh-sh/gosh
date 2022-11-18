use async_trait::async_trait;
use once_cell::sync::Lazy;

use std::sync::Arc;
use tokio::sync::RwLock;
use ton_client::crypto::KeyPair;

use crate::{abi, config::UserWalletConfig};

use super::{
    contract::ContractRead, BlockchainContractAddress, BlockchainService, Everscale, GoshContract,
};
mod mirrors;
pub use mirrors::{UserWalletMirrors, UserWalletsMirrorsInnerState};
pub type UserWallet = Arc<UserWalletMirrors>;

const WALLET_CONTRACTS_PARALLELISM: u32 = 100u32;

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

static _USER_WALLET: Lazy<UserWallet> =
    Lazy::new(|| Arc::new(UserWalletMirrors::empty(WALLET_CONTRACTS_PARALLELISM)));

#[instrument(level = "debug", skip(blockchain))]
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

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait BlockchainUserWalletService {
    fn wallet_config(&self) -> &Option<UserWalletConfig>;
    async fn user_wallet(
        &self,
        dao_address: &BlockchainContractAddress,
        remote_network: &str,
    ) -> anyhow::Result<UserWallet>;
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
    ) -> anyhow::Result<UserWallet> {
        tracing::debug!("wallet_config start");
        if !_USER_WALLET.is_ready() {
            let config = self.wallet_config().clone().ok_or(anyhow::anyhow!(
                "user wallet config does not exist or invalid"
            ))?;
            let gosh_root = self.root_contract().clone();
            _USER_WALLET
                .init_zero_wallet(|| async {
                    let client = self.client();
                    let wallet_config = config.clone();
                    tracing::debug!("wallet_config before zero_user_wallet");
                    let zero_contract: GoshContract = get_user_wallet(
                        self,
                        self.root_contract(),
                        &dao_address,
                        &wallet_config,
                        0,
                    )
                    .await?;
                    Ok(UserWalletsMirrorsInnerState::new(
                        zero_contract,
                        gosh_root,
                        dao_address.clone(),
                        config.clone(),
                    ))
                })
                .await?;
        }
        if !_USER_WALLET.is_mirrors_ready() {
            let init_mirrors_result = _USER_WALLET.try_init_mirrors(self).await;
            if let Err(e) = init_mirrors_result {
                tracing::debug!("init mirrors error: {}", e);
            }
        }
        let wallet: UserWallet = _USER_WALLET.clone();
        return Ok(wallet);
    }
}
