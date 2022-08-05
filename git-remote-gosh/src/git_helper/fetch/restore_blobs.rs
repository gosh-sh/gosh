use super::GitHelper;
use crate::blockchain;
use crate::ipfs::IpfsService;
use diffy;
use git_hash;
use git_hash::ObjectId;
use git_object;
use lru::LruCache;
use std::collections::{hash_map, HashMap, HashSet};

use std::error::Error;
use std::str::FromStr;
use std::vec::Vec;

pub struct BlobsRebuildingPlan {
    snapshot_address_to_blob_sha: HashMap<String, HashSet<ObjectId>>,
}

async fn load_data_from_ipfs(
    ipfs_client: &IpfsService,
    ipfs_address: &str,
) -> Result<Vec<u8>, Box<dyn Error>> {
    let ipfs_data = ipfs_client.load(&ipfs_address).await?;
    let data = base64::decode(ipfs_data)?;
    return Ok(data);
}

async fn convert_snapshot_into_blob(
    helper: &mut GitHelper,
    content: &Vec<u8>,
    ipfs: &Option<String>,
) -> Result<(git_object::Object, Vec<u8>), Box<dyn Error>> {
    let ipfs_data = if let Some(ipfs_address) = ipfs {
        load_data_from_ipfs(&helper.ipfs_client, &ipfs_address).await?
    } else {
        vec![]
    };

    let raw_data: Vec<u8> = match ipfs {
        None => content.clone(),
        Some(_) => ipfs_data,
    };

    log::info!("got: {:?}", raw_data);

    let data = git_object::Data::new(git_object::Kind::Blob, &raw_data);
    let obj = git_object::Object::from(data.decode()?);
    Ok((obj, raw_data))
}

impl BlobsRebuildingPlan {
    pub fn new() -> Self {
        Self {
            snapshot_address_to_blob_sha: HashMap::new(),
        }
    }

    #[instrument(level = "debug", skip(self))]
    pub fn mark_blob_to_restore(
        &mut self,
        appeared_at_snapshot_address: String,
        blob_sha1: ObjectId,
    ) {
        let blobs_queue = match self
            .snapshot_address_to_blob_sha
            .entry(appeared_at_snapshot_address)
        {
            hash_map::Entry::Occupied(o) => o.into_mut(),
            hash_map::Entry::Vacant(v) => v.insert(HashSet::<ObjectId>::new()),
        };
        blobs_queue.insert(blob_sha1);
    }

    async fn restore_snapshot_blob(
        git_helper: &mut GitHelper,
        snapshot_address: &str,
    ) -> Result<(Option<(ObjectId, Vec<u8>)>, Option<(ObjectId, Vec<u8>)>), Box<dyn Error>> {
        let snapshot = blockchain::Snapshot::load(&git_helper.es_client, &snapshot_address).await?;
        log::info!("Loaded a snapshot: {:?}", snapshot);
        let snapshot_next_commit_sha = ObjectId::from_str(&snapshot.next_commit);
        let snapshot_current_commit_sha = ObjectId::from_str(&snapshot.current_commit);
        let snapshot_next = if snapshot_next_commit_sha.is_ok() {
            let (blob, blob_data) =
                convert_snapshot_into_blob(git_helper, &snapshot.next_content, &snapshot.next_ipfs)
                    .await?;
            let blob_oid = git_helper.write_git_object(blob).await?;
            Some((blob_oid, blob_data))
        } else {
            None
        };
        let snapshot_current = if snapshot_current_commit_sha.is_ok() {
            let (blob, blob_data) = convert_snapshot_into_blob(
                git_helper,
                &snapshot.current_content,
                &snapshot.current_ipfs,
            )
            .await?;
            let blob_oid = git_helper.write_git_object(blob).await?;
            Some((blob_oid, blob_data))
        } else {
            None
        };
        let restored_snapshots = (snapshot_next, snapshot_current);
        assert!(
            restored_snapshots != (None, None),
            "It is clear that something is wrong. Better to fail now"
        );
        return Ok(restored_snapshots);
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

        log::info!("Restoring blobs");
        let mut visited: HashSet<git_hash::ObjectId> = HashSet::new();
        macro_rules! guard {
            ($id:ident) => {
                if visited.contains(&$id) {
                    continue;
                }
                if $id.is_null() {
                    continue;
                }
                if git_helper.is_commit_in_local_cache(&$id) {
                    visited.insert($id.clone());
                    continue;
                }
                visited.insert($id.clone());
            };
        }

        for (snapshot_address, blobs) in self.snapshot_address_to_blob_sha.iter_mut() {
            blobs.retain(|e| !visited.contains(e));
            if blobs.is_empty() {
                continue;
            }

            // In general it is not nice to return tuples since
            // it misses context.
            // However this case seems to be an appropriate balance
            // between code readability and resistance for
            // future changes that might break logic unnoticed
            let restored_snapshots =
                BlobsRebuildingPlan::restore_snapshot_blob(git_helper, snapshot_address).await?;
            let mut last_restored_snapshots: LruCache<ObjectId, Vec<u8>> = LruCache::new(2);
            if let Some((blob_id, blob)) = restored_snapshots.0 {
                visited.insert(blob_id);
                last_restored_snapshots.put(blob_id, blob);
                blobs.remove(&blob_id);
            }
            if let Some((blob_id, blob)) = restored_snapshots.1 {
                visited.insert(blob_id);
                last_restored_snapshots.put(blob_id, blob);
                blobs.remove(&blob_id);
            }

            log::info!(
                "Expecting to restore blobs: {:?} from {}",
                blobs,
                snapshot_address
            );

            // TODO: convert to async iterator
            // This should download next messages seemless
            let mut messages =
                blockchain::snapshot::diffs::DiffMessagesIterator::new(
                    snapshot_address,
                    git_helper.repo_addr.clone()
                );
            while !blobs.is_empty() {
                log::info!("Still expecting to restore blobs: {:?}", blobs);
                // take next a chunk of messages and reverse it on a snapshot
                // remove matching blob ids
                //
                let message = messages.next(&git_helper.es_client)
                    .await?
                    .expect("If we reached an end of the messages queue and blobs are still missing it is better to fail. something is wrong and it needs an investigation.");

                let blob_data: Vec<u8> = if let Some(ipfs) = &message.diff.ipfs {
                    load_data_from_ipfs(&git_helper.ipfs_client, &ipfs).await?
                } else {
                    message.diff.with_patch::<_, Result<Vec<u8>, Box<dyn Error>>>(|e| match e {
                        Some(patch) => {
                            let patched_blob_sha = &message.diff.modified_blob_sha1.as_ref().expect("Option on this should be reverted. It must always be there");
                            let patched_blob_sha = git_hash::ObjectId::from_str(patched_blob_sha)?;
                            let patched_blob = last_restored_snapshots.get(&patched_blob_sha)
                                .expect("It is a sequence of changes. Sha must be correct. Fail otherwise");
                            let blob_data = diffy::apply_bytes(patched_blob, &patch.clone().reverse())?;
                            return Ok(blob_data);
                        },
                        None => panic!("Broken diff detected: no ipfs neither patch exists")
                    })?
                };

                let blob = git_object::Data::new(git_object::Kind::Blob, &blob_data);
                let blob_id = git_helper.write_git_data(blob).await?;
                log::info!("Restored blob {}", blob_id);
                last_restored_snapshots.put(blob_id, blob_data);
                visited.insert(blob_id);
                blobs.remove(&blob_id);
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {

    #[test]
    fn testing_what_is_inside_the_snapshot_content() {}
}
