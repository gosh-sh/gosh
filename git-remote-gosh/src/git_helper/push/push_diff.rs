use crate::blockchain::user_wallet::UserWallet;
use crate::{
    blockchain::{
        contract::{ContractRead, GoshContract},
        gosh_abi,
        snapshot::{
            save::{Diff, GetDiffAddrResult, GetDiffResultResult, GetVersionResult},
            PushDiffCoordinate,
        },
        tvm_hash, BlockchainContractAddress, BlockchainService, EverClient, Snapshot,
        EMPTY_BLOB_SHA1, EMPTY_BLOB_SHA256,
    },
    config,
    ipfs::{service::FileSave, IpfsService},
};
use tokio_retry::Retry;
use ton_client::utils::compress_zstd;

use super::utilities::retry::default_retry_strategy;

const PUSH_DIFF_MAX_TRIES: i32 = 3;
const PUSH_SNAPSHOT_MAX_TRIES: i32 = 3;

#[instrument(
    level = "debug",
    skip(blockchain, diff, original_snapshot_content, new_snapshot_content)
)]
pub async fn push_diff<'a, B>(
    blockchain: &B,
    repo_name: &str,
    dao_address: &BlockchainContractAddress,
    remote_network: &str,
    ipfs_endpoint: &str,
    commit_id: &'a git_hash::ObjectId,
    branch_name: &'a str,
    blob_id: &'a git_hash::ObjectId,
    file_path: &'a str,
    diff_coordinate: &'a PushDiffCoordinate,
    last_commit_id: &'a git_hash::ObjectId,
    is_last: bool,
    original_snapshot_content: &'a Vec<u8>,
    diff: &'a [u8],
    new_snapshot_content: &'a Vec<u8>,
) -> anyhow::Result<()>
where
    B: BlockchainService,
{
    let wallet = blockchain.user_wallet(dao_address, remote_network).await?;
    let mut repo_contract = blockchain.repo_contract().clone();
    let snapshot_addr: BlockchainContractAddress = (Snapshot::calculate_address(
        &blockchain.client(),
        &mut repo_contract,
        branch_name,
        file_path,
    ))
    .await?;

    let blockchain = blockchain.clone();
    let original_snapshot_content = original_snapshot_content.clone();
    let diff = diff.to_owned();
    let new_snapshot_content = new_snapshot_content.clone();
    let commit_id = *commit_id;
    let branch_name = branch_name.to_owned();
    let blob_id = *blob_id;
    let file_path = file_path.to_owned();
    let diff_coordinate = diff_coordinate.clone();
    let last_commit_id = *last_commit_id;

    Retry::spawn(default_retry_strategy(), || async {
        inner_push_diff(
            &blockchain,
            repo_name.to_string(),
            snapshot_addr.clone(),
            wallet.clone(),
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
        .await
        .map_err(|e| {
            tracing::warn!("Attempt failed with {:#?}", e);
            e
        })
    })
    .await?;
    Ok(())
}

#[instrument(
    level = "debug",
    skip(
        blockchain,
        original_snapshot_content,
        diff,
        new_snapshot_content,
        wallet
    )
)]
pub async fn inner_push_diff(
    blockchain: &impl BlockchainService,
    repo_name: String,
    snapshot_addr: BlockchainContractAddress,
    wallet: UserWallet,
    ipfs_endpoint: &str,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    blob_id: &git_hash::ObjectId,
    file_path: &str,
    diff_coordinate: &PushDiffCoordinate,
    last_commit_id: &git_hash::ObjectId,
    is_last: bool,
    // TODO: why not just &[u8]
    original_snapshot_content: &Vec<u8>,
    diff: &[u8],
    new_snapshot_content: &Vec<u8>,
) -> anyhow::Result<()> {
    let diff = compress_zstd(diff, None)?;
    tracing::debug!("compressed to {} size", diff.len());

    let ipfs_client = IpfsService::new(ipfs_endpoint);
    let (patch, ipfs) = {
        let mut is_going_to_ipfs = is_going_to_ipfs(&diff, new_snapshot_content);
        if !is_going_to_ipfs {
            // Ensure contract can accept this patch
            let original_snapshot_content = compress_zstd(original_snapshot_content, None)?;
            let data = serde_json::json!({
                "state": hex::encode(original_snapshot_content),
                "diff": hex::encode(&diff)
            });
            let get_diff_result = {
                let wallet_contract = wallet.take_one().await?;
                wallet_contract
                    .read_state::<GetDiffResultResult>(
                        &blockchain.client(),
                        "getDiffResult",
                        Some(data),
                    )
                    .await
            };
            match get_diff_result {
                Ok(apply_patch_result) => {
                    if apply_patch_result.hex_encoded_compressed_content.is_none() {
                        is_going_to_ipfs = true;
                    }
                }
                Err(apply_patch_result_error) => {
                    is_going_to_ipfs = apply_patch_result_error
                        .to_string()
                        .contains("Contract execution was terminated with error: invalid opcode");
                }
            }
        }
        if is_going_to_ipfs {
            tracing::debug!("inner_push_diff->save_data_to_ipfs");
            let ipfs = Some(
                save_data_to_ipfs(&ipfs_client, new_snapshot_content)
                    .await
                    .map_err(|e| {
                        tracing::debug!("save_data_to_ipfs error: {:#?}", e);
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
            format!("0x{}", sha256::digest(&**new_snapshot_content))
        } else {
            format!(
                "0x{}",
                tvm_hash(&blockchain.client(), new_snapshot_content).await?
            )
        }
    };

    let diff = Diff {
        snapshot_addr,
        commit_id: commit_id.to_string(),
        patch,
        ipfs,
        sha1: if &content_sha256 == EMPTY_BLOB_SHA256 {
            EMPTY_BLOB_SHA1.to_owned()
        } else {
            blob_id.to_string()
        },
        sha256: content_sha256,
    };

    if diff.ipfs.is_some() {
        tracing::debug!("push_diff: {:?}", diff);
    } else {
        tracing::trace!("push_diff: {:?}", diff);
    }

    blockchain
        .deploy_diff(
            &wallet,
            repo_name,
            branch_name.to_string(),
            last_commit_id.to_string(),
            diff,
            diff_coordinate.index_of_parallel_thread,
            diff_coordinate.order_of_diff_in_the_parallel_thread,
            is_last,
        )
        .await?;

    Ok(())
}

pub fn is_going_to_ipfs(diff: &[u8], new_content: &[u8]) -> bool {
    let mut is_going_to_ipfs = diff.len() > crate::config::IPFS_DIFF_THRESHOLD
        || new_content.len() > crate::config::IPFS_CONTENT_THRESHOLD;
    if !is_going_to_ipfs {
        is_going_to_ipfs = std::str::from_utf8(new_content).is_err();
    }
    is_going_to_ipfs
}

#[instrument(level = "debug", skip(ipfs_client, content))]
async fn save_data_to_ipfs(ipfs_client: &IpfsService, content: &[u8]) -> anyhow::Result<String> {
    tracing::debug!("Uploading blob to IPFS");
    let content: Vec<u8> = ton_client::utils::compress_zstd(content, None)?;
    let content = base64::encode(&content);
    let content = content.as_bytes().to_vec();

    ipfs_client.save_blob(&content).await
}

#[instrument(level = "debug", skip(context))]
pub async fn is_diff_deployed(
    context: &EverClient,
    contract_address: &BlockchainContractAddress,
) -> anyhow::Result<bool> {
    let diff_contract = GoshContract::new(contract_address, gosh_abi::DIFF);
    let result: anyhow::Result<GetVersionResult> =
        diff_contract.read_state(context, "getVersion", None).await;
    Ok(result.is_ok())
}

#[instrument(level = "debug", skip(context))]
pub async fn diff_address(
    context: &EverClient,
    repo_contract: &mut GoshContract,
    last_commit_id: &git_hash::ObjectId,
    diff_coordinate: &PushDiffCoordinate,
) -> anyhow::Result<BlockchainContractAddress> {
    let params = serde_json::json!({
        "commitName": last_commit_id.to_string(),
        "index1": diff_coordinate.index_of_parallel_thread,
        "index2": diff_coordinate.order_of_diff_in_the_parallel_thread,
    });
    let result: GetDiffAddrResult = repo_contract
        .run_static(&context, "getDiffAddr", Some(params))
        .await?;
    Ok(result.address)
}

#[instrument(level = "debug", skip(blockchain, file_provider, original_content))]
pub async fn push_new_branch_snapshot(
    blockchain: &impl BlockchainService,
    file_provider: &IpfsService,
    remote_network: &str,
    dao_addr: &BlockchainContractAddress,
    repo_addr: &BlockchainContractAddress,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    file_path: &str,
    original_content: &[u8],
) -> anyhow::Result<()> {
    let content: Vec<u8> = ton_client::utils::compress_zstd(original_content, None)?;
    tracing::debug!("compressed to {} size", content.len());

    let (content, ipfs) = if content.len() > config::IPFS_CONTENT_THRESHOLD {
        tracing::debug!("push_new_branch_snapshot->save_data_to_ipfs");
        let ipfs = Some(
            save_data_to_ipfs(&file_provider, original_content)
                .await
                .map_err(|e| {
                    tracing::debug!("save_data_to_ipfs error: {}", e);
                    e
                })?,
        );
        ("".to_string(), ipfs)
    } else {
        let content: String = content.iter().map(|e| format!("{:x?}", e)).collect();
        (content, None)
    };

    let wallet = blockchain.user_wallet(&dao_addr, &remote_network).await?;

    blockchain
        .deploy_new_snapshot(
            &wallet,
            repo_addr.to_owned(),
            branch_name.to_string(),
            commit_id.to_string(),
            file_path.to_string(),
            content,
        )
        .await?;

    // tracing::debug!("deployNewSnapshot result: {:?}", result);
    Ok(())
}

#[instrument(level = "debug", skip(blockchain))]
pub async fn push_initial_snapshot<B>(
    blockchain: B,
    repo_addr: BlockchainContractAddress,
    dao_addr: BlockchainContractAddress,
    remote_network: String,
    branch_name: String,
    file_path: String,
) -> anyhow::Result<()>
where
    B: BlockchainService,
{
    let wallet = blockchain.user_wallet(&dao_addr, &remote_network).await?;
    Retry::spawn(default_retry_strategy(), || async {
        blockchain
            .deploy_new_snapshot(
                &wallet,
                repo_addr.clone(),
                branch_name.clone(),
                "".to_string(),
                file_path.clone(),
                "".to_string(),
            )
            .await
            .map_err(|e| {
                tracing::debug!(
                    "inner_push_snapshot error <branch: {branch_name}, path: {file_path}>"
                );
                e
            })
    })
    .await
}
