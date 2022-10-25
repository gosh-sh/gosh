use crate::{
    blockchain::{
        call, get_commit_address, user_wallet::BlockchainUserWallet, BlockchainContractAddress,
        BlockchainService, ZERO_SHA,
    },
    git_helper::GitHelper,
};
use git_hash::ObjectId;
use git_odb::Find;

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

#[instrument(level = "debug")]
pub async fn push_commit(
    context: &mut GitHelper<impl BlockchainService + BlockchainUserWallet>,
    commit_id: &ObjectId,
    branch: &str,
) -> anyhow::Result<()> {
    let mut buffer: Vec<u8> = Vec::new();
    let commit = context
        .local_repository()
        .objects
        .try_find(commit_id, &mut buffer)?
        .expect("Commit should exists");

    let raw_commit = String::from_utf8(commit.data.to_vec())?;

    let mut commit_iter = commit.try_into_commit_iter().unwrap();
    let tree_id = commit_iter.tree_id()?;
    let parent_ids: Vec<String> = commit_iter.parent_ids().map(|e| e.to_string()).collect();
    let mut parents: Vec<BlockchainContractAddress> = vec![];
    for id in parent_ids {
        let parent = get_commit_address(
            &context.ever_client,
            &mut context.repo_contract,
            &id.to_string(),
        )
        .await?;
        parents.push(parent);
    }
    if parents.is_empty() {
        let bogus_parent =
            get_commit_address(&context.ever_client, &mut context.repo_contract, ZERO_SHA).await?;
        parents.push(bogus_parent);
    }
    let tree_addr = context.calculate_tree_address(tree_id).await?;

    let args = DeployCommitParams {
        repo_name: context.remote.repo.clone(),
        branch_name: branch.to_string(),
        commit_id: commit_id.to_string(),
        raw_commit,
        parents,
        tree_addr,
        upgrade: false,
    };
    log::debug!("deployCommit params: {:?}", args);

    let wallet = context
        .blockchain
        .user_wallet(
            &context.ever_client,
            &context.config,
            &context.repo_contract,
            &context.dao_addr,
            &context.remote.network,
        )
        .await?;
    let params = serde_json::to_value(args)?;
    let result = call(&context.ever_client, &wallet, "deployCommit", Some(params)).await?;
    log::debug!("deployCommit result: {:?}", result);
    Ok(())
}

#[instrument(level = "debug")]
pub async fn notify_commit(
    context: &mut GitHelper<impl BlockchainService + BlockchainUserWallet>,
    commit_id: &ObjectId,
    branch: &str,
    number_of_files_changed: u32,
    number_of_commits: u64,
) -> anyhow::Result<()> {
    let wallet = context
        .blockchain
        .user_wallet(
            &context.ever_client,
            &context.config,
            &context.repo_contract,
            &context.dao_addr,
            &context.remote.network,
        )
        .await?;
    let params = serde_json::json!({
        "repoName": context.remote.repo.clone(),
        "branchName": branch.to_string(),
        "commit": commit_id.to_string(),
        "numberChangedFiles": number_of_files_changed,
        "numberCommits": number_of_commits,
    });
    let result = call(&context.ever_client, &wallet, "setCommit", Some(params)).await?;
    log::debug!("setCommit result: {:?}", result);
    Ok(())
}
