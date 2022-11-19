use async_trait::async_trait;
use once_cell::sync::Lazy;

use std::sync::Arc;

use crate::config::UserWalletConfig;

use super::{BlockchainContractAddress, BlockchainService, Everscale, GoshContract};
pub mod inner_calls;
mod inner_state;
mod state;
pub use inner_state::UserWalletsMirrorsInnerState;
pub use state::UserWalletMirrors;
pub type UserWallet = Arc<UserWalletMirrors>;

static _USER_WALLET: Lazy<UserWallet> = Lazy::new(|| Arc::new(UserWalletMirrors::new()));

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
        if !_USER_WALLET.is_zero_wallet_ready().await {
            let config = self.wallet_config().clone().ok_or(anyhow::anyhow!(
                "user wallet config does not exist or invalid"
            ))?;
            let gosh_root = self.root_contract().clone();
            _USER_WALLET
                .init_zero_wallet(|| async {
                    let client = self.client();
                    let wallet_config = config.clone();
                    tracing::debug!("wallet_config before zero_user_wallet");
                    let zero_contract: GoshContract = inner_calls::get_user_wallet(
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
        if !_USER_WALLET.is_mirrors_ready().await {
            let init_mirrors_result = _USER_WALLET.try_init_mirrors(self).await;
            if let Err(e) = init_mirrors_result {
                tracing::debug!("init mirrors error: {}", e);
            }
        }
        let wallet: UserWallet = _USER_WALLET.clone();
        return Ok(wallet);
    }
}
