use crate::blockchain::{call, get_commit_address, GoshContract, TonClient, Tree, ZERO_SHA};
use git_hash::ObjectId;
use git_object::Data;
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

pub async fn pure_calculate_tree_address(
    cli: &TonClient,
    repo_addr: &str,
    tree_id: git_hash::ObjectId,
) -> Result<String, Box<dyn Error>> {
    Tree::calculate_address(&cli, repo_addr, &tree_id.to_string()).await
}

#[instrument(level = "debug", skip(cli))]
pub async fn push_commit(
    cli: &TonClient,
    wallet: &GoshContract,
    mut repo_contract: &mut GoshContract,
    commit: &Data<'_>,
    commit_id: &ObjectId,
    repo_name: &str,
    branch_name: &str,
) -> Result<(), Box<dyn Error>> {
    let raw_commit = String::from_utf8(commit.data.to_vec())?;

    let mut commit_iter = commit.clone().try_into_commit_iter().unwrap();
    let tree_id = commit_iter.tree_id()?;
    let tree_addr = pure_calculate_tree_address(&cli, &repo_name, tree_id).await?;
    let tree_id = commit_iter.tree_id()?;
    let parent_ids: Vec<String> = commit_iter.parent_ids().map(|e| e.to_string()).collect();
    let mut parents: Vec<String> = vec![];
    for id in parent_ids {
        let parent = get_commit_address(&cli, &mut repo_contract, &id.to_string()).await?;
        parents.push(parent);
    }
    if parents.len() == 0 {
        let bogus_parent = get_commit_address(&cli, &mut repo_contract, ZERO_SHA).await?;
        parents.push(bogus_parent);
    }

    let args = DeployCommitParams {
        repo_name: repo_name.to_string(),
        branch_name: branch_name.to_string(),
        commit_id: commit_id.to_string(),
        raw_commit,
        parents,
        tree_addr: tree_addr.to_string(),
    };
    log::debug!("deployCommit params: {:?}", args);

    let params = serde_json::to_value(args)?;
    let result = call(&cli, &wallet, "deployCommit", Some(params)).await?;
    log::debug!("deployCommit result: {:?}", result);
    Ok(())
}

#[instrument(level = "debug", skip(cli))]
pub async fn notify_commit(
    cli: &TonClient,
    wallet: &GoshContract,
    commit_id: &ObjectId,
    repo_name: &str,
    branch: &str,
    number_of_files_changed: u32,
) -> Result<(), Box<dyn Error>> {
    let params = serde_json::json!({
        "repoName": repo_name.to_string(),
        "branchName": branch.to_string(),
        "commit": commit_id.to_string(),
        "numberChangedFiles": number_of_files_changed,
    });
    let result = call(&cli, &wallet, "setCommit", Some(params)).await?;
    log::debug!("setCommit result: {:?}", result);
    Ok(())
}
