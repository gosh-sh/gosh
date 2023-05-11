use super::GitHelper;
use crate::{
    blockchain::{
        branch::DeleteBranch,
        contract::{ContractRead, GoshContract},
        ZERO_SHA, MAX_ACCOUNTS_ADDRESSES_PER_QUERY,
        AddrVersion, BlockchainContractAddress, BlockchainService,
        GetNameCommitResult, get_commit_address, gosh_abi,
    },
    git_helper::push::create_branch::CreateBranchOperation,
};
use git_hash::{self, ObjectId};
use git_odb::Find;
use ton_client::net::ParamsOfQuery;
use std::{
    collections::{HashMap, HashSet},
    str::FromStr,
    sync::Arc,
    vec::Vec,
};

use tokio::sync::Semaphore;

pub mod create_branch;
mod parallel_diffs_upload_support;
mod utilities;
pub use utilities::ipfs_content::is_going_to_ipfs;
mod push_diff;
mod push_tag;
mod push_tree;
use push_tag::push_tag;
mod delete_tag;
mod parallel_snapshot_upload_support;

use delete_tag::delete_tag;
use parallel_diffs_upload_support::{ParallelDiff, ParallelDiffsUploadSupport};
use push_tree::push_tree;
use crate::git_helper::push::parallel_snapshot_upload_support::{ParallelCommit, ParallelCommitUploadSupport, ParallelSnapshot, ParallelSnapshotUploadSupport, ParallelTreeUploadSupport};

static PARALLEL_PUSH_LIMIT: usize = 1 << 6;

#[derive(Default)]
struct PushBlobStatistics {
    pub new_snapshots: u32,
    pub diffs: u32,
}

impl PushBlobStatistics {
    pub fn new() -> Self {
        Self {
            new_snapshots: 0,
            diffs: 0,
        }
    }

    /* pub fn add(&mut self, another: &Self) {
        self.new_snapshots += another.new_snapshots;
        self.diffs += another.diffs;
    } */
}

#[derive(Deserialize, Debug)]
pub struct GetPreviousResult {
    #[serde(rename = "value0")]
    pub previous: Option<AddrVersion>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct AccountStatus {
    #[serde(rename = "id")]
    pub address: String,
    #[serde(rename = "acc_type")]
    pub status: u8,
}

impl<Blockchain> GitHelper<Blockchain>
where
    Blockchain: BlockchainService + 'static,
{
    #[instrument(level = "info", skip_all)]
    async fn push_blob_update(
        &mut self,
        file_path: &str,
        original_blob_id: &ObjectId,
        next_state_blob_id: &ObjectId,
        commit_id: &ObjectId,
        branch_name: &str,
        statistics: &mut PushBlobStatistics,
        parallel_diffs_upload_support: &mut ParallelDiffsUploadSupport,
    ) -> anyhow::Result<()> {
        tracing::trace!("push_blob_update: file_path={file_path}, original_blob_id={original_blob_id}, next_state_blob_id={next_state_blob_id}, commit_id={commit_id}, branch_name={branch_name}");
        let file_diff = utilities::generate_blob_diff(
            &self.local_repository().objects,
            Some(original_blob_id),
            Some(next_state_blob_id),
        )
        .await?;
        let diff = ParallelDiff::new(
            *commit_id,
            branch_name.to_string(),
            *next_state_blob_id,
            file_path.to_string(),
            file_diff.original.clone(),
            file_diff.patch.clone(),
            file_diff.after_patch.clone(),
        );
        parallel_diffs_upload_support.push(self, diff).await?;
        statistics.diffs += 1;
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    async fn push_new_blob(
        &mut self,
        file_path: &str,
        blob_id: &ObjectId,
        commit_id: &ObjectId,
        branch_name: &str,
        statistics: &mut PushBlobStatistics,
        parallel_diffs_upload_support: &mut ParallelDiffsUploadSupport,
        parallel_snapshot_uploads: &mut ParallelSnapshotUploadSupport,
        upgrade_commit: bool,
    ) -> anyhow::Result<()> {
        {
            tracing::trace!("push_new_blob: file_path={file_path}, blob_id={blob_id}, commit_id={commit_id}, branch_name={branch_name}, upgrade_commit={upgrade_commit}");
            let blockchain = self.blockchain.clone();
            let repo_address = self.repo_addr.clone();
            let dao_addr = self.dao_addr.clone();
            let remote_network = self.remote.network.clone();
            let branch_name = branch_name.to_string();
            let file_path = file_path.to_string();
            let commit_str = commit_id.to_string();
            parallel_snapshot_uploads.add_to_push_list(self,
                ParallelSnapshot::new(
                    branch_name,
                    file_path,
                    upgrade_commit,
                    commit_str,
                )
            ).await?;
        }

        let file_diff =
            utilities::generate_blob_diff(&self.local_repository().objects, None, Some(blob_id))
                .await?;
        let diff = ParallelDiff::new(
            *commit_id,
            branch_name.to_string(),
            *blob_id,
            file_path.to_string(),
            file_diff.original.clone(),
            file_diff.patch.clone(),
            file_diff.after_patch.clone(),
        );
        parallel_diffs_upload_support.push(self, diff).await?;
        statistics.new_snapshots += 1;
        statistics.diffs += 1;
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    async fn push_blob_remove(
        &mut self,
        file_path: &str,
        blob_id: &ObjectId,
        commit_id: &ObjectId,
        branch_name: &str,
        statistics: &mut PushBlobStatistics,
        parallel_diffs_upload_support: &mut ParallelDiffsUploadSupport,
    ) -> anyhow::Result<()> {
        tracing::trace!("push_blob_remove: file_path={file_path}, blob_id={blob_id}, commit_id={commit_id}, branch_name={branch_name}");
        let file_diff =
            utilities::generate_blob_diff(&self.local_repository().objects, Some(blob_id), None)
                .await?;
        let diff = ParallelDiff::new(
            *commit_id,
            branch_name.to_string(),
            *blob_id,
            file_path.to_string(),
            file_diff.original.clone(),
            file_diff.patch.clone(),
            file_diff.after_patch.clone(),
        );
        parallel_diffs_upload_support.push(self, diff).await?;
        statistics.diffs += 1;
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    fn tree_root_for_commit(&mut self, commit_id: &ObjectId) -> ObjectId {
        tracing::trace!("tree_root_for_commit: commit_id={commit_id}");
        let mut buffer: Vec<u8> = Vec::new();
        return self
            .local_repository()
            .objects
            .try_find(commit_id, &mut buffer)
            .expect("odb must work")
            .expect("commit must be in the local repository")
            .decode()
            .expect("Commit is commit")
            .as_commit()
            .expect("It must be a commit object")
            .tree();
    }

    #[instrument(level = "info", skip_all)]
    fn get_parent_id(&self, commit_id: &ObjectId) -> anyhow::Result<ObjectId> {
        tracing::trace!("get_parent_id: commit_id={commit_id}");
        let mut buffer: Vec<u8> = Vec::new();
        let commit = self
            .local_repository()
            .objects
            .try_find(commit_id, &mut buffer)?
            .expect("Commit should exists");

        let raw_commit = String::from_utf8(commit.data.to_vec())?;

        let commit_iter = commit.try_into_commit_iter().unwrap();
        let parent_id = commit_iter.parent_ids().map(|e| e).into_iter().next();

        let parent_id = match parent_id {
            Some(value) => value,
            None => ObjectId::from_str(ZERO_SHA)?,
        };

        Ok(parent_id)
    }

    #[instrument(level = "info", skip_all)]
    async fn find_ancestor_commit_in_remote_repo(
        &self,
        remote_branch_name: &str,
        remote_commit_addr: BlockchainContractAddress,
    ) -> anyhow::Result<(String, Option<ObjectId>)> {
        tracing::trace!("find_ancestor_commit_in_remote_repo: remote_branch_name={remote_branch_name}, remote_commit_addr={remote_commit_addr}");
        let is_protected = self
            .blockchain
            .is_branch_protected(&self.repo_addr, remote_branch_name)
            .await?;
        if is_protected {
            anyhow::bail!(
                "This branch '{remote_branch_name}' is protected. \
                    Go to app.gosh.sh and create a proposal to apply this branch change."
            );
        }
        let remote_commit_addr =
            BlockchainContractAddress::todo_investigate_unexpected_convertion(remote_commit_addr);
        // let commit = self
        //     .blockchain
        //     .get_commit_by_addr(&remote_commit_addr)
        //     .await?
        //     .unwrap();
        // TODO: get commit can fail due to changes in versions
        let commit_contract = GoshContract::new(&remote_commit_addr, gosh_abi::COMMIT);
        let sha: GetNameCommitResult = commit_contract.run_static(self.blockchain.client(), "getNameCommit", None).await?;
        tracing::trace!("Commit sha: {sha:?}");
        let sha = sha.name;
        let prev_commit_id = Some(ObjectId::from_str(&sha)?);

        Ok((
            if sha != ZERO_SHA.to_owned() {
                sha
            } else {
                String::new()
            },
            prev_commit_id,
        ))
    }

    #[instrument(level = "trace")]
    async fn find_ancestor_commit(
        &self,
        from: git_repository::Id<'_>,
    ) -> anyhow::Result<Option<String>> {
        // TODO: this function works bad and returns ancestors in bad order
        // A
        // |\
        // | B
        // | C
        // | D
        // |/
        // E
        // Commits are returned in order A E B C D
        // We are trying to fix it by sorting by timestamp
        let walk = from
            .ancestors()
            .all()?
            .map(|e| e.expect("all entities should be present"))
            .into_iter();

        let mut ids = vec![];
        let commits: Vec<_> = walk.map(|a| { ids.push(a.clone().to_string()); a.object().unwrap().into_commit() }).collect();
        let query = r#"query($accounts: [String]!) {
            accounts(filter: {
                id: { in: $accounts }
            }) {
                id acc_type
            }
        }"#
        .to_owned();

        let client = self.blockchain.client();
        let repo_contract = &mut self.blockchain.repo_contract().clone();
        let mut map_id_addr = Vec::<(String, String)>::new();
        tracing::trace!("commits={commits:?}");

        for ids in ids.chunks(MAX_ACCOUNTS_ADDRESSES_PER_QUERY) {
            let mut addresses = Vec::<BlockchainContractAddress>::new();
            for id in ids {
                let commit_address = get_commit_address(client, repo_contract, id).await?;
                // let (version, commit_address) = self.find_commit(id).await?;
                addresses.push(commit_address.clone());
                map_id_addr.push((id.to_owned(), String::from(commit_address)));
            }
            let result = ton_client::net::query(
                Arc::clone(client),
                ParamsOfQuery {
                    query: query.clone(),
                    variables: Some(serde_json::json!({
                        "accounts": addresses
                    })),
                    ..Default::default()
                },
            )
            .await
            .map(|r| r.result)?;

            let raw_data = result["data"]["accounts"].clone();
            let existing_commits: Vec<AccountStatus> = serde_json::from_value(raw_data)?;
            tracing::trace!("existing_commits={existing_commits:?}");
            if existing_commits.is_empty() {
                // Extra case: there are no commits onchain, search for commit with no parents and return it
                for commit in commits {
                    if commit.parent_ids().peekable().peek().is_none() {
                        return Ok(Some(commit.id.to_string()));
                    }
                }
                panic!("Failed to find init commit in the local repo");
            }
            for commit in map_id_addr.iter().rev() {
                let mut ex_iter = existing_commits.iter();
                let pos = ex_iter.position(|x| x.address == commit.1 && x.status == 1);

                if pos.is_none() {
                    return Ok(Some(commit.0.clone()))
                }
            }
        }

        Ok(Some(from.to_string()))
    }

    #[instrument(level = "info", skip_all)]
    async fn check_parents<'a>(
        &mut self,
        object_id: ObjectId,
        remote_branch_name: &str,
        local_branch_name: &str,
    ) -> anyhow::Result<()> {
        tracing::trace!("check_parents object_id: {object_id} remote_branch_name: {remote_branch_name}, local_branch_name: {local_branch_name}");
        let mut buffer: Vec<u8> = Vec::new();
        let commit = self
            .local_repository()
            .objects
            .try_find(object_id, &mut buffer)?
            .expect("Commit should exists");

        let raw_commit = String::from_utf8(commit.data.to_vec())?;

        let commit_iter = commit.try_into_commit_iter().unwrap();
        let parent_ids: Vec<String> = commit_iter.parent_ids().map(|e| e.to_string()).collect();

        let mut repo_contract = self.blockchain.repo_contract().clone();

        for id in parent_ids {
            tracing::trace!("check parent: {id}");
            let parent = get_commit_address(
                &self.blockchain.client(),
                &mut repo_contract,
                &id.to_string(),
            )
                .await?;
            tracing::trace!("parent address: {parent}");
            let parent_contract = GoshContract::new(&parent, gosh_abi::COMMIT);

            if let Err(_) = parent_contract.get_version(self.blockchain.client()).await {
                let undeployed = ParallelDiffsUploadSupport::wait_contracts_deployed(&self.blockchain, &[parent]).await;
                if undeployed.is_err() || !undeployed.unwrap().is_empty() {
                    tracing::trace!("Failed to call parent");
                    let right_commit_address = if let Ok(res) = self.find_commit(&id).await {
                        res.1
                    } else {
                        // TODO: This situation happens because of wrong order of commits
                        // see comment before `get_list_of_commit_objects(latest_commit, ancestor_commit_object)`
                        // just skip check in this case
                        return Ok(());
                    };
                    let commit_contract = GoshContract::new(&right_commit_address, gosh_abi::COMMIT);
                    let branch: GetNameCommitResult = commit_contract.run_static(
                        self.blockchain.client(),
                        "getNameBranch",
                        None,
                    ).await?;
                    // TODO: local and remote branch are set equal here it can be wrong
                    self.check_and_upgrade_previous_commit(id.to_string(), &branch.name, &branch.name).await?;
                }
            }
        }
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    async fn push_commit_object<'a>(
        &mut self,
        oid: &'a str,
        object_id: ObjectId,
        remote_branch_name: &str,
        local_branch_name: &str,
        parents_of_commits: &mut HashMap<String, Vec<String>>,
        push_commits: &mut ParallelCommitUploadSupport,
        push_semaphore: Arc<Semaphore>,
        prev_commit_id: &mut Option<ObjectId>,
        statistics: &mut PushBlobStatistics,
        parallel_diffs_upload_support: &mut ParallelDiffsUploadSupport,
        parallel_snapshot_uploads: &mut ParallelSnapshotUploadSupport,
        upgrade_commit: bool,
        parents_for_upgrade: Vec<AddrVersion>,
    ) -> anyhow::Result<()> {
        tracing::trace!("push_commit_object: object_id={object_id}, remote_branch_name={remote_branch_name}, local_branch_name={local_branch_name}, prev_commit_id={prev_commit_id:?}");
        let mut buffer: Vec<u8> = Vec::new();
        let commit = self
            .local_repository()
            .objects
            .try_find(object_id, &mut buffer)?
            .expect("Commit should exists");

        let raw_commit = String::from_utf8(commit.data.to_vec())?;

        let mut commit_iter = commit.try_into_commit_iter().unwrap();
        let tree_id = commit_iter.tree_id()?;
        let mut parent_ids: Vec<String> = commit_iter.parent_ids().map(|e| e.to_string()).collect();
        if !parent_ids.is_empty() {
            parents_of_commits.insert(oid.to_owned(), parent_ids.clone());
        } else {
            parents_of_commits.insert(oid.to_owned(), vec![ZERO_SHA.to_owned()]);
            // if parent_ids is empty, add bogus parent
            parent_ids.push(ZERO_SHA.to_string());
        }
        let mut parents: Vec<AddrVersion> = vec![];
        let mut repo_contract = self.blockchain.repo_contract().clone();

        for id in parent_ids {
            let parent = get_commit_address(
                &self.blockchain.client(),
                &mut repo_contract,
                &id.to_string(),
            )
            .await?;
            let parent_contract = GoshContract::new(&parent, gosh_abi::COMMIT);
            let version = parent_contract.get_version(self.blockchain.client()).await.unwrap_or(env!("BUILD_SUPPORTED_VERSION").to_string());
            parents.push(AddrVersion { address: parent, version });
        }
        if upgrade_commit && !parents_for_upgrade.is_empty() {
            parents = parents_for_upgrade;
        }
        let tree_addr = self.calculate_tree_address(tree_id).await?;

        {
            let blockchain = self.blockchain.clone();
            let remote = self.remote.clone();
            let dao_addr = self.dao_addr.clone();
            let object_id = object_id.clone();
            let tree_addr = tree_addr.clone();
            let branch_name = remote_branch_name.to_owned().clone();

            push_commits.add_to_push_list(self, ParallelCommit::new(object_id, branch_name, tree_addr, raw_commit, parents, upgrade_commit), push_semaphore.clone()).await?;

        }

        let tree_diff = utilities::build_tree_diff_from_commits(
            self.local_repository(),
            prev_commit_id.clone().to_owned(),
            object_id,
        )?;
        for added in tree_diff.added {
            self.push_new_blob(
                &added.filepath.to_string(),
                &added.oid,
                &object_id,
                local_branch_name,
                statistics,
                parallel_diffs_upload_support,
                parallel_snapshot_uploads,
                upgrade_commit,
            )
            .await?;
        }
        if !upgrade_commit {
            for update in tree_diff.updated {
                self.push_blob_update(
                    &update.1.filepath.to_string(),
                    &update.0.oid,
                    &update.1.oid,
                    &object_id, // commit_id.as_ref().unwrap(),
                    local_branch_name,
                    statistics,
                    parallel_diffs_upload_support,
                )
                .await?;
            }

            for deleted in tree_diff.deleted {
                self.push_blob_remove(
                    &deleted.filepath.to_string(),
                    &deleted.oid,
                    &object_id,
                    local_branch_name,
                    statistics,
                    parallel_diffs_upload_support,
                )
                .await?;
            }
        }
        *prev_commit_id = Some(object_id);
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    async fn check_and_upgrade_previous_commit(
        &mut self,
        ancestor_commit: String,
        local_branch_name: &str,
        remote_branch_name: &str,
    ) -> anyhow::Result<()> {
        // check in cur repo if account with commit exists   eg call get version
        // if not found need to init upgrade commit
        // can get list of objects and push the last commit and objects
        // last commit should be redeployed with flag init_upgrade
        // tree for last commit should be redeployed ans addr of new tree goes to commit constructor
        // parent for commit should be prev version of the same commit
        // snapshot should be deployed with content of the last snapshot and new addr of commit

        tracing::trace!("check and upgrade previous commit: {ancestor_commit} {local_branch_name} {remote_branch_name}");

        // 1) get ancestor commit address
        let mut repo_contract = self.blockchain.repo_contract().clone();
        let ancestor_address = get_commit_address(
            &self.blockchain.client(),
            &mut repo_contract,
            &ancestor_commit,
        )
            .await?;
        tracing::trace!("ancestor address: {ancestor_address}");

        // 2) Check that ancestor contract exists
        let ancestor_contract = GoshContract::new(&ancestor_address, gosh_abi::COMMIT);
        // if ancestor is valid return
        let res = ancestor_contract
            .get_version(self.blockchain.client())
            .await;
        if let Ok(_) = res {
            return Ok(());
        }

        // If ancestor commit doesn't exist we need to deploy a new version of the commit with init_upgrade flag set to true
        tracing::trace!("Failed to get contract version: {res:?}");

        // 3) Get address of the previous version of the repo
        let previous: GetPreviousResult = self
            .blockchain
            .repo_contract()
            .read_state(self.blockchain.client(), "getPrevious", None)
            .await?;
        tracing::trace!("prev repo addr: {previous:?}");

        // 4) Get address of the ancestor commit of previous version
        let previous_repo_addr = previous.previous.clone()
            .ok_or(anyhow::format_err!("Failed to get previous version of the repo"))?
            .address;
        let mut prev_repo_contract = GoshContract::new(&previous_repo_addr, gosh_abi::REPO);
        let prev_ancestor_address = get_commit_address(
            &self.blockchain.client(),
            &mut prev_repo_contract,
            &ancestor_commit,
        )
            .await?;
        tracing::trace!("prev ver ancestor commit address: {prev_ancestor_address}");

        // 5) get previous version commit data
        // let commit = get_commit_by_addr(self.blockchain.client(), &prev_ancestor_address)
        //     .await?
        //     .unwrap();
        // tracing::trace!("Prev version commit data: {commit:?}");

        // 6) For new version ancestor commit set parent to the ancestor commit of previous version
        let parents_for_upgrade = vec![
            AddrVersion { address: prev_ancestor_address.clone(), version: previous.previous.unwrap().version}
        ];
        let ancestor_id = self
            .local_repository()
            .find_object(ObjectId::from_str(&ancestor_commit)?)?
            .id();

        // 7) Get id of the next commit
        let till_id = ancestor_id
            .ancestors()
            .all()?
            .map(|e| e.expect("all entities should be present"))
            .into_iter()
            .skip(1)
            .next()
            .map(|id| id.object().expect("object should exist").id);

        // 8) Get list of objects to push with the ancestor commit
        tracing::trace!("Find objects till: {till_id:?}");
        let commit_objects_list = get_list_of_commit_objects(ancestor_id, till_id)?;
        tracing::trace!("List of commit objects: {commit_objects_list:?}");

        // 9) push objects
        let mut push_commits= ParallelCommitUploadSupport::new();
        let push_semaphore = Arc::new(Semaphore::new(PARALLEL_PUSH_LIMIT));
        // let mut parallel_snapshot_uploads: JoinSet<anyhow::Result<()>> = JoinSet::new();
        let mut parallel_tree_uploads = ParallelTreeUploadSupport::new();
        let mut parallel_snapshot_uploads = ParallelSnapshotUploadSupport::new();
        let mut parents_of_commits: HashMap<String, Vec<String>> =
            HashMap::from([(ZERO_SHA.to_owned(), vec![]), ("".to_owned(), vec![])]);
        let mut visited_trees: HashSet<ObjectId> = HashSet::new();
        let mut statistics = PushBlobStatistics::new();

        let latest_commit_id = self
            .local_repository()
            .find_object(ObjectId::from_str(&ancestor_commit)?)?
            .id;
        let mut parallel_diffs_upload_support = ParallelDiffsUploadSupport::new(&latest_commit_id);

        // iterate through the git objects list and push them
        let mut prev_commit_id = None;
        for oid in &commit_objects_list {
            let object_id = git_hash::ObjectId::from_str(oid)?;
            let object_kind = self.local_repository().find_object(object_id)?.kind;
            match object_kind {
                git_object::Kind::Commit => {
                    // TODO: fix lifetimes (oid can be trivially inferred from object_id)
                    self.push_commit_object(
                        oid,
                        object_id,
                        remote_branch_name,
                        local_branch_name,
                        &mut parents_of_commits,
                        &mut push_commits,
                        push_semaphore.clone(),
                        &mut prev_commit_id,
                        &mut statistics,
                        &mut parallel_diffs_upload_support,
                        &mut parallel_snapshot_uploads,
                        true,
                        parents_for_upgrade.clone(),
                    )
                    .await?;
                }
                git_object::Kind::Blob => {
                    // Note: handled in the Commit section
                    // branch
                    // commit_id
                    // commit_data
                    // Vec<diff>
                }
                // Not supported yet
                git_object::Kind::Tag => unimplemented!(),
                git_object::Kind::Tree => {
                    let _ = push_tree(
                        self,
                        &object_id,
                        &mut visited_trees,
                        &mut parallel_tree_uploads,
                        push_semaphore.clone(),
                    )
                    .await?;
                }
            }
        }

        // wait for all spawned collections to finish
        parallel_diffs_upload_support.push_dangling(self).await?;
        parallel_diffs_upload_support
            .wait_all_diffs(self.blockchain.clone())
            .await?;


        // 10) call set commit to the new version of the ancestor commit
        self.blockchain
            .notify_commit(
                &latest_commit_id,
                local_branch_name,
                1,
                1,
                &self.remote,
                &self.dao_addr,
                true,
            )
            .await?;

        Ok(())
    }

    // find ancestor commit
    #[instrument(level = "trace", skip_all)]
    async fn push_ref(&mut self, local_ref: &str, remote_ref: &str) -> anyhow::Result<String> {
        // Note:
        // Here is the problem. We have file snapshot per branch per path.
        // However in git file is not attached to a branch neither it is bound to a path.
        // Our first approach was to take what objects are different in git.
        // This led to a problem that some files were copied from one place to another
        // and snapshots were not created since git didn't count them as changed.
        // Our second attempt is to calculated tree diff from one commit to another.
        tracing::debug!("push_ref {} : {}", local_ref, remote_ref);
        let local_branch_name: &str = get_ref_name(local_ref)?;
        let remote_branch_name: &str = get_ref_name(remote_ref)?;

        // 1. Check if branch exists and ready in the blockchain
        let remote_commit_addr = self
            .blockchain
            .remote_rev_parse(&self.repo_addr, remote_branch_name)
            .await?
            .map(|pair| pair.0);

        // 2. Find ancestor commit in local repo

        // find ancestor commit in remote repo, if the remote branch was found
        let (mut ancestor_commit_id, mut prev_commit_id) =
            if let Some(remote_commit_addr) = remote_commit_addr {
                self.find_ancestor_commit_in_remote_repo(remote_branch_name, remote_commit_addr)
                    .await?
            } else {
                // prev_commit_id is not filled up here. It's Ok.
                // this means a branch is created and all initial states are filled there
                ("".to_owned(), None)
            };
        let mut ancestor_commit_object = if ancestor_commit_id != "" {
            Some(ObjectId::from_str(&ancestor_commit_id)?)
        } else {
            None
        };

        // if ancestor_commit_id != "" {
        //     self.check_and_upgrade_previous_commit(
        //         ancestor_commit_id.clone(),
        //         local_branch_name,
        //         remote_branch_name,
        //     )
        //     .await?;
        // }

        let latest_commit = self
            .local_repository()
            .find_reference(local_ref)?
            .into_fully_peeled_id()?;
        // get list of git objects in local repo, excluding ancestor ones
        // TODO: list of commits is not in right order in case of merge commit with commits at the same time
        //
        // C
        // |\
        // | B
        // |/
        // A
        // B can come before A and remote can't find parent version for B
        let mut parents_of_commits: HashMap<String, Vec<String>> =
            HashMap::from([(ZERO_SHA.to_owned(), vec![]), ("".to_owned(), vec![])]);
        // 3. If branch needs to be created do so
        if prev_commit_id.is_none() {
            //    ---
            //    Otherwise check if a head of the branch
            //    is pointing to the ancestor commit. Fail
            //    if it doesn't
            let originating_commit = self.find_ancestor_commit(latest_commit).await?.unwrap();
            let originating_commit = git_hash::ObjectId::from_str(&originating_commit)?;

            let branching_point = self.get_parent_id(&originating_commit)?;
            ancestor_commit_object = Some(branching_point);
            let mut create_branch_op =
                CreateBranchOperation::new(branching_point, remote_branch_name, self);
            let is_first_ever_branch = create_branch_op.run().await?;
            prev_commit_id = {
                if is_first_ever_branch {
                    None
                } else {
                    ancestor_commit_id = branching_point.to_string().clone();
                    parents_of_commits.insert(
                        originating_commit.to_hex().to_string(),
                        vec![ancestor_commit_id]
                    );
                    ancestor_commit_object
                }
            };
        }
        // get list of git objects in local repo, excluding ancestor ones
        let commit_and_tree_list =
            get_list_of_commit_objects(latest_commit, ancestor_commit_object)?;

        // 4. Do prepare commit for all commits
        // 5. Deploy tree objects of all commits
        // 6. Deploy all **new** snapshot
        // 7. Deploy diff contracts
        // 8. Deploy all commit objects

        // create collections for spawned tasks and statistics
        let mut push_commits = ParallelCommitUploadSupport::new();
        let push_semaphore = Arc::new(Semaphore::new(PARALLEL_PUSH_LIMIT));
        let mut parallel_snapshot_uploads = ParallelSnapshotUploadSupport::new();
        let mut parallel_tree_uploads = ParallelTreeUploadSupport::new();
        let mut visited_trees: HashSet<ObjectId> = HashSet::new();
        let mut statistics = PushBlobStatistics::new();

        let latest_commit_id = latest_commit.object()?.id;
        tracing::trace!("latest commit id {latest_commit_id}");
        let mut parallel_diffs_upload_support = ParallelDiffsUploadSupport::new(&latest_commit_id);

        // iterate through the git objects list and push them
        for oid in &commit_and_tree_list {
            let object_id = git_hash::ObjectId::from_str(oid)?;
            let object_kind = self.local_repository().find_object(object_id)?.kind;
            match object_kind {
                git_object::Kind::Commit => {
                    // TODO: fix lifetimes (oid can be trivially inferred from object_id)
                    self.check_parents(
                        object_id,
                        remote_branch_name,
                        local_branch_name,
                    ).await?;
                    self.push_commit_object(
                        oid,
                        object_id,
                        remote_branch_name,
                        local_branch_name,
                        &mut parents_of_commits,
                        &mut push_commits,
                        push_semaphore.clone(),
                        &mut prev_commit_id,
                        &mut statistics,
                        &mut parallel_diffs_upload_support,
                        &mut parallel_snapshot_uploads,
                        false,
                        vec![],
                    )
                    .await?;
                }
                git_object::Kind::Blob => {
                    // Note: handled in the Commit section
                    // branch
                    // commit_id
                    // commit_data
                    // Vec<diff>
                }
                // Not supported yet
                git_object::Kind::Tag => unimplemented!(),
                git_object::Kind::Tree => {
                    let _ = push_tree(
                        self,
                        &object_id,
                        &mut visited_trees,
                        &mut parallel_tree_uploads,
                        push_semaphore.clone(),
                    )
                    .await?;
                }
            }
        }

        let mut expected_contracts = vec![];
        // wait for all spawned collections to finish
        parallel_diffs_upload_support.push_dangling(self).await?;
        let number_of_files_changed = parallel_diffs_upload_support.get_parallels_number();
        let mut attempts = 0;
        let mut last_rest_cnt = 0;
        while attempts < 3 {
            attempts += 1;
            expected_contracts = parallel_diffs_upload_support
                .wait_all_diffs(self.blockchain.clone())
                .await?;
            tracing::trace!("Wait all diffs result: {expected_contracts:?}");
            if expected_contracts.is_empty() {
                break;
            }
            if expected_contracts.len() != last_rest_cnt {
                attempts = 0;
            }
            last_rest_cnt = expected_contracts.len();
            tracing::trace!("Restart deploy on undeployed diffs");
            let expected = parallel_diffs_upload_support.get_expected().to_owned();
            parallel_diffs_upload_support = ParallelDiffsUploadSupport::new(&latest_commit_id);
            for address in expected_contracts.clone() {
                tracing::trace!("Get params of undeployed diff: {}", address);
                let (coord, parallel, is_last) = expected.get(&address).ok_or(anyhow::format_err!("Failed to get diff params"))?.clone();
                // parallel_diffs_upload_support.push(self, diff).await?;
                parallel_diffs_upload_support.add_to_push_list(self, &coord, &parallel, is_last).await?;
            }
            parallel_diffs_upload_support.push_dangling(self).await?;
        }
        if attempts == 3 {
            anyhow::bail!("Failed to deploy all diffs. Undeployed diffs: {expected_contracts:?}")
        }

        let mut attempts = 0;
        let mut last_rest_cnt = 0;
        while attempts < 3 {
            attempts += 1;
            expected_contracts = parallel_snapshot_uploads
                .wait_all_snapshots(self.blockchain.clone())
                .await?;
            tracing::trace!("Wait all snapshots result: {expected_contracts:?}");
            if expected_contracts.is_empty() {
                break;
            }
            if expected_contracts.len() != last_rest_cnt {
                attempts = 0;
            }
            last_rest_cnt = expected_contracts.len();
            tracing::trace!("Restart deploy on undeployed snapshots");
            let expected = parallel_snapshot_uploads.get_expected().to_owned();
            parallel_snapshot_uploads = ParallelSnapshotUploadSupport::new();
            for address in expected_contracts.clone() {
                let snapshot = expected.get(&address).ok_or(anyhow::format_err!("Failed to get diff params"))?.clone();
                tracing::trace!("Get params of undeployed snapshot: {} {:?}", address, snapshot);
                parallel_snapshot_uploads.add_to_push_list(self, snapshot).await?;
            }
        }
        if attempts == 3 {
            anyhow::bail!("Failed to deploy all snapshots. Undeployed snapshots: {expected_contracts:?}")
        }

        let mut attempts = 0;
        let mut last_rest_cnt = 0;
        while attempts < 3 {
            attempts += 1;
            expected_contracts = parallel_tree_uploads
                .wait_all_trees(self.blockchain.clone())
                .await?;
            tracing::trace!("Wait all trees result: {expected_contracts:?}");
            if expected_contracts.is_empty() {
                break;
            }
            if expected_contracts.len() != last_rest_cnt {
                attempts = 0;
            }
            last_rest_cnt = expected_contracts.len();
            tracing::trace!("Restart deploy on undeployed trees");
            let expected = parallel_tree_uploads.get_expected().to_owned();
            parallel_tree_uploads = ParallelTreeUploadSupport::new();
            for address in expected_contracts.clone() {
                let tree = expected.get(&address).ok_or(anyhow::format_err!("Failed to get diff params"))?.clone();
                tracing::trace!("Get params of undeployed tree: {} {:?}", address, tree.tree_id);
                parallel_tree_uploads.add_to_push_list(self, tree, push_semaphore.clone()).await?;
            }
        }
        if attempts == 3 {
            anyhow::bail!("Failed to deploy all trees. Undeployed trees: {expected_contracts:?}")
        }

        let mut attempts = 0;
        let mut last_rest_cnt = 0;
        while attempts < 3 {
            attempts += 1;
            expected_contracts = push_commits
                .wait_all_commits(self.blockchain.clone())
                .await?;
            tracing::trace!("Wait all commits result: {expected_contracts:?}");
            if expected_contracts.is_empty() {
                break;
            }
            if expected_contracts.len() != last_rest_cnt {
                attempts = 0;
            }
            last_rest_cnt = expected_contracts.len();
            tracing::trace!("Restart deploy on undeployed commits");
            let expected = push_commits.get_expected().to_owned();
            push_commits = ParallelCommitUploadSupport::new();
            for address in expected_contracts.clone() {
                let commit = expected.get(&address).ok_or(anyhow::format_err!("Failed to get diff params"))?.clone();
                tracing::trace!("Get params of undeployed tree: {} {:?}", address, commit.commit_id);
                push_commits.add_to_push_list(self, commit, push_semaphore.clone()).await?;
            }
        }
        if attempts == 3 {
            anyhow::bail!("Failed to deploy all commits. Undeployed commits: {expected_contracts:?}")
        }

        // 9. Set commit (move HEAD)
        ancestor_commit_id = match ancestor_commit_object {
            Some(v) => v.to_string(),
            None => "".to_owned(),
        };

        let number_of_commits = calculate_left_distance(
            parents_of_commits,
            &latest_commit_id.clone().to_string(),
            &ancestor_commit_id,
        );
        self.blockchain
            .notify_commit(
                &latest_commit_id,
                local_branch_name,
                number_of_files_changed,
                number_of_commits,
                &self.remote,
                &self.dao_addr,
                false,
            )
            .await?;

        // 10. move HEAD
        //
        let result_ok = format!("ok {remote_ref}\n");
        Ok(result_ok)
    }

    #[instrument(level = "trace", skip(self))]
    async fn push_ref_tag(&mut self, local_ref: &str, remote_ref: &str) -> anyhow::Result<String> {
        tracing::debug!("push_tag {} : {}", local_ref, remote_ref);
        let tag_name: &str = get_ref_name(local_ref)?;

        let commit_id = self
            .local_repository()
            .find_reference(tag_name)?
            .into_fully_peeled_id()?
            .detach();

        let mut buffer: Vec<u8> = Vec::new();
        let ref_obj = self
            .local_repository()
            .refs
            .try_find(local_ref)?
            .expect("Tag should exists");

        let tag_content = if commit_id.to_string() != ref_obj.target.id().to_string() {
            let tag_obj = self
                .local_repository()
                .objects
                .try_find(ref_obj.target.id(), &mut buffer)?
                .unwrap();
            format!(
                "id {}\n{}",
                ref_obj.target.id().to_string(),
                String::from_utf8(tag_obj.data.to_vec())?
            )
        } else {
            format!("tag {tag_name}\nobject {commit_id}\n")
        };

        let blockchain = self.blockchain.clone();
        let remote_network = self.remote.network.clone();
        let dao_addr = self.dao_addr.clone();
        let repo_name = self.remote.repo.clone();

        push_tag(
            &self.blockchain,
            &remote_network,
            &dao_addr,
            &repo_name,
            tag_name,
            &commit_id,
            &tag_content,
        )
        .await?;

        let result_ok = format!("ok {remote_ref}\n");
        Ok(result_ok)
    }

    #[instrument(level = "trace", skip_all)]
    pub async fn push(&mut self, refs: &str) -> anyhow::Result<String> {
        tracing::debug!("push: refs={refs}");
        let splitted: Vec<&str> = refs.split(':').collect();
        let result = match splitted.as_slice() {
            ["", remote_tag] if remote_tag.starts_with("refs/tags") => {
                self.delete_remote_tag(remote_tag).await?
            }
            ["", remote_ref] => {
                self.delete_remote_ref(remote_ref).await?
            },
            [local_tag, remote_tag] if local_tag.starts_with("refs/tags") => {
                self.push_ref_tag(local_tag, remote_tag).await?
            }
            [local_ref, remote_ref] => {
                self.push_ref(local_ref, remote_ref).await?
            },
            _ => unreachable!(),
        };
        tracing::debug!("push ref result: {result}");
        Ok(result)
    }

    async fn delete_remote_ref(&mut self, remote_ref: &str) -> anyhow::Result<String> {
        let branch_name: &str = get_ref_name(remote_ref)?;

        let wallet = self
                .blockchain
                .user_wallet(&self.dao_addr, &self.remote.network)
                .await?;

            DeleteBranch::delete_branch(
                &self.blockchain,
                &wallet,
                self.remote.repo.clone(),
                branch_name.to_string(),
            )
            .await?;
        Ok(format!("ok {remote_ref}\n"))
    }

    async fn delete_remote_tag(&mut self, remote_ref: &str) -> anyhow::Result<String> {
        tracing::debug!("delete_remote_tag {remote_ref}");
        let tag_name: &str = get_ref_name(remote_ref)?;

        let blockchain = self.blockchain.clone();
        let remote_network = self.remote.network.clone();
        let dao_addr = self.dao_addr.clone();
        let repo_name = self.remote.repo.clone();

        delete_tag(
            &blockchain,
            &remote_network,
            &dao_addr,
            &repo_name,
            &tag_name,
        )
        .await?;

        Ok(format!("ok {remote_ref}\n"))
    }
}

fn get_ref_name(_ref: &str) -> anyhow::Result<&str> {
    let mut iter = _ref.rsplit('/');
    iter.next()
        .ok_or(anyhow::anyhow!("wrong ref format '{}'", &_ref))
}

#[instrument(level = "info", skip_all)]
fn calculate_left_distance(m: HashMap<String, Vec<String>>, from: &str, till: &str) -> u64 {
    tracing::trace!("calculate_left_distance: from={from}, till={till}");
    if from == till {
        return 1u64;
    }

    let mut distance = 0u64;
    let mut commit = from;

    loop {
        if !m.contains_key(commit) {
            break 0;
        }
        let parents = m.get(commit).unwrap();
        if let Some(parent) = parents.get(0) {
            distance += 1;

            if parent == till {
                break distance;
            }
            commit = &parent.as_str();
        } else {
            break distance;
        }
    }
}

#[instrument(level = "trace")]
fn get_list_of_commit_objects(
    start: git_repository::Id,
    till: Option<ObjectId>,
) -> anyhow::Result<Vec<String>> {
    let walk = start
        .ancestors()
        .all()?
        .map(|e| e.expect("all entities should be present"))
        .into_iter();

    let commits: Vec<git_repository::Id> = match till {
        None => walk.into_iter().collect(),
        Some(id) => walk
            .take_while(|e| e.object().expect("object should exist").id != id)
            .into_iter()
            .collect(),
    };

    let mut res = Vec::new();
    // observation from `git rev-list --reverse`
    // 1) commits are going in reverse order (from old to new)
    // 2) but for each commit tree elements are going in BFS order
    //
    // so if we just rev() commits we'll have topological order for free
    for commit in commits.iter().rev() {
        let commit = commit.object()?.into_commit();
        res.push(commit.id.to_string());
        let tree = commit.tree()?;
        res.push(tree.id.to_string());
        // res.extend(
        //     tree.traverse()
        //         .breadthfirst
        //         .files()?
        //         .iter()
        //         // IMPORTANT: ignore blobs because later logic skips blobs too
        //         // but might change in the future refactorings
        //         .filter(|e| !e.mode.is_blob())
        //         .into_iter()
        //         .map(|e| e.oid.to_string()),
        // );
    }
    Ok(res)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::logger::test_utils::{init_logger, shutdown_logger};
    use crate::{
        blockchain::{self, service::tests::MockEverscale},
        git_helper::{test_utils::setup_repo, tests::setup_test_helper},
    };

    #[test]
    fn ensure_calc_left_dist_correctly() {
        let m = HashMap::from([
            (
                "7986a9690ed067dc1a917b6df10342a5b9129e0b".to_owned(),
                vec![ZERO_SHA.to_owned()],
            ),
            (ZERO_SHA.to_owned(), vec![]),
        ]);
        let dist = calculate_left_distance(m, "7986a9690ed067dc1a917b6df10342a5b9129e0b", "");
        assert_eq!(dist, 1);

        let m = HashMap::from([
            (
                "5c39d86543b994882f83689fbfa79b952fa8e711".to_owned(),
                vec!["d043874c7e470206ddf62f21b7c7d23a6792a8f5".to_owned()],
            ),
            (
                "d043874c7e470206ddf62f21b7c7d23a6792a8f5".to_owned(),
                vec!["16798be2e82bc8ec3d64c27352b05d0c6552c83c".to_owned()],
            ),
            (
                "16798be2e82bc8ec3d64c27352b05d0c6552c83c".to_owned(),
                vec![ZERO_SHA.to_owned()],
            ),
            (ZERO_SHA.to_owned(), vec![]),
        ]);
        let dist = calculate_left_distance(m, "5c39d86543b994882f83689fbfa79b952fa8e711", "");
        assert_eq!(dist, 3);

        let m = HashMap::from([
            (
                "fc99c36ef31c6e5c6fef6e45acbc91018f73eef8".to_owned(),
                vec!["f7ccf77b87907612d3c03d21eea2d63f5345f4e4".to_owned()],
            ),
            (
                "f7ccf77b87907612d3c03d21eea2d63f5345f4e4".to_owned(),
                vec![ZERO_SHA.to_owned()],
            ),
            (ZERO_SHA.to_owned(), vec![]),
        ]);
        let dist = calculate_left_distance(m, "fc99c36ef31c6e5c6fef6e45acbc91018f73eef8", "");
        assert_eq!(dist, 2);

        let m = HashMap::from([
            (
                "d37a30e4a2023e5dd419b0ad08526fa4adb6c1d1".to_owned(),
                vec![
                    "eb452a9deefbf63574af0b375488029dd2c4342a".to_owned(),
                    "eb7cb820baae9165838fec6c99a6b58d8dcfd57c".to_owned(),
                ],
            ),
            (
                "eb7cb820baae9165838fec6c99a6b58d8dcfd57c".to_owned(),
                vec!["8b9d412c468ea82d45384edb695f388db7a9aaee".to_owned()],
            ),
            (
                "8b9d412c468ea82d45384edb695f388db7a9aaee".to_owned(),
                vec!["8512ab02f932cb1735e360356632c4daebec8c22".to_owned()],
            ),
            (
                "eb452a9deefbf63574af0b375488029dd2c4342a".to_owned(),
                vec!["8512ab02f932cb1735e360356632c4daebec8c22".to_owned()],
            ),
            (
                "8512ab02f932cb1735e360356632c4daebec8c22".to_owned(),
                vec!["98efe1b538f0b43593cca2c23f4f7f5141ae93df".to_owned()],
            ),
            (
                "98efe1b538f0b43593cca2c23f4f7f5141ae93df".to_owned(),
                vec![ZERO_SHA.to_owned()],
            ),
            (ZERO_SHA.to_owned(), vec![]),
        ]);
        let dist = calculate_left_distance(m, "d37a30e4a2023e5dd419b0ad08526fa4adb6c1d1", "");
        assert_eq!(dist, 4);

        let m = HashMap::from([
            (
                "a3888f56db3b43dedd32991b49842b16965041af".to_owned(),
                vec!["44699fc8627c1d78191f48d336e4d07d1325e38d".to_owned()],
            ),
            ("".to_owned(), vec![]),
        ]);
        let dist = calculate_left_distance(
            m,
            "a3888f56db3b43dedd32991b49842b16965041af",
            "44699fc8627c1d78191f48d336e4d07d1325e38d",
        );
        assert_eq!(dist, 1);
    }

    #[tokio::test]
    async fn test_push_parotected_ref() {
        init_logger().await;
        {
            let span = trace_span!("test_push_parotected_ref");
            let _guard = span.enter();

            let repo =
                setup_repo("test_push_protected", "tests/fixtures/make_remote_repo.sh").unwrap();

            let mut mock_blockchain = MockEverscale::new();
            mock_blockchain
                .expect_is_branch_protected()
                .returning(|_, _| Ok(true));
            mock_blockchain.expect_remote_rev_parse().returning(|_, _| {
                Ok(Some((
                    blockchain::BlockchainContractAddress::new("test"),
                    "test".to_owned(),
                )))
            });

            let mut helper = setup_test_helper(
                json!({
                    "ipfs": "foo.endpoint"
                }),
                "gosh://1/2/3",
                repo,
                mock_blockchain,
            );

            match helper.push("main:main").await {
                Err(e) => assert!(e.to_string().contains("protected")),
                _ => panic!("Protected branch push should panic"),
            }
        }
        shutdown_logger().await;
    }

    #[tokio::test]
    async fn test_push_normal_ref() {
        init_logger().await;
        {
            let span = trace_span!("test_push_normal_ref");
            let _guard = span.enter();

            // TODO: need more smart test
            let repo =
                setup_repo("test_push_normal", "tests/fixtures/make_remote_repo.sh").unwrap();

            let mut mock_blockchain = MockEverscale::new();
            mock_blockchain
                .expect_is_branch_protected()
                .returning(|_, _| Ok(false));

            mock_blockchain.expect_remote_rev_parse().returning(|_, _| {
                Ok(Some((
                    blockchain::BlockchainContractAddress::new("test"),
                    "test".to_owned(),
                )))
            });

            // TODO: fix bad object stderr from git command
            let sha = repo.head_commit().unwrap().id.to_string();
            mock_blockchain
                .expect_get_commit_by_addr()
                .returning(move |_| {
                    Ok(Some(
                        serde_json::from_value(json!({
                            "repo": "",
                            "branch": "main",
                            "sha": sha,
                            "parents": [],
                            "content": "",
                        }))
                        .unwrap(),
                    ))
                });

            mock_blockchain
                .expect_notify_commit()
                .returning(|_, _, _, _, _, _, _| Ok(()));

            let mut helper = setup_test_helper(
                json!({
                    "ipfs": "foo.endpoint"
                }),
                "gosh://1/2/3",
                repo,
                mock_blockchain,
            );

            let res = helper.push("main:main").await.unwrap();
        }
        shutdown_logger().await;
    }
}
