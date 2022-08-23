#![allow(unused_variables)]
use crate::abi as gosh_abi;
use crate::blockchain::{tvm_hash, GoshContract, TonClient};
use crate::{
    blockchain::{call, snapshot},
    ipfs::IpfsService,
};
use git_hash;
use snapshot::Snapshot;

const PUSH_DIFF_MAX_TRIES: i32 = 3;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Deserialize, Debug)]
struct GetDiffAddrResult {
    #[serde(rename = "value0")]
    pub address: String,
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
    snapshot_addr: String,
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
pub async fn is_diff_deployed(context: &TonClient, contract_address: &str) -> Result<bool> {
    let diff_contract = GoshContract::new(contract_address, gosh_abi::DIFF);
    let result: Result<GetVersionResult> =
        diff_contract.run_local(context, "getVersion", None).await;
    return Ok(result.is_ok());
}

#[instrument(level = "debug", skip(cli))]
pub async fn diff_address(
    cli: &TonClient,
    repo_contract: &mut GoshContract,
    last_commit_id: &git_hash::ObjectId,
    diff_coordinate: &PushDiffCoordinate,
) -> Result<String> {
    let params = serde_json::json!({
        "commitName": last_commit_id.to_string(),
        "index1": diff_coordinate.index_of_parallel_thread,
        "index2": diff_coordinate.order_of_diff_in_the_parallel_thread,
    });
    let result: GetDiffAddrResult = repo_contract
        .run_static(&cli, "getDiffAddr", Some(params))
        .await?;
    return Ok(result.address);
}

pub fn is_going_to_ipfs(diff: &Vec<u8>, new_content: &Vec<u8>) -> bool {
    let mut is_going_to_ipfs = diff.len() > crate::config::IPFS_DIFF_THRESHOLD
        || new_content.len() > crate::config::IPFS_CONTENT_THRESHOLD;
    if !is_going_to_ipfs {
        is_going_to_ipfs =
            content_inspector::ContentType::BINARY == content_inspector::inspect(&new_content);
    }
    return is_going_to_ipfs;
}

#[instrument(level = "debug", skip(cli, diff))]
pub async fn push_diff(
    ipfs_client: &IpfsService,
    cli: &TonClient,
    wallet: &GoshContract,
    mut repo_contract: &mut GoshContract,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    repo_name: &str,
    blob_id: &git_hash::ObjectId,
    file_path: &str,
    diff_coordinate: &PushDiffCoordinate,
    last_commit_id: &git_hash::ObjectId,
    is_last: bool,
    original_snapshot_content: &Vec<u8>,
    diff: &Vec<u8>,
    new_snapshot_content: &Vec<u8>,
) -> Result<tokio::task::JoinHandle<std::result::Result<(), String>>> {
    let snapshot_addr: String =
        (Snapshot::calculate_address(&cli, &mut repo_contract, branch_name, file_path)).await?;

    let original_snapshot_content = original_snapshot_content.clone();
    let diff = diff.clone();
    let new_snapshot_content = new_snapshot_content.clone();
    let ipfs_endpoint = ipfs_client.ipfs_endpoint_address.to_string();
    let commit_id = commit_id.clone();
    let branch_name = branch_name.to_owned();
    let blob_id = blob_id.clone();
    let file_path = file_path.to_owned();
    let diff_coordinate = diff_coordinate.clone();
    let last_commit_id = last_commit_id.clone();

    let wallet = wallet.clone();
    let cli = cli.clone();
    let repo_name = repo_name.to_string();
    return Ok(tokio::spawn(async move {
        let mut attempt = 0;
        let result = loop {
            attempt += 1;
            let result = inner_push_diff(
                &cli,
                &wallet,
                &repo_name,
                &snapshot_addr,
                &ipfs_endpoint,
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
        result.map_err(|e| e.description().to_string())
    }));
}

pub async fn inner_push_diff(
    cli: &TonClient,
    wallet: &GoshContract,
    repo_name: &str,
    snapshot_addr: &str,
    ipfs_endpoint: &str,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    blob_id: &git_hash::ObjectId,
    file_path: &str,
    diff_coordinate: &PushDiffCoordinate,
    last_commit_id: &git_hash::ObjectId,
    is_last: bool,
    original_snapshot_content: &Vec<u8>,
    diff: &Vec<u8>,
    new_snapshot_content: &Vec<u8>,
) -> Result<()> {
    let diff = ton_client::utils::compress_zstd(diff, None)?;
    log::debug!("compressed to {} size", diff.len());

    let ipfs_client = IpfsService::build(ipfs_endpoint)?;
    let (patch, ipfs) = {
        let mut is_going_to_ipfs = is_going_to_ipfs(&diff, new_snapshot_content);
        if !is_going_to_ipfs {
            // Ensure contract can accept this patch
            let data = serde_json::json!({
                "state": hex::encode(original_snapshot_content),
                "diff": hex::encode(&diff)
            });
            let apply_patch_result = wallet
                .run_local::<GetDiffResultResult>(&cli, "getDiffResult", Some(data))
                .await;

            if apply_patch_result.is_ok() {
                if apply_patch_result.unwrap().content.is_none() {
                    is_going_to_ipfs = true;
                }
            } else {
                let apply_patch_result_error = apply_patch_result.unwrap_err();
                let message = apply_patch_result_error.description();
                is_going_to_ipfs = message
                    .contains("Contract execution was terminated with error: invalid opcode");
            }
        }
        if is_going_to_ipfs {
            log::debug!("inner_push_diff->save_data_to_ipfs");
            let ipfs = Some(
                save_data_to_ipfs(&ipfs_client, &new_snapshot_content)
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
            format!("0x{}", tvm_hash(&cli, new_snapshot_content).await?)
        }
    };

    let diff = Diff {
        snapshot_addr: snapshot_addr.to_string(),
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
        repo_name: repo_name.to_string(),
        branch_name: branch_name.to_string(),
        commit_id: last_commit_id.to_string(),
        diffs,
        index1: diff_coordinate.index_of_parallel_thread,
        index2: diff_coordinate.order_of_diff_in_the_parallel_thread,
        last: is_last,
    };

    let params = serde_json::to_value(args)?;
    let result = call(&cli, &wallet, "deployDiff", Some(params)).await?;
    log::debug!("deployDiff result: {:?}", result);

    Ok(())
}

#[instrument(level = "debug", skip(cli, ipfs_client))]
pub async fn push_new_branch_snapshot(
    cli: &TonClient,
    ipfs_client: &IpfsService,
    wallet: &GoshContract,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    repo_addr: &str,
    file_path: &str,
    original_content: &[u8],
) -> Result<()> {
    let content: Vec<u8> = ton_client::utils::compress_zstd(original_content, None)?;
    log::debug!("compressed to {} size", content.len());

    let (content, ipfs) = if content.len() > 15000 {
        log::debug!("push_new_branch_snapshot->save_data_to_ipfs");
        let ipfs = Some(
            save_data_to_ipfs(&ipfs_client, &original_content)
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
        repo_address: repo_addr.to_string(),
        branch_name: branch_name.to_string(),
        commit_id: commit_id.to_string(),
        file_path: file_path.to_string(),
        content,
        ipfs,
    };

    let params = serde_json::to_value(args)?;
    let result = call(&cli, &wallet, "deployNewSnapshot", Some(params)).await?;
    log::debug!("deployNewSnapshot result: {:?}", result);
    Ok(())
}

#[instrument(level = "debug", skip(cli))]
pub async fn push_initial_snapshot(
    cli: &TonClient,
    wallet: &GoshContract,
    branch_name: &str,
    repo_addr: &str,
    file_path: &str,
) -> Result<()> {
    let args = DeploySnapshotParams {
        repo_address: repo_addr.to_owned(),
        branch_name: branch_name.to_string(),
        commit_id: "".to_string(),
        file_path: file_path.to_string(),
        content: "".to_string(),
        ipfs: None,
    };

    let params = serde_json::to_value(args)?;
    let result = call(&cli, &wallet, "deployNewSnapshot", Some(params)).await?;
    log::debug!("deployNewSnapshot result: {:?}", result);
    Ok(())
}
