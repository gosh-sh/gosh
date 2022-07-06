use super::GitHelper;
use crate::blockchain;
use git_hash;
use git_object;
use git_odb;
use git_odb::Find;
use git_odb::Write;

use std::collections::{HashSet, VecDeque};
use std::error::Error;
use std::str::FromStr;
use std::vec::Vec;
mod restore_blobs;

impl GitHelper {
    pub async fn calculate_commit_address(
        &self,
        commit_id: &git_hash::ObjectId,
    ) -> Result<String, Box<dyn Error>> {
        let commit_id = format!("{}", commit_id);
        log::info!(
            "Calculating commit address for repository <{}> and commit id <{}>",
            self.repo_addr,
            commit_id
        );
        return Ok(
            blockchain::get_commit_address(&self.es_client, &self.repo_addr, &commit_id).await?,
        );
    }

    pub fn is_commit_in_local_cache(&mut self, object_id: &git_hash::ObjectId) -> bool {
        return self.local_repository().objects.contains(object_id);
    }

    async fn write_git_object(
        &mut self,
        obj: impl git_object::WriteTo,
    ) -> Result<git_hash::ObjectId, Box<dyn Error>> {
        log::info!("Writing git object");
        let mut store = &mut self.local_repository().objects;
        // It should refresh once even if the refresh mode is never, just to initialize the index
        //store.refresh_never();
        let object_id = store.write(obj)?;
        log::info!("Writing git object - success");
        return Ok(object_id);
    }

    async fn write_git_data<'a>(
        &mut self,
        obj: git_object::Data<'a>,
    ) -> Result<git_hash::ObjectId, Box<dyn Error>> {
        log::info!("Writing git data: {} -> size: {}", obj.kind, obj.data.len());
        let mut store = &mut self.local_repository().objects;
        // It should refresh once even if the refresh mode is never, just to initialize the index
        //store.refresh_never();
        let object_id = store.write_buf(obj.kind, obj.data)?;
        log::info!("Writing git data - success");
        return Ok(object_id);
    }

    pub async fn fetch(&mut self, sha: &str, name: &str) -> Result<Vec<String>, Box<dyn Error>> {
        const REFS_HEAD_PREFIX: &str = "refs/heads/";
        if !name.starts_with(REFS_HEAD_PREFIX) {
            return Err("Error. Can not fetch an object without refs/heads/ prefix")?;
        }
        log::info!("Fetching sha: {} name: {}", sha, name);
        let branch: &str = {
            let mut iter = name.chars();
            iter.by_ref().nth(REFS_HEAD_PREFIX.len() - 1);
            iter.as_str()
        };
        log::info!("Calculate branch: {}", branch);
        let mut visited: HashSet<git_hash::ObjectId> = HashSet::new();
        macro_rules! guard {
            ($id:ident) => {
                if visited.contains(&$id) {
                    continue;
                }
                if $id.is_null() {
                    continue;
                }
                visited.insert($id.clone());
                if self.is_commit_in_local_cache(&$id) {
                    continue;
                }
            };
        }

        let mut commits_queue = VecDeque::<git_hash::ObjectId>::new();
        struct TreeObjectsQueueItem {
            pub path: String,
            pub oid: git_hash::ObjectId,
        }
        let mut tree_obj_queue = VecDeque::<TreeObjectsQueueItem>::new();
        let mut blobs_restore_plan = restore_blobs::BlobsRebuildingPlan::new();
        let sha = git_hash::ObjectId::from_str(sha)?;
        commits_queue.push_back(sha);
        loop {
            if let Some(id) = commits_queue.pop_front() {
                guard!(id);
                let address = &self.calculate_commit_address(&id).await?;
                let onchain_commit = blockchain::GoshCommit::load(&self.es_client, address).await?;
                log::info!("loaded onchain commit {}", id);
                let data = git_object::Data::new(
                    git_object::Kind::Commit,
                    onchain_commit.content.as_bytes(),
                );
                let obj = git_object::Object::from(data.decode()?).into_commit();
                log::info!("Received commit {}", id);
                let to_load = TreeObjectsQueueItem {
                    path: "".to_owned(),
                    oid: obj.tree.clone(),
                };
                tree_obj_queue.push_back(to_load);
                for parent_id in &obj.parents {
                    commits_queue.push_back(parent_id.clone());
                }
                self.write_git_object(obj).await?;
                continue;
            }
            if let Some(tree_node_to_load) = tree_obj_queue.pop_front() {
                let id = tree_node_to_load.oid;
                guard!(id);
                let path_to_node = tree_node_to_load.path;
                let tree_object_id = format!("{}", tree_node_to_load.oid);
                let remote_gosh_root_contract_address = &self.remote.gosh;
                let address = blockchain::Tree::calculate_address(
                    &self.es_client,
                    remote_gosh_root_contract_address,
                    &self.repo_addr,
                    &tree_object_id,
                )
                .await?;

                let onchain_tree_object = blockchain::Tree::load(&self.es_client, &address).await?;
                let tree_object: git_object::Tree = onchain_tree_object.into();

                log::info!("Tree obj parsed {}", id);
                for entry in &tree_object.entries {
                    let oid = entry.oid.clone();
                    match entry.mode {
                        git_object::tree::EntryMode::Tree => {
                            let to_load = TreeObjectsQueueItem {
                                path: format!("{}/{}", path_to_node, entry.filename),
                                oid,
                            };
                            tree_obj_queue.push_back(to_load);
                        }
                        git_object::tree::EntryMode::Commit => {
                            commits_queue.push_back(oid);
                        }
                        git_object::tree::EntryMode::Blob
                        | git_object::tree::EntryMode::BlobExecutable => {
                            let file_path = format!("{}/{}", path_to_node, entry.filename);
                            // Note:
                            // Removing prefixing "/" in the path
                            let snapshot_address = blockchain::Snapshot::calculate_address(
                                &self.es_client,
                                &self.repo_addr,
                                &branch,
                                &file_path[1..],
                            )
                            .await?;
                            blobs_restore_plan.mark_blob_to_restore(snapshot_address, oid);
                        }
                        _ => unimplemented!(),
                    }
                }
                self.write_git_object(tree_object).await?;
                continue;
            }
            break;
        }
        blobs_restore_plan.restore(self).await?;
        Ok(vec!["\n".to_owned()])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn testing_what_is_inside_the_snapshot_content() {}
}
