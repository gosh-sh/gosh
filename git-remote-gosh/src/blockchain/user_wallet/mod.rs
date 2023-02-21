use async_trait::async_trait;
use once_cell::sync::Lazy;

use std::sync::Arc;

use crate::config::UserWalletConfig;

use super::{BlockchainContractAddress, Everscale};
pub mod inner_calls;
mod inner_state;
mod state;
pub use inner_state::UserWalletsMirrorsInnerState;
pub use state::{UserWalletMirrors, WalletError};
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

    #[instrument(level = "info", skip_all)]
    async fn user_wallet(
        &self,
        dao_address: &BlockchainContractAddress,
        remote_network: &str,
    ) -> anyhow::Result<UserWallet> {
        tracing::trace!("user_wallet: dao_address={dao_address}, remote_network={remote_network}");
        tracing::trace!("wallet_config start");
        if !_USER_WALLET.is_zero_wallet_ready().await {
            _USER_WALLET
                .init_zero_wallet(self, dao_address, remote_network)
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
