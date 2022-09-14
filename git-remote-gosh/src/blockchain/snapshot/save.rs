#![allow(unused_variables)]
use crate::abi as gosh_abi;
use crate::blockchain::{tvm_hash, BlockchainContractAddress, GoshContract, TonClient};
use crate::{
    blockchain::{call, snapshot, user_wallet},
    git_helper::GitHelper,
    ipfs::IpfsService,
};
use git_hash;

use snapshot::Snapshot;

const PUSH_DIFF_MAX_TRIES: i32 = 3;
const PUSH_SNAPSHOT_MAX_TRIES: i32 = 3;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Deserialize, Debug)]
struct GetDiffAddrResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetDiffResultResult {
    #[serde(rename = "value0")]
    pub content: Option<Vec<u8>>,
}

#[derive(Deserialize, Debug)]
struct GetVersionResult {
    #[serde(rename = "value0")]
    pub version: String,
}

#[derive(Serialize, Debug)]
struct Diff {
    #[serde(rename = "snap")]
    snapshot_addr: BlockchainContractAddress,
    #[serde(rename = "commit")]
    commit_id: String,
    patch: Option<String>,
    ipfs: Option<String>,
    sha1: String,
    sha256: String,
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
    last: bool,
}

#[derive(Serialize, Debug)]
struct DeploySnapshotParams {
    #[serde(rename = "repo")]
    repo_address: BlockchainContractAddress,
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
#[derive(Debug, Clone)]
pub struct PushDiffCoordinate {
    pub index_of_parallel_thread: u32,
    pub order_of_diff_in_the_parallel_thread: u32,
}

#[instrument(level = "debug")]
async fn save_data_to_ipfs(ipfs_client: &IpfsService, content: &[u8]) -> Result<String> {
    log::debug!("Uploading blob to IPFS");
    let content: Vec<u8> = ton_client::utils::compress_zstd(content, None)?;
    let content = base64::encode(content);
    let content = content.as_bytes().to_vec();

    ipfs_client.save_blob(&content).await
}

#[instrument(level = "debug", skip(context))]
pub async fn is_diff_deployed(
    context: &TonClient,
    contract_address: &BlockchainContractAddress,
) -> Result<bool> {
    let diff_contract = GoshContract::new(contract_address, gosh_abi::DIFF);
    let result: Result<GetVersionResult> =
        diff_contract.run_local(context, "getVersion", None).await;
    Ok(result.is_ok())
}

#[instrument(level = "debug", skip(context))]
pub async fn diff_address(
    context: &mut GitHelper,
    last_commit_id: &git_hash::ObjectId,
    diff_coordinate: &PushDiffCoordinate,
) -> Result<BlockchainContractAddress> {
    let params = serde_json::json!({
        "commitName": last_commit_id.to_string(),
        "index1": diff_coordinate.index_of_parallel_thread,
        "index2": diff_coordinate.order_of_diff_in_the_parallel_thread,
    });
    let result: GetDiffAddrResult = context
        .repo_contract
        .run_static(&context.es_client, "getDiffAddr", Some(params))
        .await?;
    Ok(result.address)
}

pub fn is_going_to_ipfs(diff: &[u8], new_content: &[u8]) -> bool {
    let mut is_going_to_ipfs = diff.len() > crate::config::IPFS_DIFF_THRESHOLD
        || new_content.len() > crate::config::IPFS_CONTENT_THRESHOLD;
    if !is_going_to_ipfs {
        is_going_to_ipfs = std::str::from_utf8(new_content).is_err();
    }
    is_going_to_ipfs
}

#[instrument(level = "debug", skip(diff, new_snapshot_content))]
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
    diff: &[u8],
    new_snapshot_content: &Vec<u8>,
) -> Result<tokio::task::JoinHandle<std::result::Result<(), String>>> {
    let wallet = user_wallet(context).await?;
    let snapshot_addr: BlockchainContractAddress = (Snapshot::calculate_address(
        &context.es_client,
        &mut context.repo_contract,
        branch_name,
        file_path,
    ))
    .await?;

    let original_snapshot_content = original_snapshot_content.clone();
    let diff = diff.to_owned();
    let new_snapshot_content = new_snapshot_content.clone();
    let ipfs_endpoint = context.config.ipfs_http_endpoint().to_string();
    let es_client = context.es_client.clone();
    let repo_name = context.remote.repo.clone();
    let commit_id = *commit_id;
    let branch_name = branch_name.to_owned();
    let blob_id = *blob_id;
    let file_path = file_path.to_owned();
    let diff_coordinate = diff_coordinate.clone();
    let last_commit_id = *last_commit_id;
    Ok(tokio::spawn(async move {
        let mut attempt = 0;
        let result = loop {
            attempt += 1;
            let result = inner_push_diff(
                repo_name.clone(),
                snapshot_addr.clone(),
                wallet.clone(),
                &ipfs_endpoint,
                es_client.clone(),
                &commit_id,
                &branch_name,
                &blob_id,
                &file_path,
                &diff_coordinate,
                &last_commit_id,
                is_last,
                &original_snapshot_content,
                &diff,
                &new_snapshot_content,
            )
            .await;
            if result.is_ok() || attempt > PUSH_DIFF_MAX_TRIES {
                break result;
            } else {
                log::debug!("inner_push_diff error <path: {file_path}, commit: {commit_id}, coord: {:?}>: {:?}", diff_coordinate, result.unwrap_err());
                std::thread::sleep(std::time::Duration::from_secs(5));
            }
        };
        result.map_err(|e| e.to_string())
    }))
}

pub async fn inner_push_diff(
    repo_name: String,
    snapshot_addr: BlockchainContractAddress,
    wallet: GoshContract,
    ipfs_endpoint: &str,
    es_client: TonClient,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    blob_id: &git_hash::ObjectId,
    file_path: &str,
    diff_coordinate: &PushDiffCoordinate,
    last_commit_id: &git_hash::ObjectId,
    is_last: bool,
    original_snapshot_content: &Vec<u8>,
    diff: &[u8],
    new_snapshot_content: &Vec<u8>,
) -> Result<()> {
    let diff = ton_client::utils::compress_zstd(diff, None)?;
    log::debug!("compressed to {} size", diff.len());

    let ipfs_client = IpfsService::new(ipfs_endpoint);
    let (patch, ipfs) = {
        let mut is_going_to_ipfs = is_going_to_ipfs(&diff, new_snapshot_content);
        if !is_going_to_ipfs {
            // Ensure contract can accept this patch
            let data = serde_json::json!({
                "state": hex::encode(original_snapshot_content),
                "diff": hex::encode(&diff)
            });
            let apply_patch_result = wallet
                .run_local::<GetDiffResultResult>(&es_client, "getDiffResult", Some(data))
                .await;

            if apply_patch_result.is_ok() {
                if apply_patch_result.unwrap().content.is_none() {
                    is_going_to_ipfs = true;
                }
            } else {
                let apply_patch_result_error = apply_patch_result.unwrap_err();
                let message = apply_patch_result_error.to_string();
                is_going_to_ipfs = message
                    .contains("Contract execution was terminated with error: invalid opcode");
            }
        }
        if is_going_to_ipfs {
            log::debug!("inner_push_diff->save_data_to_ipfs");
            let ipfs = Some(
                save_data_to_ipfs(&ipfs_client, new_snapshot_content)
                    .await
                    .map_err(|e| {
                        log::debug!("save_data_to_ipfs error: {}", e);
                        e
                    })?,
            );
            (None, ipfs)
        } else {
            (Some(hex::encode(diff)), None)
        }
    };
    let content_sha256 = {
        if ipfs.is_some() {
            format!("0x{}", sha256::digest_bytes(new_snapshot_content))
        } else {
            format!("0x{}", tvm_hash(&es_client, new_snapshot_content).await?)
        }
    };

    let diff = Diff {
        snapshot_addr,
        commit_id: commit_id.to_string(),
        patch,
        ipfs,
        sha1: blob_id.to_string(),
        sha256: content_sha256,
    };

    if diff.ipfs.is_some() {
        log::debug!("push_diff: {:?}", diff);
    } else {
        log::trace!("push_diff: {:?}", diff);
    }
    let diffs: Vec<Diff> = vec![diff];

    let args = DeployDiffParams {
        repo_name,
        branch_name: branch_name.to_string(),
        commit_id: last_commit_id.to_string(),
        diffs,
        index1: diff_coordinate.index_of_parallel_thread,
        index2: diff_coordinate.order_of_diff_in_the_parallel_thread,
        last: is_last,
    };

    let params = serde_json::to_value(args)?;
    let result = call(&es_client, wallet, "deployDiff", Some(params)).await?;
    log::debug!("deployDiff result: {:?}", result);

    Ok(())
}

#[instrument(level = "debug")]
pub async fn push_new_branch_snapshot(
    context: &mut GitHelper,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    file_path: &str,
    original_content: &[u8],
) -> Result<()> {
    let content: Vec<u8> = ton_client::utils::compress_zstd(original_content, None)?;
    log::debug!("compressed to {} size", content.len());

    let (content, ipfs) = if content.len() > 15000 {
        log::debug!("push_new_branch_snapshot->save_data_to_ipfs");
        let ipfs = Some(
            save_data_to_ipfs(&context.ipfs_client, original_content)
                .await
                .map_err(|e| {
                    log::debug!("save_data_to_ipfs error: {}", e);
                    e
                })?,
        );
        ("".to_string(), ipfs)
    } else {
        let content: String = content.iter().map(|e| format!("{:x?}", e)).collect();
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
    let result = call(
        &context.es_client,
        wallet,
        "deployNewSnapshot",
        Some(params),
    )
    .await?;
    log::debug!("deployNewSnapshot result: {:?}", result);
    Ok(())
}

#[instrument(level = "debug", skip(context))]
pub async fn push_initial_snapshot(
    context: &mut GitHelper,
    branch_name: &str,
    file_path: &str,
) -> Result<tokio::task::JoinHandle<std::result::Result<(), String>>> {
    let args = DeploySnapshotParams {
        repo_address: context.repo_addr.clone(),
        branch_name: branch_name.to_string(),
        commit_id: "".to_string(),
        file_path: file_path.to_string(),
        content: "".to_string(),
        ipfs: None,
    };
    let branch_name = branch_name.to_string();
    let file_path = file_path.to_string();
    let wallet = user_wallet(context).await?;
    let params = serde_json::to_value(args)?;
    let es_client = context.es_client.clone();
    Ok(tokio::spawn(async move {
        let mut attempt = 0;
        let result = loop {
            attempt += 1;
            let result = call(
                &es_client,
                wallet.clone(),
                "deployNewSnapshot",
                Some(params.clone()),
            )
            .await
            .map_err(|e| e.to_string())
            .map(|e| ());

            if result.is_ok() || attempt > PUSH_SNAPSHOT_MAX_TRIES {
                break result;
            } else {
                log::debug!("inner_push_snapshot error <branch: {branch_name}, path: {file_path}>");
                std::thread::sleep(std::time::Duration::from_secs(5));
            }
        };
        log::debug!(
            "deployNewSnapshot <branch: {branch_name}, path: {file_path}> result: {:?}",
            result
        );
        result
    }))
}
