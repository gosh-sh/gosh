use crate::git_helper::GitHelper;
use std::error::Error;
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
    pub parents: Vec<String>,
    #[serde(rename = "tree")]
    pub tree_addr: String,
    #[serde(rename = "diff")]
    pub diff_addr: String
}

pub async fn push_commit(context: &mut GitHelper, commit_id: &ObjectId, branch: &str) -> Result<(), Box<dyn Error>> {
    let mut buffer: Vec<u8> = Vec::new();
    let commit = context
        .local_repository()
        .objects
        .try_find(commit_id, &mut buffer)?
        .expect("Commit should exists");

    let raw_commit = String::from_utf8(commit.data.to_vec())?;

    let mut commit_iter = commit.try_into_commit_iter().unwrap();
    let tree_id = commit_iter.tree_id()?;
    let parents: Vec<String> = commit_iter.parent_ids().map(|e| e.to_string()).collect();
    let tree_addr = context.calculate_tree_address(tree_id).await?;

    let params = DeployCommitParams {
        repo_name: context.remote.repo.clone(),
        branch_name: branch.to_string(),
        commit_id: commit_id.to_string(),
        raw_commit,
        parents,
        diff_addr: tree_addr.clone(), // will be removed
        tree_addr,
    };
    log::debug!("deployCommit params: {:?}", params);
    Ok(())
}