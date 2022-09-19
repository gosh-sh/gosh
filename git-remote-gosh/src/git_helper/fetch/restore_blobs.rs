use super::GitHelper;
use futures::stream::FuturesUnordered;
use futures::StreamExt;
use crate::blockchain;
use crate::blockchain::BlockchainContractAddress;
use crate::git_helper::GoshContract;
use crate::ipfs::IpfsService;
use git_hash::ObjectId;
use lru::LruCache;
use std::collections::{HashMap, HashSet};
use std::num::NonZeroUsize;
use crate::git_helper::TonClient;
use std::error::Error;
use std::str::FromStr;
use std::vec::Vec;
use git_odb::Write;
use std::sync::Mutex;
use std::sync::Arc;

const FETCH_MAX_TRIES:i32 = 3;

pub struct BlobsRebuildingPlan {
    snapshot_address_to_blob_sha: HashMap<BlockchainContractAddress, HashSet<ObjectId>>,
}

#[instrument(level = "debug", skip(ipfs_client))]
async fn load_data_from_ipfs(
    ipfs_client: &IpfsService,
    ipfs_address: &str,
) -> Result<Vec<u8>, Box<dyn Error>> {
    let ipfs_data = ipfs_client.load(ipfs_address).await?;
    let compressed_data = base64::decode(ipfs_data)?;
    let data = ton_client::utils::decompress_zstd(&compressed_data)?;

    Ok(data)
}

async fn write_git_data<'a>(
        repo: &mut git_repository::Repository,
        obj: git_object::Data<'a>,
    ) -> Result<git_hash::ObjectId, Box<dyn Error>> {
        log::info!("Writing git data: {} -> size: {}", obj.kind, obj.data.len());
        let store = &mut repo.objects;
        // It should refresh once even if the refresh mode is never, just to initialize the index
        //store.refresh_never();
        let object_id = store.write_buf(obj.kind, obj.data)?;
        log::info!("Writing git data - success");
        Ok(object_id)
    }

async fn write_git_object(
        repo: &mut git_repository::Repository,
        obj: impl git_object::WriteTo,
    ) -> Result<git_hash::ObjectId, Box<dyn Error>> {
        log::info!("Writing git object");
        let store = &mut repo.objects;
        // It should refresh once even if the refresh mode is never, just to initialize the index
        //store.refresh_never();
        let object_id = store.write(obj).map_err(|e| {
            log::error!("Write git object failed  with: {}", e);
            e
        })?;
        log::info!("Writing git object - success, {}", object_id);
        Ok(object_id)
    }

async fn restore_a_set_of_blobs_from_a_known_snapshot(
    es_client: &TonClient,
    ipfs_endpoint: &str,
    repo: &mut git_repository::Repository,
    repo_contract: &mut GoshContract,
    snapshot_address: &blockchain::BlockchainContractAddress,
    blobs: &mut HashSet<git_hash::ObjectId>,
    visited: &Arc<Mutex<HashSet<git_hash::ObjectId>>>,
) -> Result<(), Box<dyn Error>> {
    log::info!("Iteration in restore: {} -> {:?}", snapshot_address, blobs);
    {
        let visited = visited.lock().unwrap(); 
        blobs.retain(|e| !visited.contains(e));
    }
    log::info!("remaining: {:?}", blobs);
    if blobs.is_empty() {
        return Ok(());
    }

    // In general it is not nice to return tuples since
    // it misses context.
    // However this case seems to be an appropriate balance
    // between code readability and resistance for
    // future changes that might break logic unnoticed
    let current_snapshot_state =
        BlobsRebuildingPlan::restore_snapshot_blob(es_client, ipfs_endpoint, repo, snapshot_address).await?;
    log::debug!("restored_snapshots: {:#?}", current_snapshot_state);
    let mut last_restored_snapshots: LruCache<ObjectId, Vec<u8>> =
        LruCache::new(NonZeroUsize::new(2).unwrap());
    if let Some((blob_id, blob)) = current_snapshot_state.0 {
        {
            let mut visited = visited.lock().unwrap();
            visited.insert(blob_id);
        }
        last_restored_snapshots.put(blob_id, blob);
        blobs.remove(&blob_id);
    }
    if let Some((blob_id, blob)) = current_snapshot_state.1 {
        {
            let mut visited = visited.lock().unwrap();
            visited.insert(blob_id);
        }
        last_restored_snapshots.put(blob_id, blob);
        blobs.remove(&blob_id);
    }
    log::debug!(
        "post last_restored_snapshots: {:#?}",
        last_restored_snapshots
    );

    log::info!(
        "Expecting to restore blobs: {:?} from {}",
        blobs,
        snapshot_address
    );

    // TODO: convert to async iterator
    // This should download next messages seemless
    let mut messages = blockchain::snapshot::diffs::DiffMessagesIterator::new(
        snapshot_address,
        repo_contract,
    );
    let mut walked_through_ipfs = false;
    while !blobs.is_empty() {
        log::info!("Still expecting to restore blobs: {:?}", blobs);
        // take next a chunk of messages and reverse it on a snapshot
        // remove matching blob ids
        //
        let message = messages.next(&es_client)
            .await?
            .expect("If we reached an end of the messages queue and blobs are still missing it is better to fail. something is wrong and it needs an investigation.");

        let blob_data: Vec<u8> = if let Some(ipfs) = &message.diff.ipfs {
            walked_through_ipfs = true;
            load_data_from_ipfs(&IpfsService::new(&ipfs_endpoint), ipfs).await?
        } else if walked_through_ipfs {
            walked_through_ipfs = false;
            let snapshot = blockchain::Snapshot::load(es_client, snapshot_address).await?;
            snapshot.next_content
        } else {
            message
                .diff
                .with_patch::<_, Result<Vec<u8>, Box<dyn Error>>>(|e| match e {
                    Some(patch) => {
                        let patched_blob_sha =
                            &message.diff.modified_blob_sha1.as_ref().expect(
                                "Option on this should be reverted. It must always be there",
                            );
                        let patched_blob_sha = git_hash::ObjectId::from_str(patched_blob_sha)?;
                        let patched_blob = last_restored_snapshots.get(&patched_blob_sha).expect(
                            "It is a sequence of changes. Sha must be correct. Fail otherwise",
                        );
                        let blob_data = diffy::apply_bytes(patched_blob, &patch.clone().reverse())?;
                        Ok(blob_data)
                    }
                    None => panic!("Broken diff detected: no ipfs neither patch exists"),
                })?
        };
        let blob = git_object::Data::new(git_object::Kind::Blob, &blob_data);
        let blob_id = write_git_data(repo, blob).await?;
        log::info!("Restored blob {}", blob_id);
        last_restored_snapshots.put(blob_id, blob_data);
        {
            let mut visited = visited.lock().unwrap();
            visited.insert(blob_id);
        }
        blobs.remove(&blob_id);
    }
    Ok(())
}

async fn convert_snapshot_into_blob(
    ipfs_client: &IpfsService,
    content: &[u8],
    ipfs: &Option<String>,
) -> Result<(git_object::Object, Vec<u8>), Box<dyn Error>> {
    let ipfs_data = if let Some(ipfs_address) = ipfs {
        load_data_from_ipfs(ipfs_client, ipfs_address).await?
    } else {
        vec![]
    };

    let raw_data: Vec<u8> = match ipfs {
        None => content.to_owned(),
        Some(_) => ipfs_data,
    };

    // log::info!("got: {:?}", raw_data);

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

    #[instrument(level = "debug", skip(self))]
    pub fn mark_blob_to_restore(
        &mut self,
        appeared_at_snapshot_address: BlockchainContractAddress,
        blob_sha1: ObjectId,
    ) {
        log::info!(
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
        log::info!("new state: {:?}", self.snapshot_address_to_blob_sha);
    }

    async fn restore_snapshot_blob(
        es_client: &TonClient,
        ipfs_endpoint: &str,
        repo: &mut git_repository::Repository,
        snapshot_address: &BlockchainContractAddress,
    ) -> Result<(Option<(ObjectId, Vec<u8>)>, Option<(ObjectId, Vec<u8>)>), Box<dyn Error>> {
        let ipfs_client = IpfsService::new(ipfs_endpoint);
        let snapshot = blockchain::Snapshot::load(&es_client, snapshot_address).await?;
        log::info!("Loaded a snapshot: {:?}", snapshot);
        let snapshot_next_commit_sha = ObjectId::from_str(&snapshot.next_commit);
        let snapshot_current_commit_sha = ObjectId::from_str(&snapshot.current_commit);
        let snapshot_next = if snapshot_next_commit_sha.is_ok() {
            let (blob, blob_data) =
                convert_snapshot_into_blob(&ipfs_client, &snapshot.next_content, &snapshot.next_ipfs)
                    .await?;
            let blob_oid = write_git_object(repo, blob).await?;
            Some((blob_oid, blob_data))
        } else {
            None
        };
        let snapshot_current = if snapshot_current_commit_sha.is_ok() {
            let (blob, blob_data) = convert_snapshot_into_blob(
                &ipfs_client,
                &snapshot.current_content,
                &snapshot.current_ipfs,
            )
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

    pub async fn restore<'a, 'b>(
        &'b mut self,
        git_helper: &mut GitHelper,
    ) -> Result<(), Box<dyn Error>> {
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

        log::info!("Restoring blobs: {:?}", self.snapshot_address_to_blob_sha);
        let mut visited: Arc<Mutex<HashSet<git_hash::ObjectId>>> = Arc::new(Mutex::new(HashSet::new()));
        let mut fetched_blobs: FuturesUnordered<tokio::task::JoinHandle<std::result::Result<(), std::string::String>>> = FuturesUnordered::new();

        for (snapshot_address, blobs) in self.snapshot_address_to_blob_sha.iter_mut() {
            let es_client = git_helper.es_client.clone(); 
            let ipfs_http_endpoint = git_helper.config.ipfs_http_endpoint().to_string();
            let mut repo = git_helper.local_repository().clone();
            let mut repo_contract = git_helper.repo_contract.clone();
            let snapshot_address_clone = snapshot_address.clone();
            let mut blobs_to_restore = blobs.clone();
            let visited_ref = Arc::clone(&visited);
            fetched_blobs.push(tokio::spawn(async move {
                let mut attempt = 0;
                let result = loop {
                    let result = restore_a_set_of_blobs_from_a_known_snapshot(
                        &es_client,
                        &ipfs_http_endpoint,
                        &mut repo,
                        &mut repo_contract,
                        &snapshot_address_clone,
                        &mut blobs_to_restore,
                        &visited_ref,
                    )
                    .await;
                    if result.is_ok() || attempt > FETCH_MAX_TRIES {
                        break result;
                    } else {
                        log::debug!("restore_a_set_of_blobs_from_a_known_snapshot error {:?}", result.unwrap_err());
                        std::thread::sleep(std::time::Duration::from_secs(5));
                    }
                };
                result.map_err(|e| e.to_string())
            }));
            blobs.clear();
        }
        self.snapshot_address_to_blob_sha.clear();

        while let Some(finished_task) = fetched_blobs.next().await {
            match finished_task {
                Err(e) => {
                    panic!("diffs joih-handler: {}", e);
                }
                Ok(Err(e)) => {
                    panic!("diffs inner: {}", e);
                }
                Ok(Ok(_)) => {}
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {}
