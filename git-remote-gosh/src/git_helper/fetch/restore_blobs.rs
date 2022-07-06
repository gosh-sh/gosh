use super::GitHelper;
use std::str::FromStr;
use std::error::Error;
use std::env;
use std::collections::{
    hash_map,
    HashSet,
    HashMap,
    VecDeque
};
use std::vec::Vec;
use git_object;
use git_odb;
use git_hash;
use git_odb::{
    Find,
    Write
};
use crate::blockchain;
use git_hash::ObjectId;
use diffy;


pub struct BlobsRebuildingPlan {
    snapshot_address_to_blob_sha: HashMap<String, HashSet<ObjectId>>,
}

async fn convert_snapshot_into_blob(helper: &mut GitHelper, content: &Vec<u8>, ipfs: &Option<String>) -> Result<git_object::Object, Box<dyn Error>>{
    let ipfs_data = if let Some(ipfs_address) = ipfs {
        let ipfs_data = helper.ipfs_client.load(&ipfs_address).await?;
        base64::decode(ipfs_data)?
    } else {
        vec![] 
    };

    let data = match ipfs {
        None => &content,
        Some(_) => &ipfs_data
    };
                 
    log::info!("got: {:?}", data);

    let data = git_object::Data::new(git_object::Kind::Blob, &data);
    let obj = git_object::Object::from(data.decode()?);
    Ok(obj)
}


impl BlobsRebuildingPlan {
    pub fn new() -> Self {
        Self {
            snapshot_address_to_blob_sha: HashMap::new()
        } 
    }

    pub fn mark_blob_to_restore(&mut self, appeared_at_snapshot_address: String, blob_sha1: ObjectId) {
        let mut blobs_queue = match self.snapshot_address_to_blob_sha.entry(appeared_at_snapshot_address) {
            hash_map::Entry::Occupied(o) => o.into_mut(),
            hash_map::Entry::Vacant(v) => v.insert(HashSet::<ObjectId>::new()),
        };
        blobs_queue.insert(blob_sha1); 
    }

    pub async fn restore(&mut self, git_helper: &mut GitHelper) -> Result<(), Box<dyn Error>> {
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
        let mut visited: HashSet::<git_hash::ObjectId> = HashSet::new();
        macro_rules! guard {
            ($id:ident) => {
                if visited.contains(&$id) { continue; }
                if $id.is_null() { continue; }  
                if git_helper.is_commit_in_local_cache(&$id) { 
                    visited.insert($id.clone());
                    continue; 
                }
                visited.insert($id.clone());
            };
        }

        for (snapshot_address, blobs) in self.snapshot_address_to_blob_sha.iter_mut() {
            blobs.retain(|e| !visited.contains(e));
            if blobs.is_empty() { continue; }

            log::info!("Expecting to restore blobs: {:?}", blobs);
            let snapshot = blockchain::Snapshot::load(&git_helper.es_client, &snapshot_address).await?;
            log::info!("Loaded a snapshot: {:?}", snapshot);
                        
            let snapshot_next_commit_sha = git_hash::ObjectId::from_str(&snapshot.next_commit);
            if snapshot_next_commit_sha.is_ok() {
                let blob = convert_snapshot_into_blob(git_helper, &snapshot.next_content, &snapshot.next_ipfs).await?;
                let blob_oid = git_helper.write_git_object(blob).await?;
                log::info!("Saved a snapshot.next as a blob. Id: {}", blob_oid);
                if blobs.contains(&blob_oid) {
                    blobs.remove(&blob_oid);
                } 
            }
            let snapshot_current_commit_sha = git_hash::ObjectId::from_str(&snapshot.current_commit);
            if snapshot_current_commit_sha.is_ok() {
                let blob = convert_snapshot_into_blob(git_helper, &snapshot.current_content, &snapshot.current_ipfs).await?;
                let blob_oid = git_helper.write_git_object(blob).await?;
                log::info!("Saved a snapshot.current as a blob. Id: {}", blob_oid);
                if blobs.contains(&blob_oid) {
                    blobs.remove(&blob_oid);
                } 
            }
            if blobs.is_empty() {
                continue;
            }
            // TODO: convert to async iterator
            // This should download next messages seemless 
            let mut messages = blockchain::load_messages_to(&git_helper.es_client, snapshot_address).await?;
            let mut messages = messages.iter();
            while !blobs.is_empty() {
                // take next a chunk of messages and reverse it on a snapshot
                // remove matching blob ids
                //
                let message = messages.next().expect("If we reached an end of the messages queue and blobs are still missing it is better to fail. something is wrong and it needs an investigation.");
                let diff_data: String = message.diff.patch.clone();
                if diff_data.len() % 2 != 0 {
                    // It is certainly not a hex string
                    return Err("Not a hex string".into());
                }
                let compressed_data: Vec<u8> = (0..diff_data.len())
                    .step_by(2)
                    .map(|i| {
                    u8::from_str_radix(&diff_data[i..i + 2], 16)
                        .map_err(|_| format!("Not a hex at {} -> {}", i, &diff_data[i..i + 2]).into())
                })
                .collect::<Result<Vec<u8>, String>>()?;
                let data = ton_client::utils::decompress_zstd(
                    &compressed_data
                )?;
                
                let patch = diffy::Patch::from_bytes(data.as_slice())?;
                let reverse_patch = patch.reverse();
                let mut store = &mut git_helper.local_repository().objects;
//                let patched_blob = store. 
                let patched_sha = &message.diff.modified_blob_sha1;   
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn testing_what_is_inside_the_snapshot_content() {
        
    }
}

