#![allow(unused_variables)]
use crate::{
    blockchain::{call, user_wallet, snapshot},
    git_helper::GitHelper,
    ipfs::{IpfsService},
};
use git_hash;
use reqwest::multipart;
use snapshot::Snapshot;
use crate::abi as gosh_abi;
use crate::blockchain::{
    GoshContract,
    TonClient
};


type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Deserialize, Debug)]
struct GetDiffAddrResult {
    #[serde(rename = "value0")]
    pub address: String,
}

#[derive(Deserialize, Debug)]
struct GetDiffResultResult {
    #[serde(rename = "value0")]
    pub content: Option<Vec<u8>>
}

#[derive(Deserialize, Debug)]
struct GetVersionResult {
    #[serde(rename = "value0")]
    pub version: String,
}

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
    index1: u32,
    index2: u32,
    last: bool
}

#[derive(Serialize, Debug)]
struct DeploySnapshotParams {
    #[serde(rename = "repo")]
    repo_address: String,
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

// Note: making fields verbose
// It must be very clear what is going on
#[derive(Debug)]
pub struct PushDiffCoordinate {
    pub index_of_parallel_thread: u32,
    pub order_of_diff_in_the_parallel_thread: u32,
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

#[instrument(level = "debug", skip(context))]
pub async fn is_diff_deployed(
    context: &TonClient,
    contract_address: &str
) -> Result<bool> {
    let diff_contract = GoshContract::new(
        contract_address,
        gosh_abi::DIFF
    );
    let result: Result<GetVersionResult> = diff_contract.run_local(
        context,
        "getVersion",
        None
    ).await;
    return Ok(result.is_ok())
}

#[instrument(level = "debug", skip(context))]
pub async fn diff_address(
    context: &mut GitHelper,
    last_commit_id: &git_hash::ObjectId,
    diff_coordinate: &PushDiffCoordinate
) -> Result<String> {
    let wallet = user_wallet(context).await?;
    let params = serde_json::json!({
        "reponame": context.remote.repo.clone(),
        "commitName": last_commit_id.to_string(),
        "index1": diff_coordinate.index_of_parallel_thread,
        "index2": diff_coordinate.order_of_diff_in_the_parallel_thread,
    });
    let result: GetDiffAddrResult = wallet.run_local(
        &context.es_client, 
        "getDiffAddr", 
        Some(params)
    ).await?;
    return Ok(result.address);
}

#[instrument(level = "debug", skip(diff))]
pub async fn push_diff(
    context: &mut GitHelper,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    blob_id: &git_hash::ObjectId,
    file_path: &str,
    diff_coordinate: &PushDiffCoordinate,
    last_commit_id: &git_hash::ObjectId,
    is_last: bool,
    original_snapshot_content: &Vec<u8>,
    diff: &Vec<u8>,
) -> Result<()> {
    let wallet = user_wallet(context).await?;
    let snapshot_addr = Snapshot::calculate_address(
        &context.es_client,
        &context.repo_addr,
        branch_name,
        file_path
    ).await?;

    let diff = ton_client::utils::compress_zstd(diff, None)?;
    log::debug!("compressed to {} size", diff.len());

    let (patch, ipfs) = {
        let mut is_going_to_ipfs = diff.len() > crate::config::IPFS_THRESHOLD;
        if !is_going_to_ipfs {
            // Ensure contract can accept this patch
            let data = serde_json::json!({
                "state": hex::encode(original_snapshot_content), 
                "diff": hex::encode(&diff)
            });
            let apply_patch_result = wallet.run_local::<GetDiffResultResult>(
                &context.es_client, 
                "getDiffResult", 
                Some(data)
            ).await;
            
            if apply_patch_result.is_ok() {
                if apply_patch_result.unwrap().content.is_none() {
                    is_going_to_ipfs = true;
                }
            } else {
                let apply_patch_result_error = apply_patch_result.unwrap_err();
                let message = apply_patch_result_error.description();
                is_going_to_ipfs = message.contains("Contract execution was terminated with error: invalid opcode");
            }
        }
        if is_going_to_ipfs { 
            let ipfs = Some(save_data_to_ipfs(&&context.ipfs_client, &diff).await?);
            (None, ipfs)
        } else {
            (Some(hex::encode(diff)), None)
        }
    };

    let diff = Diff {
        snapshot_addr,
        commit_id: commit_id.to_string(),
        patch,
        ipfs,
        sha1: blob_id.to_string(),
    };

    log::trace!("push_diff: {:?}", diff);
    let diffs: Vec<Diff> = vec![diff];

    let args = DeployDiffParams {
        repo_name: context.remote.repo.clone(),
        branch_name: branch_name.to_string(),
        commit_id: last_commit_id.to_string(),
        diffs,
        index1: diff_coordinate.index_of_parallel_thread,
        index2: diff_coordinate.order_of_diff_in_the_parallel_thread,
        last: is_last
    };

    let params = serde_json::to_value(args)?;
    let result = call(&context.es_client, wallet, "deployDiff", Some(params)).await?;
    log::debug!("deployDiff result: {:?}", result);

    Ok(())
}

#[instrument(level = "debug")]
pub async fn push_new_branch_snapshot(
    context: &mut GitHelper,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    file_path: &str,
    content: &[u8],
) -> Result<()> {
    let content: Vec<u8> = ton_client::utils::compress_zstd(content, None)?;
    log::debug!("compressed to {} size", content.len());

    let (content, ipfs) = if content.len() > 15000 {
        let ipfs = Some(save_data_to_ipfs(&&context.ipfs_client, &content).await?);
        ("".to_string(), ipfs)
    } else {
        let content: String = content.iter()
            .map(|e| format!("{:x?}", e))
            .collect();
        (content, None)
    };


    let args = DeploySnapshotParams {
        repo_address: context.repo_addr.clone(),
        branch_name: branch_name.to_string(),
        commit_id: commit_id.to_string(),
        file_path: file_path.to_string(),
        content,
        ipfs,
    };

    let wallet = user_wallet(context).await?;
    let params = serde_json::to_value(args)?;
    let result = call(&context.es_client, wallet, "deployNewSnapshot", Some(params)).await?;
    log::debug!("deployNewSnapshot result: {:?}", result);
    Ok(())
}

#[instrument(level = "debug")]
pub async fn push_initial_snapshot(
    context: &mut GitHelper,
    branch_name: &str,
    file_path: &str,
) -> Result<()> {
    let args = DeploySnapshotParams {
        repo_address: context.repo_addr.clone(),
        branch_name: branch_name.to_string(),
        commit_id: "".to_string(),
        file_path: file_path.to_string(),
        content: "".to_string(),
        ipfs: None,
    };

    let wallet = user_wallet(context).await?;
    let params = serde_json::to_value(args)?;
    let result = call(&context.es_client, wallet, "deployNewSnapshot", Some(params)).await?;
    log::debug!("deployNewSnapshot result: {:?}", result);
    Ok(())
}
