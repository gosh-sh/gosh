use super::GitHelper;
use crate::{
    blockchain,
    blockchain::{
        calculate_contract_address, get_contract_code, tag::load::TagObject,
        BlockchainContractAddress, BlockchainService, GetContractCodeResult,
    },
};
use git_odb::{Find, Write};

use std::{
    collections::{HashSet, VecDeque},
    str::FromStr,
    sync::Arc,
};
use anyhow::format_err;
use crate::blockchain::contract::{ContractRead, GoshContract};
use crate::blockchain::{GetNameBranchResult, gosh_abi};
use crate::git_helper::push::GetPreviousResult;

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
        tracing::info!(
            "Calculating commit address for repository {} and commit id <{}>",
            self.repo_addr,
            commit_id
        );
        let repo_contract = &mut self.blockchain.repo_contract().clone();
        blockchain::get_commit_address(&self.blockchain.client(), repo_contract, &commit_id).await
    }

    pub fn is_commit_in_local_cache(&self, object_id: &git_hash::ObjectId) -> bool {
        self.local_repository().objects.contains(object_id)
    }

    async fn write_git_object(
        &mut self,
        obj: impl git_object::WriteTo,
    ) -> anyhow::Result<git_hash::ObjectId> {
        tracing::info!("Writing git object");
        let store = &self.local_repository().objects;
        // It should refresh once even if the refresh mode is never, just to initialize the index
        //store.refresh_never();
        let object_id = store.write(obj).map_err(|e| {
            tracing::error!("Write git object failed  with: {}", e);
            e
        })?;
        tracing::info!("Writing git object - success, {}", object_id);
        Ok(object_id)
    }

    #[instrument(level = "debug", skip_all)]
    pub async fn fetch_ref(&mut self, sha: &str, name: &str) -> anyhow::Result<()> {
        const REFS_HEAD_PREFIX: &str = "refs/heads/";
        if !name.starts_with(REFS_HEAD_PREFIX) {
            anyhow::bail!("Error. Can not fetch an object without refs/heads/ prefix");
        }
        tracing::info!("Fetching sha: {} name: {}", sha, name);
        let branch: &str = {
            let mut iter = name.chars();
            iter.by_ref().nth(REFS_HEAD_PREFIX.len() - 1);
            iter.as_str()
        };
        tracing::debug!("Calculate branch: {}", branch);

        let context = self.blockchain.client();
        let remote_branches: Vec<String> = blockchain::branch_list(context, &self.repo_addr)
            .await?
            .branch_ref
            .iter()
            .map(|b| b.branch_name.clone())
            .collect();

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
        #[derive(Debug)]
        struct TreeObjectsQueueItem {
            pub path: String,
            pub oid: git_hash::ObjectId,
            pub branches: HashSet<String>,
        }
        let mut tree_obj_queue = VecDeque::<TreeObjectsQueueItem>::new();
        let mut blobs_restore_plan = restore_blobs::BlobsRebuildingPlan::new();
        let sha = git_hash::ObjectId::from_str(sha)?;
        commits_queue.push_back(sha);
        let mut dangling_trees = vec![];
        let mut dangling_commits = vec![];
        let mut next_commit_of_prev_version = None;
        loop {
            if blobs_restore_plan.is_available() {
                tracing::debug!("branch={branch}: Restoring blobs");
                blobs_restore_plan.restore(self).await?;
                blobs_restore_plan = restore_blobs::BlobsRebuildingPlan::new();
                continue;
            }
            if let Some(tree_node_to_load) = tree_obj_queue.pop_front() {
                tracing::debug!("branch={branch}: Loading tree: {:?}", tree_node_to_load);
                let id = tree_node_to_load.oid;
                tracing::debug!("branch={branch}: Loading tree: {}", id);
                guard!(id);
                tracing::debug!("branch={branch}: Ok. Guard passed. Loading tree: {}", id);
                let path_to_node = tree_node_to_load.path;
                let tree_object_id = format!("{}", tree_node_to_load.oid);
                let mut repo_contract = self.blockchain.repo_contract().clone();
                let address = blockchain::Tree::calculate_address(
                    &Arc::clone(self.blockchain.client()),
                    &mut repo_contract,
                    &tree_object_id,
                )
                .await?;

                let onchain_tree_object =
                    blockchain::Tree::load(&self.blockchain.client(), &address).await?;
                let tree_object: git_object::Tree = onchain_tree_object.into();

                tracing::debug!("branch={branch}: Tree obj parsed {}", id);
                for entry in &tree_object.entries {
                    let oid = entry.oid;
                    match entry.mode {
                        git_object::tree::EntryMode::Tree => {
                            tracing::debug!("branch={branch}: Tree entry: tree {}->{}", id, oid);
                            let to_load = TreeObjectsQueueItem {
                                path: format!("{}/{}", path_to_node, entry.filename),
                                oid,
                                branches: tree_node_to_load.branches.clone(),
                            };
                            tree_obj_queue.push_back(to_load);
                        }
                        git_object::tree::EntryMode::Commit => (),
                        git_object::tree::EntryMode::Blob
                        | git_object::tree::EntryMode::BlobExecutable => {
                            tracing::debug!("branch={branch}: Tree entry: blob {}->{}", id, oid);
                            let file_path = format!("{}/{}", path_to_node, entry.filename);
                            for branch in tree_node_to_load.branches.iter() {
                                let mut repo_contract = self.blockchain.repo_contract().clone();
                                let snapshot_address = blockchain::Snapshot::calculate_address(
                                    &Arc::clone(self.blockchain.client()),
                                    &mut repo_contract,
                                    branch,
                                    // Note:
                                    // Removing prefixing "/" in the path
                                    &file_path[1..],
                                )
                                    .await?;
                                let snapshot_contract = GoshContract::new(&snapshot_address, gosh_abi::SNAPSHOT);
                                let version: anyhow::Result<serde_json::Value> = snapshot_contract.run_static(
                                    self.blockchain.client(),
                                    "getVersion",
                                    None
                                ).await;
                                if version.is_err() {
                                    continue;
                                }
                                tracing::debug!(
                                    "branch={branch}: Adding a blob to search for. Path: {}, id: {}, snapshot: {}",
                                    file_path,
                                    oid,
                                    snapshot_address
                                );
                                blobs_restore_plan.mark_blob_to_restore(snapshot_address, oid);
                            }
                        }
                        _ => {
                            tracing::debug!("branch={branch}: IT MUST BE NOTED!");
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

            tracing::trace!("commits_queue={:?}", commits_queue);
            if let Some(id) = commits_queue.pop_front() {
                guard!(id);
                let address = &self.calculate_commit_address(&id).await?;
                let prev_repo: GetPreviousResult = self.blockchain
                    .repo_contract()
                    .read_state(self.blockchain.client(), "getPrevious", None)
                    .await?;
                let onchain_commit =
                    blockchain::GoshCommit::load(&self.blockchain.client(), address)
                        .await
                        .map_err(|e| {
                            format_err!(
                                "Failed to load commit with SHA=\"{},{}\". Error: {e}",
                                id.to_string(),
                                prev_repo.previous.map(|val| val.version).unwrap(),
                            )
                        })?;
                tracing::debug!("branch={branch}: loaded onchain commit {}", id);
                tracing::debug!("branch={branch} commit={id}: data {:?}", onchain_commit);
                let data = git_object::Data::new(
                    git_object::Kind::Commit,
                    onchain_commit.content.as_bytes(),
                );
                let obj = git_object::Object::from(data.decode()?).into_commit();
                tracing::debug!("branch={branch}: Received commit {}", id);

                let mut branches = HashSet::new();
                branches.insert(onchain_commit.branch.clone());
                // don't collect parent branches for deleted one
                if remote_branches.contains(&onchain_commit.branch) {
                    for parent in onchain_commit.parents.clone() {
                        let parent = BlockchainContractAddress::new(parent.address);
                        let parent_contract = GoshContract::new(&parent, gosh_abi::COMMIT);
                        let branch: GetNameBranchResult = parent_contract.run_static(
                            self.blockchain.client(),
                            "getNameBranch",
                            None
                        ).await?;
                        tracing::debug!("commit={id}: extracted branch {:?}", branch.name);
                        branches.insert(branch.name);
                    }
                } else {
                    branches.insert(branch.to_owned());
                }

                let to_load = TreeObjectsQueueItem {
                    path: "".to_owned(),
                    oid: obj.tree,
                    branches,
                };
                tracing::debug!("New tree root: {}", &to_load.oid);
                tree_obj_queue.push_back(to_load);
                if onchain_commit.initupgrade {
                    // Object can be first in the tree and have no parents
                    // if !obj.parents.is_empty() {
                    let prev_version = onchain_commit.parents[0].clone().version;
                    next_commit_of_prev_version = Some((id, prev_version));
                    tracing::trace!("next_commit_of_prev_version={:?}", next_commit_of_prev_version);
                    // }
                } else {
                    for parent_id in &obj.parents {
                        commits_queue.push_back(*parent_id);
                    }
                    dangling_commits.push(obj);
                }
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
        if next_commit_of_prev_version.is_some() {
            let (sha, version) = next_commit_of_prev_version.unwrap();
            return Err(format_err!("Was trying to call getCommit. SHA=\"{sha},{version}\""));
        }

        Ok(())
    }

    #[instrument(level = "trace", skip_all)]
    pub async fn fetch_tag(&mut self, sha: &str, tag_name: &str) -> anyhow::Result<()> {
        let client = self.blockchain.client();
        let GetContractCodeResult { code } =
            get_contract_code(client, &self.repo_addr, blockchain::ContractKind::Tag).await?;

        let address = calculate_contract_address(
            client,
            blockchain::ContractKind::Tag,
            &code,
            Some(serde_json::json!({ "_nametag": tag_name })),
        )
        .await?;

        let tag = crate::blockchain::tag::load::get_content(client, &address).await?;

        if let TagObject::Annotated(obj) = tag {
            let tag_object = git_object::Data::new(git_object::Kind::Tag, &obj.content);
            let store = self.local_repository().clone().objects;
            let tag_id = store.write_buf(tag_object.kind, tag_object.data)?;
        }

        Ok(())
    }

    #[instrument(level = "trace", skip_all)]
    pub async fn fetch(&mut self, sha: &str, name: &str) -> anyhow::Result<()> {
        tracing::debug!("fetch: sha={sha} ref={name}");
        let splitted: Vec<&str> = name.rsplitn(2, '/').collect();
        let result = match splitted[..] {
            [tag_name, "refs/tags"] => self.fetch_tag(sha, tag_name).await?,
            [_, "refs/heads"] => self.fetch_ref(sha, name).await?,
            _ => anyhow::bail!(
                "Error. Can not fetch an object without refs/heads/ or refs/tags/ prefixes"
            ),
        };

        Ok(result)
    }
}

#[cfg(test)]
mod tests {

    #[test]
    fn testing_what_is_inside_the_snapshot_content() {}
}
