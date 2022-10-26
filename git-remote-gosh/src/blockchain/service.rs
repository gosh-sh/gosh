use super::{
    commit::save::BlockchainCommitPusher, contract::ContractRead,
    user_wallet::BlockchainUserWalletService, BlockchainContractAddress, GetAddrBranchResult,
    GetBoolResult, GoshContract, TonClient,
};
use crate::{
    abi as gosh_abi,
    config::{NetworkConfig, UserWalletConfig},
};
use async_trait::async_trait;
use std::fmt::Debug;

#[async_trait]
pub trait BlockchainBranchesService {
    async fn is_branch_protected(
        &self,
        repository_address: &BlockchainContractAddress,
        branch_name: &str,
    ) -> anyhow::Result<bool>;
    async fn remote_rev_parse(
        &self,
        repository_address: &BlockchainContractAddress,
        rev: &str,
    ) -> anyhow::Result<Option<(BlockchainContractAddress, String)>>;
}

#[async_trait]
pub trait BlockchainService:
    Debug
    + Sync
    + Send
    + BlockchainCommitPusher
    + BlockchainUserWalletService
    + BlockchainBranchesService
{
    fn client(&self) -> &TonClient;
    fn root_contract(&self) -> &GoshContract;
    fn repo_contract(&self) -> &GoshContract;
}

#[async_trait]
impl BlockchainBranchesService for Everscale {
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

#[derive(Builder, Clone)]
pub struct Everscale {
    pub network: NetworkConfig,
    pub wallet_config: Option<UserWalletConfig>,
    pub ever_client: TonClient,
    pub root_contract: GoshContract,
    pub repo_contract: GoshContract,
}

impl Everscale {}

impl std::fmt::Debug for Everscale {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // TODO
        f.debug_struct("Everscale").finish()
    }
}

#[async_trait]
impl BlockchainService for Everscale {
    fn client(&self) -> &TonClient {
        &self.ever_client
    }

    fn root_contract(&self) -> &GoshContract {
        &self.root_contract
    }

    fn repo_contract(&self) -> &GoshContract {
        &self.repo_contract
    }
}

#[cfg(test)]
mod tests {
    // use super::*;
    // mockall::mock! {
    //     _BlockchainService {

    //     }

    //     impl BlockchainService for _BlockchainService {
    //     fn client(&self) -> &TonClient;
    //     fn root_contract(&self) -> &GoshContract;
    //     fn repo_contract(&self) -> &GoshContract;

    //     #[instrument(level = "debug")]
    //     async fn is_branch_protected(
    //         &self,
    //         repository_address: &BlockchainContractAddress,
    //         branch_name: &str,
    //     ) -> anyhow::Result<bool> {
    //         let contract = GoshContract::new(repository_address, gosh_abi::REPO);

    //         let params = serde_json::json!({ "branch": branch_name });
    //         let result: GetBoolResult = contract
    //             .run_local(self.client(), "isBranchProtected", Some(params))
    //             .await?;
    //         Ok(result.is_ok)
    //     }

    //     async fn remote_rev_parse(
    //         &self,
    //         repository_address: &BlockchainContractAddress,
    //         rev: &str,
    //     ) -> anyhow::Result<Option<(BlockchainContractAddress, String)>> {
    //         let contract = GoshContract::new(repository_address, gosh_abi::REPO);
    //         let args = serde_json::json!({ "name": rev });
    //         let result: GetAddrBranchResult = contract
    //             .read_state(self.client(), "getAddrBranch", Some(args))
    //             .await?;
    //         if result.branch.branch_name.is_empty() {
    //             Ok(None)
    //         } else {
    //             Ok(Some((result.branch.commit_address, result.branch.version)))
    //         }
    //     }

    //     }
    //     impl BlockchainPusher for _BlockchainService {

    //     async fn push_commit(
    //         &self,
    //         commit_id: &ObjectId,
    //         branch: &str,
    //         tree_addr: &BlockchainContractAddress,
    //         remote: &Remote,
    //         dao_addr: &BlockchainContractAddress,
    //         raw_commit: String,
    //         parents: Vec<BlockchainContractAddress>,
    //     ) -> anyhow::Result<()>;
    //     async fn notify_commit(
    //         &self,
    //         commit_id: &ObjectId,
    //         branch: &str,
    //         number_of_files_changed: u32,
    //         number_of_commits: u64,
    //         remote: &Remote,
    //         dao_addr: &BlockchainContractAddress,
    //     ) -> anyhow::Result<()>;
    //     }
    //     impl BlockchainUserWalletService for _BlockchainService {
    //     fn wallet_config(&self) -> &Option<UserWalletConfig>;
    //     async fn user_wallet(
    //         &self,
    //         dao_address: &BlockchainContractAddress,
    //         remote_network: &str,
    //     ) -> anyhow::Result<GoshContract>;

    //     }
    // }
}
