use super::GitHelper;
use crate::{
    blockchain,
    blockchain::{
        calculate_contract_address, get_contract_code, tag::load::TagObject,
        BlockchainContractAddress, BlockchainService, GetContractCodeResult,
    },
};
use git_odb::{Find, Write};
use tokio::sync::Mutex;

use crate::blockchain::Tree;

use bstr::ByteSlice;
use std::{
    collections::{HashMap, HashSet, VecDeque},
    io::Write as IoWrite,
    str::FromStr,
    sync::Arc,
};

use crate::blockchain::tree::load::type_obj_to_entry_mod;
use git_object::tree::EntryMode;

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

    fn write_git_tree(&mut self, obj: &git_object::Tree) -> anyhow::Result<git_hash::ObjectId> {
        tracing::info!("Writing git tree object");
        let store = &self.local_repository().objects;
        // It should refresh once even if the refresh mode is never, just to initialize the index
        //store.refresh_never();
        let buf = serialize_tree(obj).map_err(|e| {
            tracing::error!("Serialization of git tree object failed with: {}", e);
            e
        })?;
        let object_id = store.write_buf(git_object::Kind::Tree, &buf).map_err(|e| {
            tracing::error!("Write git object failed with: {}", e);
            e
        })?;
        tracing::info!("Writing git object - success, {}", object_id);
        Ok(object_id)
    }

    fn write_git_object(
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
    pub async fn fetch_ref(
        &mut self,
        sha: &str,
        name: &str,
    ) -> anyhow::Result<Vec<(String, String)>> {
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

        // let mut visited: HashSet<git_hash::ObjectId> = HashSet::new();
        let visited: Arc<Mutex<HashSet<git_hash::ObjectId>>> = Arc::new(Mutex::new(HashSet::new()));
        let visited_ipfs: Arc<Mutex<HashMap<String, git_hash::ObjectId>>> =
            Arc::new(Mutex::new(HashMap::new()));
        macro_rules! guard {
            ($id:ident) => {{
                let visited = visited.lock().await;
                if visited.contains(&$id) {
                    continue;
                }
            }
            if $id.is_null() {
                continue;
            }
            {
                let mut visited = visited.lock().await;
                visited.insert($id.clone());
                if self.is_commit_in_local_cache(&$id) {
                    continue;
                }
            }};
        }

        let mut commits_queue = VecDeque::<git_hash::ObjectId>::new();
        #[derive(Debug)]
        struct TreeObjectsQueueItem {
            pub path: String,
            pub oid: git_hash::ObjectId,
            pub address: BlockchainContractAddress,
        }
        let mut tree_obj_queue = VecDeque::<TreeObjectsQueueItem>::new();
        let mut blobs_restore_plan = restore_blobs::BlobsRebuildingPlan::new();
        let sha = git_hash::ObjectId::from_str(sha)?;
        commits_queue.push_front(sha);

        let mut dangling_trees = vec![];
        let mut dangling_commits = vec![];
        let mut next_commit_of_prev_version = vec![];
        loop {
            tracing::trace!("commits_queue={:?}", commits_queue);
            if let Some(id) = commits_queue.pop_back() {
                guard!(id);
                let address = &self.calculate_commit_address(&id).await?;
                let onchain_commit =
                    match blockchain::GoshCommit::load(&self.blockchain.client(), address).await {
                        Ok(commit) => commit,
                        Err(e) => {
                            tracing::trace!("Failed to load commit in current version: {e}");
                            let version = self.find_commit(&id.to_string()).await?.version;
                            tracing::trace!(
                                "push to next_commit_of_prev_version=({},{})",
                                id,
                                version
                            );
                            next_commit_of_prev_version.push((version, id.to_string()));
                            continue;
                        }
                    };
                tracing::debug!("branch={branch}: loaded onchain commit {}", id);
                tracing::debug!(
                    "branch={branch} commit={id} addr={address}: data {:?}",
                    onchain_commit
                );
                let data = git_object::Data::new(
                    git_object::Kind::Commit,
                    onchain_commit.content.as_bytes(),
                );
                let obj = git_object::Object::from(data.decode()?).into_commit();
                tracing::debug!("Received commit {}", id);

                if onchain_commit.initupgrade {
                    // Object can be first in the tree and have no parents
                    let prev_version = onchain_commit.parents[0].clone().version;
                    tracing::trace!(
                        "push to next_commit_of_prev_version=({},{})",
                        id,
                        prev_version
                    );
                    next_commit_of_prev_version.push((prev_version, id.to_string()));
                } else {
                    let tree_address =
                        Tree::get_address_from_commit(self.blockchain.client(), &address).await?;

                    let to_load = TreeObjectsQueueItem {
                        path: "".to_owned(),
                        oid: obj.tree,
                        address: tree_address,
                    };
                    tracing::debug!("New tree root: {}", &to_load.oid);
                    tree_obj_queue.push_front(to_load);
                    for parent_id in &obj.parents {
                        commits_queue.push_front(*parent_id);
                    }
                    tracing::trace!("Push to dangling commits: {}", id);
                    dangling_commits.push(obj);
                }
                continue;
            }

            if !dangling_commits.is_empty() {
                tracing::trace!("Writing dangling commits");
                for obj in dangling_commits.iter().rev() {
                    self.write_git_object(obj)?;
                }
                dangling_commits.clear();
                continue;
            }
            break;
        }

        loop {
            if blobs_restore_plan.is_available() {
                let visited_ref = Arc::clone(&visited);
                let visited_ipfs_ref = Arc::clone(&visited_ipfs);
                tracing::debug!("branch={branch}: Restoring blobs");
                blobs_restore_plan
                    .restore(self, visited_ref, visited_ipfs_ref, branch)
                    .await?;
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
                let address = tree_node_to_load.address;

                let onchain_tree_object =
                    blockchain::Tree::load(self.blockchain.client(), &address).await?;

                for (_, tree_component) in &onchain_tree_object.objects {
                    let mode: EntryMode = type_obj_to_entry_mod(tree_component.type_obj.as_str());
                    let oid = git_hash::ObjectId::from_hex(tree_component.git_sha.as_bytes())
                        .expect("SHA1 must be correct");
                    match mode {
                        git_object::tree::EntryMode::Tree => {
                            tracing::debug!("branch={branch}: Tree entry: tree {}->{}", id, oid);
                            let repo_contract = self.blockchain.repo_contract().clone();
                            let sha_inner_tree =
                                tree_component
                                    .tvm_sha_tree
                                    .clone()
                                    .ok_or(anyhow::format_err!(
                                        "Failed to get sha of inner tree: {}",
                                        tree_component.git_sha
                                    ))?;
                            let sub_tree_address = Tree::calculate_address(
                                self.blockchain.client(),
                                &repo_contract,
                                &sha_inner_tree,
                            )
                            .await?;
                            let to_load = TreeObjectsQueueItem {
                                path: format!("{}{}/", path_to_node, tree_component.name),
                                oid,
                                address: sub_tree_address,
                            };
                            tree_obj_queue.push_back(to_load);
                        }
                        git_object::tree::EntryMode::Blob
                        | git_object::tree::EntryMode::BlobExecutable
                        | git_object::tree::EntryMode::Link => {
                            tracing::debug!("branch={branch}: Tree entry: blob {}->{}", id, oid);
                            let file_path = format!("{}{}", path_to_node, &tree_component.name);
                            let mut repo_contract = self.blockchain.repo_contract().clone();

                            let snapshot_address = blockchain::Snapshot::calculate_address(
                                &Arc::clone(self.blockchain.client()),
                                &mut repo_contract,
                                &tree_component.commit,
                                &file_path,
                            )
                            .await?;
                            // TODO can we exclude blob here if it already has visited?
                            tracing::debug!(
                                "branch={branch}: Adding a blob to search for. Path: {}, id: {}, snapshot: {}",
                                file_path,
                                oid,
                                snapshot_address
                            );
                            blobs_restore_plan.mark_blob_to_restore(snapshot_address, oid);
                        }
                        git_object::tree::EntryMode::Commit => (),
                        _ => {
                            unreachable!()
                        }
                    }
                }

                let tree_object: git_object::Tree = onchain_tree_object.into();

                tracing::trace!("Push to dangling tree: {}", tree_object_id);
                dangling_trees.push(tree_object);
                continue;
            }
            if !dangling_trees.is_empty() {
                tracing::trace!("Writing dangling trees");
                for obj in dangling_trees.iter().rev() {
                    self.write_git_tree(obj)?;
                }
                dangling_trees.clear();
            }
            break;
        }
        tracing::trace!(
            "next_commit_of_prev_version={:?}",
            next_commit_of_prev_version
        );

        Ok(next_commit_of_prev_version)
    }

    #[instrument(level = "trace", skip_all)]
    pub async fn fetch_tag(
        &mut self,
        sha: &str,
        tag_name: &str,
    ) -> anyhow::Result<Vec<(String, String)>> {
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

        Ok(vec![])
    }

    #[instrument(level = "trace", skip_all)]
    pub async fn fetch(&mut self, sha: &str, name: &str) -> anyhow::Result<Vec<(String, String)>> {
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

fn serialize_tree(tree: &git_object::Tree) -> anyhow::Result<Vec<u8>> {
    let mut buffer = vec![];
    let mut objects = tree.entries.clone();
    let names = objects
        .clone()
        .iter()
        .map(|entry| entry.filename.to_string())
        .collect::<Vec<String>>();
    tracing::trace!("Serialize tree before sort: {:?}", names);
    objects.sort_by(|l_obj, r_obj| {
        let l_name = match l_obj.mode {
            EntryMode::Tree => {
                format!("{}/", l_obj.filename)
            }
            _ => l_obj.filename.to_string(),
        };
        let r_name = match r_obj.mode {
            EntryMode::Tree => {
                format!("{}/", r_obj.filename)
            }
            _ => r_obj.filename.to_string(),
        };
        l_name.cmp(&r_name)
    });
    let names = objects
        .clone()
        .iter()
        .map(|entry| entry.filename.to_string())
        .collect::<Vec<String>>();
    tracing::trace!("Serialize tree after sort: {:?}", names);

    for git_object::tree::Entry {
        mode,
        filename,
        oid,
    } in &objects
    {
        buffer.write_all(mode.as_bytes())?;
        buffer.write_all(b" ")?;

        if filename.find_byte(b'\n').is_some() {
            anyhow::bail!("Newline in file name: {}", filename.to_string());
        }
        buffer.write_all(filename)?;
        buffer.write_all(&[b'\0'])?;

        buffer.write_all(oid.as_bytes())?;
    }

    Ok(buffer)
}

#[cfg(test)]
mod tests {

    #[test]
    fn testing_what_is_inside_the_snapshot_content() {}
}
