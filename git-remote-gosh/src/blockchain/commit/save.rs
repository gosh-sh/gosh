use crate::{
    blockchain::{
        call::BlockchainCall, user_wallet::BlockchainUserWalletService,
        BlockchainContractAddress, Everscale,
    },
    utilities::Remote,
};
use async_trait::async_trait;
use git_hash::ObjectId;

#[derive(Serialize, Debug)]
pub struct DeployCommitParams {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "branchName")]
    pub branch_name: String,
    #[serde(rename = "commitName")]
    pub commit_id: String,
    #[serde(rename = "fullCommit")]
    pub raw_commit: String,
    pub parents: Vec<BlockchainContractAddress>,
    #[serde(rename = "tree")]
    pub tree_addr: BlockchainContractAddress,
    upgrade: bool,
}

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait BlockchainCommitPusher {
    async fn push_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        tree_addr: &BlockchainContractAddress,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
        raw_commit: String,
        parents: Vec<BlockchainContractAddress>,
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
impl BlockchainCommitPusher for Everscale {
    // #[instrument(level = "debug")]
    async fn push_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        tree_addr: &BlockchainContractAddress,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
        raw_commit: String,
        parents: Vec<BlockchainContractAddress>,
    ) -> anyhow::Result<()> {
        let args = DeployCommitParams {
            repo_name: remote.repo.clone(),
            branch_name: branch.to_string(),
            commit_id: commit_id.to_string(),
            raw_commit,
            parents,
            tree_addr: tree_addr.clone(),
            upgrade: false,
        };
        log::debug!("deployCommit params: {:?}", args);

        let wallet = self.user_wallet(&dao_addr, &remote.network).await?;
        let params = serde_json::to_value(args)?;
        let result = self.call(&wallet, "deployCommit", Some(params)).await?;
        log::debug!("deployCommit result: {:?}", result);
        Ok(())
    }

    #[instrument(level = "debug")]
    async fn notify_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        number_of_files_changed: u32,
        number_of_commits: u64,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
    ) -> anyhow::Result<()> {
        let wallet = self.user_wallet(&dao_addr, &remote.network).await?;
        let params = serde_json::json!({
            "repoName": remote.repo.clone(),
            "branchName": branch.to_string(),
            "commit": commit_id.to_string(),
            "numberChangedFiles": number_of_files_changed,
            "numberCommits": number_of_commits,
        });
        let result = self.call(&wallet, "setCommit", Some(params)).await?;
        log::debug!("setCommit result: {:?}", result);
        Ok(())
    }
}
