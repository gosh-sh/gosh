use super::{
    branch::DeployBranch,
    commit::save::BlockchainCommitPusher,
    contract::ContractRead,
    get_contracts_blocks,
    snapshot::save::{DeployDiff, DeployNewSnapshot, DeleteSnapshot},
    tag::save::Tagging,
    tree::DeployTree,
    user_wallet::BlockchainUserWalletService,
    BlockchainContractAddress, EverClient, Everscale, GetAddrBranchResult, GetBoolResult,
    GoshCommit, GoshContract,
};
use crate::abi as gosh_abi;
use async_trait::async_trait;
use std::collections::HashMap;
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
pub trait BlockchainCommitService {
    async fn get_commit_by_addr(
        &self,
        address: &BlockchainContractAddress,
    ) -> anyhow::Result<Option<GoshCommit>>;
}

#[async_trait]
pub trait BlockchainReadContractRawDataService {
    async fn get_contracts_state_raw_data(
        &self,
        addresses: &[BlockchainContractAddress],
        allow_incomplete_results: bool,
    ) -> anyhow::Result<HashMap<BlockchainContractAddress, String>>;
}

#[async_trait]
pub trait BlockchainService:
    Debug
    + Clone
    + Sync
    + Send
    //
    + BlockchainCommitService
    + BlockchainCommitPusher
    + BlockchainUserWalletService
    + BlockchainBranchesService
    + BlockchainReadContractRawDataService
    // TODO: fix naming later
    + DeployBranch
    + DeployTree
    + DeployDiff
    + DeployNewSnapshot
    + DeleteSnapshot
    + Tagging
{
    fn client(&self) -> &EverClient;
    fn root_contract(&self) -> &GoshContract;
    fn repo_contract(&self) -> &GoshContract;
}

#[async_trait]
impl BlockchainBranchesService for Everscale {
    #[instrument(level = "info", skip_all)]
    async fn is_branch_protected(
        &self,
        repository_address: &BlockchainContractAddress,
        branch_name: &str,
    ) -> anyhow::Result<bool> {
        tracing::trace!("is_branch_protected: repository_address={repository_address}, branch_name={branch_name}");
        let contract = GoshContract::new(repository_address, gosh_abi::REPO);

        let params = serde_json::json!({ "branch": branch_name });
        let result: GetBoolResult = contract
            .read_state(self.client(), "isBranchProtected", Some(params))
            .await?;
        tracing::trace!("is_branch_protected result: {:?}", result);
        Ok(result.is_ok)
    }

    #[instrument(level = "info", skip_all)]
    async fn remote_rev_parse(
        &self,
        repository_address: &BlockchainContractAddress,
        rev: &str,
    ) -> anyhow::Result<Option<(BlockchainContractAddress, String)>> {
        tracing::trace!("remote_rev_parse: repository_address={repository_address}, rev={rev}");
        let contract = GoshContract::new(repository_address, gosh_abi::REPO);
        let args = serde_json::json!({ "name": rev });
        let result: GetAddrBranchResult = contract
            .read_state(self.client(), "getAddrBranch", Some(args))
            .await?;
        tracing::trace!("remote_rev_parse result: {:?}", result);
        if result.branch.branch_name.is_empty() {
            Ok(None)
        } else {
            Ok(Some((result.branch.commit_address, result.branch.version)))
        }
    }
}

#[async_trait]
impl BlockchainCommitService for Everscale {
    #[instrument(level = "info", skip_all)]
    async fn get_commit_by_addr(
        &self,
        address: &BlockchainContractAddress,
    ) -> anyhow::Result<Option<GoshCommit>> {
        tracing::trace!("get_commit_by_addr: address={address}");
        Ok(Some(GoshCommit::load(self.client(), address).await?))
    }
}

#[async_trait]
impl BlockchainReadContractRawDataService for Everscale {
    #[instrument(level = "info", skip_all)]
    async fn get_contracts_state_raw_data(
        &self,
        addresses: &[BlockchainContractAddress],
        allow_incomplete_results: bool,
    ) -> anyhow::Result<HashMap<BlockchainContractAddress, String>> {
        get_contracts_blocks(self.client(), addresses, allow_incomplete_results).await
    }
}

// impl Everscale {}

impl std::fmt::Debug for Everscale {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // TODO
        f.debug_struct("Everscale").finish()
    }
}

#[async_trait]
impl BlockchainService for Everscale {
    fn client(&self) -> &EverClient {
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
pub mod tests {
    use super::*;
    use crate::{
        blockchain::{snapshot::save::Diff, tree::TreeNode, user_wallet::UserWallet},
        config::UserWalletConfig,
        utilities::Remote,
    };
    use git_hash::ObjectId;
    use std::collections::HashMap;

    // see details: https://docs.rs/mockall/latest/mockall/#multiple-and-inherited-traits
    mockall::mock! {
        #[derive(Debug)]
        pub Everscale {
            // empty
        }

        // For unknown reason test fails with such clone, need to implement it separately
        // impl Clone for Everscale {
        //     fn clone(&self) -> Self;
        // }

        #[async_trait]
        impl DeployBranch for Everscale {
            async fn deploy_branch(
                &self,
                wallet: &UserWallet,
                repo_name: &str,
                new_name: &str,
                from_commit: &str,
            ) -> anyhow::Result<()>;
        }

        #[async_trait]
        impl DeployTree for Everscale {
            async fn deploy_tree(
                &self,
                wallet: &UserWallet,
                sha: &str,
                repo_name: &str,
                nodes: &HashMap<String, TreeNode>,
            ) -> anyhow::Result<()>;
        }

        #[async_trait]
        impl DeployDiff for Everscale {
            async fn deploy_diff(
                &self,
                wallet: &UserWallet,
                repo_name: String,
                branch_name: String,
                commit_id: String,
                diffs: Diff,
                index1: u32,
                index2: u32,
                last: bool,
            ) -> anyhow::Result<()>;
        }

        #[async_trait]
        impl DeployNewSnapshot for Everscale {
            async fn deploy_new_snapshot(
                &self,
                wallet: &UserWallet,
                repo_address: BlockchainContractAddress,
                branch_name: String,
                commit_id: String,
                file_path: String,
                content: String,
                ipfs: Option<String>
            ) -> anyhow::Result<()>;
        }

        #[async_trait]
        impl DeleteSnapshot for Everscale {
            async fn delete_snapshot(
                &self,
                wallet: &UserWallet,
                snapshot_address: BlockchainContractAddress,
            ) -> anyhow::Result<()>;
        }

        #[async_trait]
        impl Tagging for Everscale {
            async fn deploy_tag(
                &self,
                wallet: &UserWallet,
                repo_name: String,
                tag_name: String,
                commit_id: String,
                content: String,
                commit_address: BlockchainContractAddress,
            ) -> anyhow::Result<()>;

            async fn delete_tag(
                &self,
                wallet: &UserWallet,
                repo_name: String,
                tag_name: String,
            ) -> anyhow::Result<()>;
        }

        #[async_trait]
        impl BlockchainCommitPusher for Everscale {
            async fn push_commit(
                &self,
                commit_id: &ObjectId,
                branch: &str,
                tree_addr: &BlockchainContractAddress,
                remote: &Remote,
                dao_addr: &BlockchainContractAddress,
                raw_commit: &str,
                parents: &[BlockchainContractAddress],
                upgrade_commit: bool,
            ) -> anyhow::Result<()>;
            async fn notify_commit(
                &self,
                commit_id: &ObjectId,
                branch: &str,
                number_of_files_changed: u32,
                number_of_commits: u64,
                remote: &Remote,
                dao_addr: &BlockchainContractAddress,
            ) -> anyhow::Result<()>;
        }

        #[async_trait]
        impl BlockchainUserWalletService for Everscale {
            fn wallet_config(&self) -> &Option<UserWalletConfig>;
            async fn user_wallet(
                &self,
                dao_address: &BlockchainContractAddress,
                remote_network: &str,
            ) -> anyhow::Result<UserWallet>;

        }

        #[async_trait]
        impl BlockchainBranchesService for Everscale {
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
        impl BlockchainCommitService for Everscale {
            async fn get_commit_by_addr(
                &self,
                address: &BlockchainContractAddress,
            ) -> anyhow::Result<Option<GoshCommit>>;
        }

        #[async_trait]
        impl BlockchainService for Everscale {
            fn client(&self) -> &EverClient;
            fn root_contract(&self) -> &GoshContract;
            fn repo_contract(&self) -> &GoshContract;
        }
        #[async_trait]
        impl BlockchainReadContractRawDataService for Everscale {
            async fn get_contracts_state_raw_data(
                &self,
                addresses: &[BlockchainContractAddress],
                allow_incomplete_results: bool
            ) -> anyhow::Result<HashMap<BlockchainContractAddress, String>>;
        }
    }
    impl Clone for MockEverscale {
        fn clone(&self) -> Self {
            Self::new()
        }
    }
}
