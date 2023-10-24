use crate::blockchain::user_wallet::{UserWallet, WalletError};
use crate::ipfs::{build_ipfs, IpfsError};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;

use crate::database::GoshDB;
use crate::{
    blockchain::{
        contract::{ContractRead, GoshContract},
        gosh_abi,
        snapshot::{
            save::{Diff, GetDiffAddrResult, GetVersionResult},
            PushDiffCoordinate,
        },
        tvm_hash, BlockchainContractAddress, BlockchainService, EverClient, EMPTY_BLOB_SHA1,
        EMPTY_BLOB_SHA256,
    },
    ipfs::{service::FileSave, IpfsService},
};
use tokio_retry::RetryIf;
use ton_client::utils::compress_zstd;

use super::is_going_to_ipfs;
use super::utilities::retry::default_retry_strategy;

// const PUSH_DIFF_MAX_TRIES: i32 = 3;
// const PUSH_SNAPSHOT_MAX_TRIES: i32 = 3;

const WAIT_FOR_DELETE_SNAPSHOT_TRIES: i32 = 20;

enum BlobDst {
    Ipfs(String),
    Patch(String),
    SetContent(String),
}

#[instrument(level = "info", skip_all)]
pub async fn push_diff<'a, B>(
    blockchain: &B,
    repo_name: &str,
    dao_address: &BlockchainContractAddress,
    remote_network: &str,
    ipfs_endpoint: &str,
    last_commit_id: &'a git_hash::ObjectId,
    diff_address: String,
    database: Arc<GoshDB>,
) -> anyhow::Result<()>
where
    B: BlockchainService,
{
    tracing::trace!("push_diff: {diff_address}");
    let wallet = blockchain.user_wallet(dao_address, remote_network).await?;

    let blockchain = blockchain.clone();
    let last_commit_id = *last_commit_id;

    let condition = |e: &anyhow::Error| {
        if e.is::<WalletError>() || e.is::<IpfsError>() {
            false
        } else {
            tracing::warn!("Attempt failed with {:#?}", e);
            true
        }
    };

    RetryIf::spawn(
        default_retry_strategy(),
        || async {
            inner_push_diff(
                &blockchain,
                repo_name.to_string(),
                wallet.clone(),
                &ipfs_endpoint,
                &last_commit_id,
                &diff_address,
                database.clone(),
            )
            .await
        },
        condition,
    )
    .await?;
    Ok(())
}

#[instrument(level = "info", skip_all)]
pub async fn inner_push_diff(
    blockchain: &impl BlockchainService,
    repo_name: String,
    wallet: UserWallet,
    ipfs_endpoint: &str,
    last_commit_id: &git_hash::ObjectId,
    diff_address: &str,
    database: Arc<GoshDB>,
) -> anyhow::Result<()> {
    let (parallel_diff, diff_coordinate, is_last) = database.get_diff(diff_address)?;

    let commit_id = parallel_diff.commit_id.to_string();
    let branch_name = parallel_diff.branch_name;
    let blob_id = parallel_diff.blob_id;
    let file_path = parallel_diff.file_path;
    let original_snapshot_content = &parallel_diff.original_snapshot_content;
    let diff = &parallel_diff.diff;
    let new_snapshot_content = &parallel_diff.new_snapshot_content;
    let snapshot_addr: BlockchainContractAddress =
        BlockchainContractAddress::new(&parallel_diff.snapshot_address);

    tracing::trace!("inner_push_diff: snapshot_addr={snapshot_addr}, commit_id={commit_id}, branch_name={branch_name}, blob_id={blob_id}, file_path={file_path}, diff_coordinate={diff_coordinate:?}, last_commit_id={last_commit_id}, is_last={is_last}");
    let diff = compress_zstd(diff, None)?;
    tracing::trace!("compressed to {} size", diff.len());

    let ipfs_client = build_ipfs(ipfs_endpoint)?;
    let is_previous_oversized = is_going_to_ipfs(original_snapshot_content);
    let blob_dst = {
        let is_going_to_ipfs = is_going_to_ipfs(new_snapshot_content);
        if !is_going_to_ipfs {
            if is_previous_oversized {
                let compressed = compress_zstd(new_snapshot_content, None)?;
                BlobDst::SetContent(hex::encode(compressed))
            } else {
                BlobDst::Patch(hex::encode(diff))
            }
        } else {
            tracing::debug!("inner_push_diff->save_data_to_ipfs");
            let ipfs = save_data_to_ipfs(&ipfs_client, new_snapshot_content)
                .await
                .map_err(|e| {
                    tracing::debug!("save_data_to_ipfs error: {:#?}", e);
                    e
                })?;
            BlobDst::Ipfs(ipfs)
        }
    };
    let content_sha256 = {
        if let BlobDst::Ipfs(_) = blob_dst {
            format!("0x{}", sha256::digest(&**new_snapshot_content))
        } else {
            format!(
                "0x{}",
                tvm_hash(&blockchain.client(), new_snapshot_content).await?
            )
        }
    };

    let sha1 = if &content_sha256 == EMPTY_BLOB_SHA256 {
        EMPTY_BLOB_SHA1.to_owned()
    } else {
        blob_id.to_string()
    };

    let diff = match blob_dst {
        BlobDst::Ipfs(ipfs) => {
            let patch = if is_previous_oversized {
                None
            } else {
                let compressed = compress_zstd(original_snapshot_content, None)?;
                Some(hex::encode(compressed))
            };
            Diff {
                snapshot_addr,
                snapshot_file_path: file_path, // TODO: change to full path
                commit_id,
                patch,
                ipfs: Some(ipfs),
                remove_ipfs: false,
                sha1,
                sha256: content_sha256,
            }
        }
        BlobDst::Patch(patch) => Diff {
            snapshot_addr,
            snapshot_file_path: file_path, // TODO: change to full path
            commit_id,
            patch: Some(patch),
            ipfs: None,
            remove_ipfs: false,
            sha1,
            sha256: content_sha256,
        },
        BlobDst::SetContent(content) => Diff {
            snapshot_addr,
            snapshot_file_path: file_path, // TODO: change to full path
            commit_id,
            patch: Some(content),
            ipfs: None,
            remove_ipfs: true,
            sha1,
            sha256: content_sha256,
        },
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

#[instrument(level = "info", skip_all)]
pub async fn prepush_diff<B>(
    blockchain: &B,
    repo_name: &str,
    wallet: &UserWallet,
    ipfs_endpoint: &str,
    last_commit_id: &git_hash::ObjectId,
    diff_address: &str,
    database: Arc<GoshDB>,
    expire: u32,
) -> anyhow::Result<String>
where
    B: BlockchainService,
{
    let (parallel_diff, diff_coordinate, is_last) = database.get_diff(diff_address)?;

    let commit_id = parallel_diff.commit_id.to_string();
    let branch_name = parallel_diff.branch_name;
    let blob_id = parallel_diff.blob_id;
    let file_path = parallel_diff.file_path;
    let original_snapshot_content = &parallel_diff.original_snapshot_content;
    let diff = &parallel_diff.diff;
    let new_snapshot_content = &parallel_diff.new_snapshot_content;
    let snapshot_addr: BlockchainContractAddress =
        BlockchainContractAddress::new(&parallel_diff.snapshot_address);

    tracing::trace!("prepush_diff: snapshot_addr={snapshot_addr}, commit_id={commit_id}, branch_name={branch_name}, blob_id={blob_id}, file_path={file_path}, diff_coordinate={diff_coordinate:?}, last_commit_id={last_commit_id}, is_last={is_last}");
    let diff = compress_zstd(diff, None)?;
    tracing::trace!("prepush_diff: compressed to {} size", diff.len());

    let ipfs_client = build_ipfs(ipfs_endpoint)?;
    let is_previous_oversized = is_going_to_ipfs(original_snapshot_content);
    let blob_dst = {
        let is_going_to_ipfs = is_going_to_ipfs(new_snapshot_content);
        if !is_going_to_ipfs {
            if is_previous_oversized {
                let compressed = compress_zstd(new_snapshot_content, None)?;
                BlobDst::SetContent(hex::encode(compressed))
            } else {
                BlobDst::Patch(hex::encode(diff))
            }
        } else {
            tracing::debug!("prepush_diff->save_data_to_ipfs");
            let ipfs = save_data_to_ipfs(&ipfs_client, new_snapshot_content)
                .await
                .map_err(|e| {
                    tracing::debug!("save_data_to_ipfs error: {:#?}", e);
                    e
                })?;
            BlobDst::Ipfs(ipfs)
        }
    };
    let content_sha256 = {
        if let BlobDst::Ipfs(_) = blob_dst {
            format!("0x{}", sha256::digest(&**new_snapshot_content))
        } else {
            format!(
                "0x{}",
                tvm_hash(&blockchain.client(), new_snapshot_content).await?
            )
        }
    };

    let sha1 = if &content_sha256 == EMPTY_BLOB_SHA256 {
        EMPTY_BLOB_SHA1.to_owned()
    } else {
        blob_id.to_string()
    };

    let diff = match blob_dst {
        BlobDst::Ipfs(ipfs) => {
            let patch = if is_previous_oversized {
                None
            } else {
                let compressed = compress_zstd(original_snapshot_content, None)?;
                Some(hex::encode(compressed))
            };
            Diff {
                snapshot_addr,
                snapshot_file_path: file_path, // TODO: change to full path
                commit_id,
                patch,
                ipfs: Some(ipfs),
                remove_ipfs: false,
                sha1,
                sha256: content_sha256,
            }
        }
        BlobDst::Patch(patch) => Diff {
            snapshot_addr,
            snapshot_file_path: file_path, // TODO: change to full path
            commit_id,
            patch: Some(patch),
            ipfs: None,
            remove_ipfs: false,
            sha1,
            sha256: content_sha256,
        },
        BlobDst::SetContent(content) => Diff {
            snapshot_addr,
            snapshot_file_path: file_path, // TODO: change to full path
            commit_id,
            patch: Some(content),
            ipfs: None,
            remove_ipfs: true,
            sha1,
            sha256: content_sha256,
        },
    };

    if diff.ipfs.is_some() {
        tracing::debug!("prepush_diff: {:?}", diff);
    } else {
        tracing::trace!("prepush_diff: {:?}", diff);
    }

    let boc = blockchain
        .construct_deploy_diff_message(
            &wallet,
            repo_name.to_owned(),
            branch_name.to_string(),
            last_commit_id.to_string(),
            diff,
            diff_coordinate.index_of_parallel_thread,
            diff_coordinate.order_of_diff_in_the_parallel_thread,
            is_last,
            expire,
        )
        .await?;

    Ok(boc)
}

#[instrument(level = "info", skip_all)]
pub async fn save_data_to_ipfs(
    ipfs_client: &IpfsService,
    content: &[u8],
) -> anyhow::Result<String> {
    tracing::trace!("Uploading blob to IPFS");
    let content: Vec<u8> = ton_client::utils::compress_zstd(content, None)?;
    let content = base64::encode(&content);
    let content = content.as_bytes().to_vec();

    ipfs_client.save_blob(&content).await
}

#[instrument(level = "info", skip_all)]
pub async fn is_diff_deployed(
    context: &EverClient,
    contract_address: &BlockchainContractAddress,
) -> anyhow::Result<bool> {
    tracing::trace!("is_diff_deployed: contract_address={contract_address}");
    let diff_contract = GoshContract::new(contract_address, gosh_abi::DIFF);
    let result: anyhow::Result<GetVersionResult> =
        diff_contract.read_state(context, "getVersion", None).await;
    tracing::trace!("is_diff_deployed result: {:?}", result);
    Ok(result.is_ok())
}

#[instrument(level = "info", skip_all)]
pub async fn diff_address(
    context: &EverClient,
    repo_contract: &mut GoshContract,
    last_commit_id: &git_hash::ObjectId,
    diff_coordinate: &PushDiffCoordinate,
) -> anyhow::Result<BlockchainContractAddress> {
    tracing::trace!("diff_address: repo_contract.address={}, last_commit_id={last_commit_id}, diff_coordinate={diff_coordinate:?}", repo_contract.address);
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

#[instrument(level = "info", skip_all)]
pub async fn push_new_branch_snapshot(
    blockchain: &impl BlockchainService,
    file_provider: &IpfsService,
    remote_network: &str,
    dao_addr: &BlockchainContractAddress,
    repo_addr: &BlockchainContractAddress,
    expected_addr: &BlockchainContractAddress,
    commit_id: &git_hash::ObjectId,
    branch_name: &str,
    file_path: &str,
    original_content: &[u8],
) -> anyhow::Result<()> {
    tracing::trace!("push_new_branch_snapshot: remote_network={remote_network}, dao_addr={dao_addr}, repo_addr={repo_addr}, commit_id={commit_id}, branch_name={branch_name}, file_path={file_path}");
    let wallet = blockchain.user_wallet(&dao_addr, &remote_network).await?;

    let snapshot_contract = GoshContract::new(expected_addr, gosh_abi::SNAPSHOT);
    if snapshot_contract.is_active(blockchain.client()).await? {
        tracing::debug!("push_new_branch_snapshot: deleting snapshot: branch_name={branch_name}, file_path={file_path}");
        blockchain
            .delete_snapshot(&wallet, expected_addr.clone())
            .await?;

        let mut attempt = 0;
        tracing::trace!("wait for snapshot to be not active: {expected_addr}");
        loop {
            attempt += 1;
            if attempt == WAIT_FOR_DELETE_SNAPSHOT_TRIES {
                anyhow::bail!("Failed to delete snapshot: {expected_addr}");
            }
            if !snapshot_contract.is_active(blockchain.client()).await? {
                tracing::trace!("Snapshot is deleted: {expected_addr}");
                break;
            }
            sleep(Duration::from_secs(5)).await;
        }
    }

    let (content, ipfs) = if is_going_to_ipfs(original_content) {
        tracing::trace!("push_new_branch_snapshot->save_data_to_ipfs");
        let ipfs = Some(
            save_data_to_ipfs(&file_provider, original_content)
                .await
                .map_err(|e| {
                    tracing::trace!("save_data_to_ipfs error: {}", e);
                    e
                })?,
        );
        ("".to_string(), ipfs)
    } else {
        let compressed: Vec<u8> = compress_zstd(original_content, None)?;
        tracing::trace!("compressed to {} size", compressed.len());
        (hex::encode(compressed), None)
    };

    blockchain
        .deploy_new_snapshot(
            &wallet,
            repo_addr.to_owned(),
            commit_id.to_string(),
            file_path.to_string(),
            content,
            ipfs,
        )
        .await?;

    // tracing::trace!("deployNewSnapshot result: {:?}", result);
    Ok(())
}

#[instrument(level = "info", skip_all)]
pub async fn push_initial_snapshot<B>(
    blockchain: B,
    repo_addr: BlockchainContractAddress,
    dao_addr: BlockchainContractAddress,
    remote_network: String,
    snapshot_address: String,
    database: Arc<GoshDB>,
) -> anyhow::Result<()>
where
    B: BlockchainService + 'static,
{
    let snapshot = database.get_snapshot(&snapshot_address)?;

    let file_path = snapshot.file_path;
    let upgrade = snapshot.upgrade;
    let commit_id = snapshot.commit_id;
    let content = snapshot.content;
    let ipfs = snapshot.ipfs;

    tracing::trace!("push_initial_snapshot: snapshot_address={snapshot_address}, repo_addr={repo_addr}, dao_addr={dao_addr}, remote_network={remote_network}, file_path={file_path}");
    let wallet = blockchain.user_wallet(&dao_addr, &remote_network).await?;

    let condition = |e: &anyhow::Error| {
        if e.is::<WalletError>() {
            false
        } else {
            tracing::debug!("inner_push_snapshot error <path: {file_path}>");
            true
        }
    };

    RetryIf::spawn(
        default_retry_strategy(),
        || async {
            blockchain
                .deploy_new_snapshot(
                    &wallet,
                    repo_addr.clone(),
                    commit_id.clone(),
                    file_path.clone(),
                    content.clone(),
                    ipfs.clone(),
                )
                .await
        },
        condition,
    )
    .await
}
