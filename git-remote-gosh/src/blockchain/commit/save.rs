use crate::{
    blockchain::{call, user_wallet},
    git_helper::GitHelper,
};
use git_hash::ObjectId;
use git_odb::Find;
use std::error::Error;

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
    pub parents: Vec<String>,
    #[serde(rename = "tree")]
    pub tree_addr: String,
}

#[instrument(level = "debug")]
pub async fn push_commit(
    context: &mut GitHelper,
    commit_id: &ObjectId,
    branch: &str,
) -> Result<(), Box<dyn Error>> {
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
    let mut parents: Vec<String> = vec![];
    for id in parent_ids {
        let parent = blockchain::get_commit_address(&context.es_client, &context.repo_addr, &id.to_string()).await?;
        parents.push(parent);
    }
    let tree_addr = context.calculate_tree_address(tree_id).await?;

    let args = DeployCommitParams {
        repo_name: context.remote.repo.clone(),
        branch_name: branch.to_string(),
        commit_id: commit_id.to_string(),
        raw_commit,
        parents,
        tree_addr,
    };
    log::debug!("deployCommit params: {:?}", args);

    let wallet = user_wallet(context)?;
    let params = serde_json::to_value(args)?;
    let result = call(&context.es_client, wallet, "deployCommit", Some(params)).await?;
    log::debug!("deployCommit result: {:?}", result);
    Ok(())
}
