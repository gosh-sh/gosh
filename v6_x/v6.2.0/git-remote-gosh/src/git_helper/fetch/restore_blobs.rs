use super::GitHelper;

use crate::blockchain::{gosh_abi, ZERO_SHA};
use crate::ipfs::build_ipfs;
use crate::{
    blockchain::{
        self, snapshot::diffs::DiffMessage, BlockchainContractAddress, BlockchainService,
    },
    git_helper::{EverClient, GoshContract},
    ipfs::service::FileLoad,
};
use futures::{stream::FuturesUnordered, StreamExt};
use git_hash::ObjectId;
use git_odb::{FindExt, Write};
use git_repository::OdbHandle;
use lru::LruCache;
use std::{
    collections::{HashMap, HashSet},
    num::NonZeroUsize,
    str::FromStr,
    sync::Arc,
    vec::Vec,
};
use tokio::sync::Mutex;
use tracing::Instrument;

const FETCH_MAX_TRIES: i32 = 3;

pub struct BlobsRebuildingPlan {
    snapshot_address_to_blob_sha: HashMap<BlockchainContractAddress, HashSet<ObjectId>>,
}

#[instrument(level = "info", skip_all)]
async fn load_data_from_ipfs(
    ipfs_client: &impl FileLoad,
    ipfs_address: &str,
) -> anyhow::Result<Vec<u8>> {
    tracing::trace!("load_data_from_ipfs: ipfs_address={ipfs_address}");
    let ipfs_data = ipfs_client.load(ipfs_address).await?;
    let compressed_data = base64::decode(&ipfs_data)?;
    let data = ton_client::utils::decompress_zstd(&compressed_data)?;

    Ok(data)
}

#[instrument(level = "debug", skip(odb))]
fn load_data_from_local(odb: &OdbHandle, blob_id: &ObjectId) -> anyhow::Result<Vec<u8>> {
    tracing::trace!("load_data_from_local: blob_id={blob_id}");
    let mut blob_buffer: Vec<u8> = Vec::new();
    let data = odb.find_blob(blob_id, &mut blob_buffer)?.data.to_vec();

    Ok(data)
}

async fn write_git_data<'a>(
    repo: &mut git_repository::Repository,
    obj: git_object::Data<'a>,
) -> anyhow::Result<git_hash::ObjectId> {
    tracing::info!("Writing git data: {} -> size: {}", obj.kind, obj.data.len());
    let store = &mut repo.objects;
    // It should refresh once even if the refresh mode is never, just to initialize the index
    //store.refresh_never();
    let object_id = store.write_buf(obj.kind, obj.data)?;
    tracing::info!("Writing git data - success");
    Ok(object_id)
}

#[instrument(level = "info", skip_all)]
async fn write_git_object(
    repo: &mut git_repository::Repository,
    obj: impl git_object::WriteTo,
) -> anyhow::Result<git_hash::ObjectId> {
    tracing::info!("Writing git object");
    tracing::trace!("write_git_object: repo={repo:?}");
    let store = &mut repo.objects;
    // It should refresh once even if the refresh mode is never, just to initialize the index
    //store.refresh_never();
    let object_id = store.write(obj).map_err(|e| {
        tracing::error!("Write git object failed  with: {}", e);
        e
    })?;
    tracing::info!("Writing git object - success, {}", object_id);
    Ok(object_id)
}

async fn restore_a_set_of_blobs(
    es_client: &EverClient,
    ipfs_endpoint: &str,
    repo: &mut git_repository::Repository,
    repo_contract: &mut GoshContract,
    snapshot_address: &blockchain::BlockchainContractAddress,
    blobs: &mut HashSet<git_hash::ObjectId>,
    visited: Arc<Mutex<HashSet<git_hash::ObjectId>>>,
    visited_ipfs: Arc<Mutex<HashMap<String, git_hash::ObjectId>>>,
    branch: &str,
) -> anyhow::Result<HashSet<git_hash::ObjectId>> {
    let snapshot_contract = GoshContract::new(snapshot_address, gosh_abi::SNAPSHOT);

    match snapshot_contract.is_active(es_client).await {
        Ok(true) => {
            restore_a_set_of_blobs_from_a_known_snapshot(
                es_client,
                ipfs_endpoint,
                repo,
                repo_contract,
                &snapshot_address,
                blobs,
                visited,
                visited_ipfs,
                branch,
            )
            .await
        }
        _ => {
            restore_a_set_of_blobs_from_a_deleted_snapshot(
                es_client,
                ipfs_endpoint,
                repo,
                repo_contract,
                &snapshot_address,
                blobs,
                visited,
                visited_ipfs,
                branch,
            )
            .await
        }
    }
}

#[instrument(level = "trace", skip_all)]
async fn restore_a_set_of_blobs_from_a_known_snapshot(
    es_client: &EverClient,
    ipfs_endpoint: &str,
    repo: &mut git_repository::Repository,
    repo_contract: &mut GoshContract,
    snapshot_address: &blockchain::BlockchainContractAddress,
    blobs: &mut HashSet<git_hash::ObjectId>,
    visited: Arc<Mutex<HashSet<git_hash::ObjectId>>>,
    visited_ipfs: Arc<Mutex<HashMap<String, git_hash::ObjectId>>>,
    branch: &str,
) -> anyhow::Result<HashSet<git_hash::ObjectId>> {
    tracing::info!("Iteration in restore: {} -> {:?}", snapshot_address, blobs);
    {
        let visited = visited.lock().await;
        blobs.retain(|e| !visited.contains(e));
    }
    tracing::info!("remaining: {:?}", blobs);
    if blobs.is_empty() {
        return Ok(blobs.to_owned());
    }

    // In general it is not nice to return tuples since
    // it misses context.
    // However this case seems to be an appropriate balance
    // between code readability and resistance for
    // future changes that might break logic unnoticed
    let current_snapshot_state = BlobsRebuildingPlan::restore_snapshot_blob(
        es_client,
        ipfs_endpoint,
        repo,
        snapshot_address,
        visited_ipfs.clone(),
    )
    .await?;
    // tracing::trace!("restored_snapshots: {:#?}", current_snapshot_state);
    let mut last_restored_snapshots: LruCache<ObjectId, Vec<u8>> =
        LruCache::new(NonZeroUsize::new(2).unwrap());
    if let Some((blob_id, blob)) = current_snapshot_state.0 {
        {
            let mut visited = visited.lock().await;
            visited.insert(blob_id);
        }
        last_restored_snapshots.put(blob_id, blob);
        blobs.remove(&blob_id);
    }
    if let Some((blob_id, blob)) = current_snapshot_state.1 {
        {
            let mut visited = visited.lock().await;
            visited.insert(blob_id);
        }
        last_restored_snapshots.put(blob_id, blob);
        blobs.remove(&blob_id);
    }

    tracing::info!(
        "Expecting to restore blobs: {:?} from {}",
        blobs,
        snapshot_address
    );

    // TODO: convert to async iterator
    // This should download next messages seemless
    let mut messages = blockchain::snapshot::diffs::DiffMessagesIterator::new(
        snapshot_address,
        repo_contract,
        branch.to_string(),
        true,
    );
    let mut preserved_message: Option<DiffMessage> = None;
    let mut transition_content: Option<Vec<u8>> = None;
    let mut parsed = vec![];
    let mut visited_ipfs_hash: Option<String> = None;
    while !blobs.is_empty() {
        tracing::info!("Still expecting to restore blobs: {:?}", blobs);

        // take next a chunk of messages and reverse it on a snapshot
        // remove matching blob ids
        //
        let message = if let Some(unused_message) = preserved_message.clone() {
            preserved_message = None;
            unused_message
        } else {
            match messages.next(&es_client).await? {
                None => break,
                Some(message) => {
                    if parsed.contains(&message) {
                        break;
                    }
                    message
                }
            }
        };
        tracing::trace!("got message: {:?}", message);
        parsed.push(message.clone());
        let blob_data: Vec<u8> = if message.diff.remove_ipfs {
            let data = match message.diff.get_patch_data() {
                Some(content) => content,
                None => panic!("Broken diff detected: content doesn't exist"),
            };
            data
        } else if let Some(ipfs) = &message.diff.ipfs {
            transition_content = message.diff.get_patch_data();

            let visited = visited_ipfs.lock().await;
            let blob_id: Option<ObjectId> = visited.get(ipfs).copied();

            match blob_id {
                Some(blob_id) => load_data_from_local(&repo.objects, &blob_id)?,
                None => {
                    visited_ipfs_hash = Some(ipfs.to_owned());
                    load_data_from_ipfs(&build_ipfs(&ipfs_endpoint)?, ipfs).await?
                }
            }
        } else if let Some(content) = transition_content.clone() {
            // we won't use the message, so we'll store it for the next iteration
            preserved_message = Some(message);
            transition_content = None;
            content
        } else {
            let patched_blob_sha = &message
                .diff
                .modified_blob_sha1
                .as_ref()
                .expect("Option on this should be reverted. It must always be there");
            let patched_blob_sha = git_hash::ObjectId::from_str(patched_blob_sha)?;
            let content = last_restored_snapshots
                .get(&patched_blob_sha)
                .expect("It is a sequence of changes. Sha must be correct. Fail otherwise");
            let patched_blob = content.to_vec();

            message
                .diff
                .with_patch::<_, anyhow::Result<Vec<u8>>>(|e| match e {
                    Some(patch) => {
                        let blob_data =
                            diffy::apply_bytes(&patched_blob, &patch.clone().reverse())?;
                        Ok(blob_data)
                    }
                    None => panic!("Broken diff detected: neither ipfs nor patch exists"),
                })?
        };

        let blob = git_object::Data::new(git_object::Kind::Blob, &blob_data);
        let blob_id = write_git_data(repo, blob).await?;
        tracing::info!("Restored blob {}", blob_id);
        last_restored_snapshots.put(blob_id, blob_data);
        {
            let mut visited = visited.lock().await;
            visited.insert(blob_id);
        }
        if let Some(ipfs) = visited_ipfs_hash {
            visited_ipfs_hash = None;
            {
                let mut visited_ipfs = visited_ipfs.lock().await;
                visited_ipfs.insert(ipfs, blob_id);
            }
        }
        blobs.remove(&blob_id);
    }
    Ok(blobs.to_owned())
}

#[instrument(level = "trace", skip_all)]
async fn restore_a_set_of_blobs_from_a_deleted_snapshot(
    es_client: &EverClient,
    ipfs_endpoint: &str,
    repo: &mut git_repository::Repository,
    repo_contract: &mut GoshContract,
    snapshot_address: &blockchain::BlockchainContractAddress,
    blobs: &mut HashSet<git_hash::ObjectId>,
    visited: Arc<Mutex<HashSet<git_hash::ObjectId>>>,
    visited_ipfs: Arc<Mutex<HashMap<String, git_hash::ObjectId>>>,
    branch: &str,
) -> anyhow::Result<HashSet<git_hash::ObjectId>> {
    tracing::info!("Iteration in restore: {} -> {:?}", snapshot_address, blobs);
    {
        let visited = visited.lock().await;
        blobs.retain(|e| !visited.contains(e));
    }
    tracing::info!("remaining: {:?}", blobs);
    if blobs.is_empty() {
        return Ok(blobs.to_owned());
    }

    let (blob_id, blob) = BlobsRebuildingPlan::restore_snapshot_from_constructor(
        es_client,
        ipfs_endpoint,
        repo,
        snapshot_address,
        visited_ipfs.clone(),
    )
    .await?;

    let mut last_restored_snapshots: LruCache<ObjectId, Vec<u8>> =
        LruCache::new(NonZeroUsize::new(2).unwrap());
    {
        let mut visited = visited.lock().await;
        visited.insert(blob_id);
    }
    last_restored_snapshots.put(blob_id, blob.clone());
    blobs.remove(&blob_id);
    let mut last_restored_blod_id = git_hash::ObjectId::from_str(ZERO_SHA)?;
    let mut last_restored_blob_content = Vec::<u8>::new();

    tracing::info!(
        "Expecting to restore blobs: {:?} from {}",
        blobs,
        snapshot_address
    );

    // TODO: convert to async iterator
    // This should download next messages seemless
    let mut messages = blockchain::snapshot::diffs::DiffMessagesIterator::new(
        snapshot_address,
        repo_contract,
        branch.to_string(),
        false,
    );
    let mut preserved_message: Option<DiffMessage> = None;
    let mut transition_content: Option<Vec<u8>> = None;
    let mut parsed = vec![];
    let mut visited_ipfs_hash: Option<String> = None;
    while !blobs.is_empty() {
        tracing::info!("Still expecting to restore blobs: {:?}", blobs);

        // take next a chunk of messages and reverse it on a snapshot
        // remove matching blob ids
        //
        let message = if let Some(unused_message) = preserved_message.clone() {
            preserved_message = None;
            unused_message
        } else {
            match messages.next(&es_client).await? {
                None => break,
                Some(message) => {
                    if parsed.contains(&message) {
                        break;
                    }
                    message
                }
            }
        };
        tracing::trace!("got message: {:?}", message);
        parsed.push(message.clone());
        let blob_data: Vec<u8> = if message.diff.remove_ipfs {
            let data = match message.diff.get_patch_data() {
                Some(content) => content,
                None => panic!("Broken diff detected: content doesn't exist"),
            };
            data
        } else if let Some(ipfs) = &message.diff.ipfs {
            transition_content = message.diff.get_patch_data();

            let visited = visited_ipfs.lock().await;
            let blob_id: Option<ObjectId> = visited.get(ipfs).copied();

            match blob_id {
                Some(blob_id) => load_data_from_local(&repo.objects, &blob_id)?,
                None => {
                    visited_ipfs_hash = Some(ipfs.to_owned());
                    load_data_from_ipfs(&build_ipfs(&ipfs_endpoint)?, ipfs).await?
                }
            }
        } else if let Some(content) = transition_content.clone() {
            // we won't use the message, so we'll store it for the next iteration
            preserved_message = Some(message);
            transition_content = None;
            content
        } else {
            // let patched_blob_sha = &message
            //     .diff
            //     .modified_blob_sha1
            //     .as_ref()
            //     .expect("Option on this should be reverted. It must always be there");
            // let patched_blob_sha = git_hash::ObjectId::from_str(patched_blob_sha)?;
            // let content = last_restored_snapshots
            //     .get(&patched_blob_sha)
            //     .expect("It is a sequence of changes. Sha must be correct. Fail otherwise");
            // let patched_blob = content.to_vec();
            let patched_blob = last_restored_blob_content;

            message
                .diff
                .with_patch::<_, anyhow::Result<Vec<u8>>>(|e| match e {
                    Some(patch) => {
                        let blob_data = diffy::apply_bytes(&patched_blob, &patch.clone())?;
                        Ok(blob_data)
                    }
                    None => panic!("Broken diff detected: neither ipfs nor patch exists"),
                })?
        };

        let blob = git_object::Data::new(git_object::Kind::Blob, &blob_data);
        let blob_id = write_git_data(repo, blob).await?;
        tracing::info!("Restored blob {}", blob_id);
        last_restored_snapshots.put(blob_id, blob_data.clone());
        last_restored_blod_id = blob_id;
        last_restored_blob_content = blob_data;
        {
            let mut visited = visited.lock().await;
            visited.insert(blob_id);
        }
        if let Some(ipfs) = visited_ipfs_hash {
            visited_ipfs_hash = None;
            {
                let mut visited_ipfs = visited_ipfs.lock().await;
                visited_ipfs.insert(ipfs, blob_id);
            }
        }
        blobs.remove(&blob_id);
    }
    Ok(blobs.to_owned())
}

async fn convert_snapshot_into_blob(
    ipfs_client: &impl FileLoad,
    content: &[u8],
    ipfs: &Option<String>,
) -> anyhow::Result<(git_object::Object, Vec<u8>)> {
    let ipfs_data = if let Some(ipfs_hash) = ipfs {
        load_data_from_ipfs(ipfs_client, ipfs_hash).await?
    } else {
        vec![]
    };

    let raw_data: Vec<u8> = match ipfs {
        None => content.to_owned(),
        Some(_) => ipfs_data,
    };

    // tracing::info!("got: {:?}", raw_data);

    let data = git_object::Data::new(git_object::Kind::Blob, &raw_data);
    let obj = git_object::Object::from(data.decode()?);
    Ok((obj, raw_data))
}

impl BlobsRebuildingPlan {
    pub fn is_available(&self) -> bool {
        !self.snapshot_address_to_blob_sha.is_empty()
    }
    pub fn new() -> Self {
        Self {
            snapshot_address_to_blob_sha: HashMap::new(),
        }
    }

    #[instrument(level = "info", skip_all)]
    pub fn mark_blob_to_restore(
        &mut self,
        appeared_at_snapshot_address: BlockchainContractAddress,
        blob_sha1: ObjectId,
    ) {
        tracing::info!(
            "Mark blob: {} -> {}",
            blob_sha1,
            appeared_at_snapshot_address
        );
        self.snapshot_address_to_blob_sha
            .entry(appeared_at_snapshot_address)
            .and_modify(|blobs| {
                blobs.insert(blob_sha1);
            })
            .or_insert({
                let mut blobs = HashSet::<ObjectId>::new();
                blobs.insert(blob_sha1);
                blobs
            });
        tracing::info!("new state: {:?}", self.snapshot_address_to_blob_sha);
    }

    #[instrument(level = "info", skip_all)]
    async fn restore_snapshot_blob(
        es_client: &EverClient,
        ipfs_endpoint: &str,
        repo: &mut git_repository::Repository,
        snapshot_address: &BlockchainContractAddress,
        visited_ipfs: Arc<Mutex<HashMap<String, git_hash::ObjectId>>>,
    ) -> anyhow::Result<(Option<(ObjectId, Vec<u8>)>, Option<(ObjectId, Vec<u8>)>)> {
        tracing::trace!(
            "restore_snapshot_blob: ipfs_endpoint={}, repo={:?}, snapshot_address={}",
            ipfs_endpoint,
            repo,
            snapshot_address,
        );
        let ipfs_client = build_ipfs(ipfs_endpoint)?;
        let snapshot = blockchain::Snapshot::load(&es_client, snapshot_address).await?;
        tracing::info!("Loaded a snapshot: {:?}", snapshot);
        let snapshot_next_commit_sha = ObjectId::from_str(&snapshot.next_commit);
        let snapshot_current_commit_sha = ObjectId::from_str(&snapshot.current_commit);
        let snapshot_next = if snapshot_next_commit_sha.is_ok() {
            let mut new_loading = false;
            let (content, ipfs_hash) = if let Some(ipfs_hash) = snapshot.next_ipfs.clone() {
                let visited = visited_ipfs.lock().await;
                let blob_id: Option<ObjectId> = visited.get(&ipfs_hash).copied();

                let data = match blob_id {
                    Some(blob_id) => load_data_from_local(&repo.objects, &blob_id)?,
                    None => {
                        new_loading = true;
                        load_data_from_ipfs(&build_ipfs(&ipfs_endpoint)?, &ipfs_hash).await?
                    }
                };
                (data, None)
            } else {
                (snapshot.next_content, snapshot.next_ipfs.clone())
            };

            let (blob, blob_data) = convert_snapshot_into_blob(&ipfs_client, &content, &ipfs_hash)
                .instrument(info_span!("convert_next_snapshot_into_blob").or_current())
                .await?;
            let blob_oid = write_git_object(repo, blob).await?;
            if new_loading {
                let mut visited = visited_ipfs.lock().await;
                visited.insert(snapshot.next_ipfs.clone().unwrap(), blob_oid);
            }
            Some((blob_oid, blob_data))
        } else {
            None
        };
        let snapshot_current =
            if snapshot.next_ipfs.is_some() && snapshot.next_ipfs == snapshot.current_ipfs {
                // deduplicate
                None // snapshot_next.clone()
            } else if snapshot_current_commit_sha.is_ok() {
                let (blob, blob_data) = convert_snapshot_into_blob(
                    &ipfs_client,
                    &snapshot.current_content,
                    &snapshot.current_ipfs,
                )
                .instrument(info_span!("convert_current_snapshot_into_blob").or_current())
                .await?;
                let blob_oid = write_git_object(repo, blob).await?;
                Some((blob_oid, blob_data))
            } else {
                None
            };
        let restored_snapshots = (snapshot_next, snapshot_current);
        assert!(
            restored_snapshots != (None, None),
            "It is clear that something is wrong. Better to fail now"
        );
        Ok(restored_snapshots)
    }

    #[instrument(level = "info", skip_all)]
    async fn restore_snapshot_from_constructor(
        es_client: &EverClient,
        ipfs_endpoint: &str,
        repo: &mut git_repository::Repository,
        snapshot_address: &BlockchainContractAddress,
        visited_ipfs: Arc<Mutex<HashMap<String, git_hash::ObjectId>>>,
    ) -> anyhow::Result<(ObjectId, Vec<u8>)> {
        tracing::trace!(
            "restore_snapshot_from_constructor: repo={:?}, snapshot_address={}",
            repo,
            snapshot_address,
        );
        let ipfs_client = build_ipfs(ipfs_endpoint)?;

        let (data, ipfs) =
            blockchain::snapshot::diffs::load_constructor(&es_client, snapshot_address).await?;

        let mut new_loading = false;
        let (content, ipfs_hash) = if let Some(ipfs_hash) = ipfs.clone() {
            let visited = visited_ipfs.lock().await;
            let blob_id: Option<ObjectId> = visited.get(&ipfs_hash).copied();

            let data = match blob_id {
                Some(blob_id) => load_data_from_local(&repo.objects, &blob_id)?,
                None => {
                    new_loading = true;
                    load_data_from_ipfs(&build_ipfs(&ipfs_endpoint)?, &ipfs_hash).await?
                }
            };
            (data, None)
        } else {
            (data, ipfs)
        };

        let (blob, blob_data) = convert_snapshot_into_blob(&ipfs_client, &content, &ipfs_hash)
            .instrument(info_span!("convert_next_snapshot_into_blob").or_current())
            .await?;
        let blob_oid = write_git_object(repo, blob).await?;
        if new_loading {
            let mut visited = visited_ipfs.lock().await;
            visited.insert(ipfs_hash.clone().unwrap(), blob_oid);
        }
        Ok((blob_oid, blob_data))
    }

    pub async fn restore<'a, 'b>(
        &'b mut self,
        git_helper: &mut GitHelper<impl BlockchainService>,
        visited: Arc<Mutex<HashSet<git_hash::ObjectId>>>,
        visited_ipfs: Arc<Mutex<HashMap<String, git_hash::ObjectId>>>,
        branch: &str,
    ) -> anyhow::Result<()> {
        // Idea behind
        // --
        // We've marked all blob hashes that needs to be restored
        // together with their appearance in a tree
        // This means that a snapshot on that path had been
        // in a state that we need at least once
        // --
        // Note:
        // Restore plan has a known issue that needs to be addressed:
        // In case someone is trying to load a commit that was not accepted by a repo, yet it points to some existing commit it will force it to load entire repository again and fail afterwards
        // Reason for this behaviour:
        // It will not be able to find a blob id in snapshots history
        // --
        // TODO: fix this
        // Note: this is kind of a bad solution. It create tons of junk files in the system

        tracing::info!("Restoring blobs: {:?}", self.snapshot_address_to_blob_sha);
        let mut fetched_blobs: FuturesUnordered<
            tokio::task::JoinHandle<anyhow::Result<HashSet<ObjectId>>>,
        > = FuturesUnordered::new();

        let mut unvisited_blobs = HashSet::new();

        for (snapshot_address, blobs) in self.snapshot_address_to_blob_sha.iter_mut() {
            let es_client = Arc::clone(git_helper.blockchain.client());
            let ipfs_http_endpoint = git_helper.config.ipfs_http_endpoint().to_string();
            let mut repo = git_helper.local_repository().clone();
            let mut repo_contract = git_helper.blockchain.repo_contract().clone();
            let snapshot_address_clone = snapshot_address.clone();
            let mut blobs_to_restore = blobs.clone();
            let visited_ref = Arc::clone(&visited);
            let visited_ipfs_ref = Arc::clone(&visited_ipfs);
            let branch_ref = branch.to_string();
            fetched_blobs.push(tokio::spawn(
                async move {
                    let mut attempt = 0;
                    let result = loop {
                        attempt += 1;
                        let result = restore_a_set_of_blobs(
                            &es_client,
                            &ipfs_http_endpoint,
                            &mut repo,
                            &mut repo_contract,
                            &snapshot_address_clone,
                            &mut blobs_to_restore,
                            visited_ref.clone(),
                            visited_ipfs_ref.clone(),
                            &branch_ref,
                        )
                        .await;
                        if result.is_ok() || attempt > FETCH_MAX_TRIES {
                            break result;
                        } else {
                            tracing::trace!(
                                "restore_a_set_of_blobs <{:#?}> error {:?}",
                                snapshot_address_clone,
                                result.unwrap_err()
                            );
                            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                            // panic!("stopped");
                        }
                    };
                    result.map_err(|e| anyhow::Error::from(e))
                }
                .instrument(info_span!("tokio::spawn::restore_a_set_of_blobs").or_current()),
            ));
            blobs.clear();
        }
        self.snapshot_address_to_blob_sha.clear();

        while let Some(finished_task) = fetched_blobs.next().await {
            match finished_task {
                Err(e) => {
                    panic!("restore_a_set_of_blobs joih-handler: {}", e);
                }
                Ok(Err(e)) => {
                    panic!("restore_a_set_of_blobs inner: {}", e);
                }
                Ok(Ok(blobs)) => {
                    tracing::trace!("Blobs after restore: {blobs:?}");
                    for blob in blobs {
                        unvisited_blobs.insert(blob);
                    }
                }
            }
        }
        tracing::trace!("unvisited_blobs: {unvisited_blobs:?}");
        tracing::trace!("visited_blobs: {visited:?}");

        for blob in unvisited_blobs {
            let vis = visited.lock().await;
            if !vis.contains(&blob) {
                panic!("Failed to restore: {blob}");
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {}
