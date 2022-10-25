use super::GitHelper;
use crate::blockchain;
use crate::blockchain::BlockchainContractAddress;
use crate::blockchain::BlockchainService;
use git_odb::Find;
use git_odb::Write;

use std::collections::{HashSet, VecDeque};
use std::str::FromStr;
mod restore_blobs;

impl<Blockchain> GitHelper<Blockchain>
where
    Blockchain: BlockchainService,
{
    pub async fn calculate_commit_address(
        &mut self,
        commit_id: &git_hash::ObjectId,
    ) -> anyhow::Result<BlockchainContractAddress> {
        let commit_id = format!("{}", commit_id);
        log::info!(
            "Calculating commit address for repository {} and commit id <{}>",
            self.repo_addr,
            commit_id
        );
        let repo_contract = &mut self.repo_contract;
        blockchain::get_commit_address(&self.ever_client, repo_contract, &commit_id).await
    }

    pub fn is_commit_in_local_cache(&mut self, object_id: &git_hash::ObjectId) -> bool {
        return self.local_repository().objects.contains(object_id);
    }

    async fn write_git_object(
        &mut self,
        obj: impl git_object::WriteTo,
    ) -> anyhow::Result<git_hash::ObjectId> {
        log::info!("Writing git object");
        let store = &mut self.local_repository().objects;
        // It should refresh once even if the refresh mode is never, just to initialize the index
        //store.refresh_never();
        let object_id = store.write(obj).map_err(|e| {
            log::error!("Write git object failed  with: {}", e);
            e
        })?;
        log::info!("Writing git object - success, {}", object_id);
        Ok(object_id)
    }

    async fn write_git_data<'a>(
        &mut self,
        obj: git_object::Data<'a>,
    ) -> anyhow::Result<git_hash::ObjectId> {
        log::info!("Writing git data: {} -> size: {}", obj.kind, obj.data.len());
        let store = &mut self.local_repository().objects;
        // It should refresh once even if the refresh mode is never, just to initialize the index
        //store.refresh_never();
        let object_id = store.write_buf(obj.kind, obj.data)?;
        log::info!("Writing git data - success");
        Ok(object_id)
    }

    #[instrument(level = "debug")]
    pub async fn fetch(&mut self, sha: &str, name: &str) -> anyhow::Result<()> {
        const REFS_HEAD_PREFIX: &str = "refs/heads/";
        if !name.starts_with(REFS_HEAD_PREFIX) {
            anyhow::bail!("Error. Can not fetch an object without refs/heads/ prefix");
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
        let mut dangling_trees = vec![];
        let mut dangling_commits = vec![];
        loop {
            if blobs_restore_plan.is_available() {
                log::info!("Restoring blobs");
                blobs_restore_plan.restore(self).await?;
                blobs_restore_plan = restore_blobs::BlobsRebuildingPlan::new();
                continue;
            }
            if let Some(tree_node_to_load) = tree_obj_queue.pop_front() {
                let id = tree_node_to_load.oid;
                log::info!("Loading tree: {}", id);
                guard!(id);
                log::info!("Ok. Guard passed. Loading tree: {}", id);
                let path_to_node = tree_node_to_load.path;
                let tree_object_id = format!("{}", tree_node_to_load.oid);
                let address = blockchain::Tree::calculate_address(
                    &self.ever_client,
                    &mut self.repo_contract,
                    &tree_object_id,
                )
                .await?;

                let onchain_tree_object =
                    blockchain::Tree::load(&self.ever_client, &address).await?;
                let tree_object: git_object::Tree = onchain_tree_object.into();

                log::info!("Tree obj parsed {}", id);
                for entry in &tree_object.entries {
                    let oid = entry.oid;
                    match entry.mode {
                        git_object::tree::EntryMode::Tree => {
                            log::trace!("Tree entry: tree {}->{}", id, oid);
                            let to_load = TreeObjectsQueueItem {
                                path: format!("{}/{}", path_to_node, entry.filename),
                                oid,
                            };
                            tree_obj_queue.push_back(to_load);
                        }
                        git_object::tree::EntryMode::Commit => {
                            log::trace!("Tree entry: commit {}->{}", id, oid);
                            commits_queue.push_back(oid);
                        }
                        git_object::tree::EntryMode::Blob
                        | git_object::tree::EntryMode::BlobExecutable => {
                            log::trace!("Tree entry: blob {}->{}", id, oid);
                            let file_path = format!("{}/{}", path_to_node, entry.filename);

                            // Note:
                            // Removing prefixing "/" in the path
                            let snapshot_address = blockchain::Snapshot::calculate_address(
                                &self.ever_client,
                                &mut self.repo_contract,
                                branch,
                                &file_path[1..],
                            )
                            .await?;
                            log::info!(
                                "Adding a blob to search for. Path: {}, id: {}, snapshot: {}",
                                file_path,
                                oid,
                                snapshot_address
                            );
                            blobs_restore_plan.mark_blob_to_restore(snapshot_address, oid);
                        }
                        _ => {
                            log::info!("IT MUST BE NOTED!");
                            panic!();
                        }
                    }
                }
                dangling_trees.push(tree_object);
                continue;
            }
            if !dangling_trees.is_empty() {
                for obj in dangling_trees.iter().rev() {
                    self.write_git_object(obj).await?;
                }
                dangling_trees.clear();
            }

            if let Some(id) = commits_queue.pop_front() {
                guard!(id);
                let address = &self.calculate_commit_address(&id).await?;
                let onchain_commit =
                    blockchain::GoshCommit::load(&self.ever_client, address).await?;
                log::info!("loaded onchain commit {}", id);
                let data = git_object::Data::new(
                    git_object::Kind::Commit,
                    onchain_commit.content.as_bytes(),
                );
                let obj = git_object::Object::from(data.decode()?).into_commit();
                log::info!("Received commit {}", id);
                let to_load = TreeObjectsQueueItem {
                    path: "".to_owned(),
                    oid: obj.tree,
                };
                log::info!("New tree root: {}", &to_load.oid);
                tree_obj_queue.push_back(to_load);
                for parent_id in &obj.parents {
                    commits_queue.push_back(*parent_id);
                }
                dangling_commits.push(obj);
                continue;
            }

            if !dangling_commits.is_empty() {
                for obj in dangling_commits.iter().rev() {
                    self.write_git_object(obj).await?;
                }
                dangling_commits.clear();
                continue;
            }
            break;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {

    #[test]
    fn testing_what_is_inside_the_snapshot_content() {}
}
