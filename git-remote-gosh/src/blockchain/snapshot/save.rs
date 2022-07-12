#![allow(unused_variables)]
use crate::{
    blockchain::{call, user_wallet, snapshot},
    git_helper::GitHelper,
    ipfs::{IpfsService},
};
use git_hash;
use git_object::bstr::ByteSlice;

use reqwest::multipart;
use snapshot::Snapshot;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Serialize, Debug)]
struct Diff {
    #[serde(rename = "snap")]
    snapshot_addr: String,
    #[serde(rename = "commit")]
    commit_id: String,
    patch: Option<String>,
    ipfs: Option<String>,
    sha1: String
}
#[derive(Serialize, Debug)]
struct DeployDiffParams {
    #[serde(rename = "repoName")]
    repo_name: String,
    #[serde(rename = "branchName")]
    branch_name: String,
    #[serde(rename = "commitName")]
    commit_id: String,
    diffs: Vec<Diff>,
    index: String,
    last: bool
}

#[derive(Serialize, Debug)]
struct DeploySnapshotParams {
    #[serde(rename = "repo")]
    repo_name: String,
    #[serde(rename = "branch")]
    branch_name: String,
    #[serde(rename = "commit")]
    commit_id: String,
    #[serde(rename = "name")]
    file_path: String,
    #[serde(rename = "snapshotdata")]
    content: String,
    #[serde(rename = "snapshotipfs")]
    ipfs: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SaveRes {
    #[serde(alias = "Hash")]
    hash: String,
}

#[instrument(level = "debug")]
async fn save_data_to_ipfs(ipfs_client: &IpfsService, content: &[u8]) -> Result<String> {
    log::debug!("Uploading blob to IPFS");

    let url = format!(
        "{}/api/v0/add?pin=true&quiet=true",
        ipfs_client.ipfs_endpoint_address,
    );

    let part = multipart::Part::bytes(content.to_vec());
    let form = multipart::Form::new().part("file", part);

    let response = ipfs_client.cli.post(&url).multipart(form).send().await?;
    let response_body = response.json::<SaveRes>().await?;
    Ok(response_body.hash)
}

#[instrument(level = "debug")]
pub async fn push_diff(
    context: &mut GitHelper,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    blob_id: &git_hash::ObjectId,
    file_path: &str,
    diff: &Vec<u8>,
) -> Result<()> {
    let snapshot_addr = Snapshot::calculate_address(
        &context.es_client,
        &context.repo_addr,
        branch_name,
        file_path
    ).await?;

    let ipfs = None;
    if diff.len() > 15000 /* crate::config::defaults::IPFS_THRESHOLD */ {
        // push to ipfs
        todo!();
    }

    let diff = Diff {
        snapshot_addr,
        commit_id: commit_id.to_string(),
        patch: Some(hex::encode(diff)),
        ipfs,
        sha1: blob_id.to_string(),
    };
    let diffs: Vec<Diff> = vec![diff];

    let index = 0;
    let args = DeployDiffParams {
        repo_name: context.remote.repo.clone(),
        branch_name: branch_name.to_string(),
        commit_id: commit_id.to_string(),
        diffs,
        index: format!("0x{index}"),
        last: true
    };

    let wallet = user_wallet(context)?;
    let params = serde_json::to_value(args)?;
    let result = call(&context.es_client, wallet, "deployDiff", Some(params)).await?;
    log::debug!("deployDiff result: {:?}", result);
    Ok(())
}

#[instrument(level = "debug")]
pub async fn push_initial_snapshot(
    context: &mut GitHelper,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    file_path: &str,
    content: &[u8],
) -> Result<()> {
    let mut ipfs = None;
    if content.len() > 15000 {
        ipfs = Some(save_data_to_ipfs(&&context.ipfs_client, content).await?);
    };

    let args = DeploySnapshotParams {
        repo_name: context.remote.repo.clone(),
        branch_name: branch_name.to_string(),
        commit_id: commit_id.to_string(),
        file_path: file_path.to_string(),
        content: String::from_utf8(content.to_vec())?,
        ipfs: Some("".to_string()),
    };

    let wallet = user_wallet(context)?;
    let params = serde_json::to_value(args)?;
    let result = call(&context.es_client, wallet, "deployNewSnapshot", Some(params)).await?;
    log::debug!("deployNewSnapshot result: {:?}", result);
    Ok(())
}
