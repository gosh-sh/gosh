use super::{
    contract::ContractRead, BlockchainContractAddress, GetAddrBranchResult, GetBoolResult,
    GoshContract, TonClient,
};
use crate::{abi as gosh_abi, config::UserWalletConfig};
use async_trait::async_trait;
use std::fmt::Debug;

// #[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait BlockchainService: Debug + Sync + Send {
    fn client(&self) -> &TonClient;

    #[instrument(level = "debug")]
    async fn is_branch_protected(
        &self,
        repository_address: &BlockchainContractAddress,
        branch_name: &str,
    ) -> anyhow::Result<bool> {
        let contract = GoshContract::new(repository_address, gosh_abi::REPO);

        let params = serde_json::json!({ "branch": branch_name });
        let result: GetBoolResult = contract
            .run_local(self.client(), "isBranchProtected", Some(params))
            .await?;
        Ok(result.is_ok)
    }

    #[instrument(level = "debug")]
    async fn remote_rev_parse(
        &self,
        repository_address: &BlockchainContractAddress,
        rev: &str,
    ) -> anyhow::Result<Option<(BlockchainContractAddress, String)>> {
        let contract = GoshContract::new(repository_address, gosh_abi::REPO);
        let args = serde_json::json!({ "name": rev });
        let result: GetAddrBranchResult = contract
            .read_state(self.client(), "getAddrBranch", Some(args))
            .await?;
        if result.branch.branch_name.is_empty() {
            Ok(None)
        } else {
            Ok(Some((result.branch.commit_address, result.branch.version)))
        }
    }
}

pub struct Ever {
    pub wallet_config: Option<UserWalletConfig>,
    pub ever_client: TonClient,
}

impl Ever {
    pub fn new(wallet_config: Option<UserWalletConfig>, ever_client: TonClient) -> Self {
        Self {
            wallet_config,
            ever_client,
        }
    }
}

impl std::fmt::Debug for Ever {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Ever")
            .field("wallet_config", &self.wallet_config)
            .finish()
    }
}

#[async_trait]
impl BlockchainService for Ever {
    fn client(&self) -> &TonClient {
        &self.ever_client
    }
}
