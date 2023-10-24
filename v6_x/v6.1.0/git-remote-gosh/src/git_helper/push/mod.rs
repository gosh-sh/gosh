use super::GitHelper;
use crate::{
    blockchain::{
        branch::DeleteBranch,
        contract::{ContractRead, GoshContract},
        get_commit_address, gosh_abi, AddrVersion, BlockchainContractAddress, BlockchainService,
        GetNameCommitResult, MAX_ACCOUNTS_ADDRESSES_PER_QUERY, ZERO_SHA,
    },
    git_helper::push::create_branch::CreateBranchOperation,
};
use git_hash::{self, ObjectId};
use git_odb::Find;
use std::collections::VecDeque;
use std::{
    collections::{HashMap, HashSet},
    str::FromStr,
    sync::Arc,
    vec::Vec,
};
use ton_client::net::ParamsOfQuery;

use tokio::sync::Semaphore;

use ton_client::utils::compress_zstd;

pub mod create_branch;
pub(crate) mod parallel_diffs_upload_support;
mod utilities;
pub use utilities::ipfs_content::is_going_to_ipfs;
mod push_diff;
mod push_tag;
mod push_tree;
use push_tag::push_tag;
mod delete_tag;
pub(crate) mod parallel_snapshot_upload_support;

use crate::blockchain::{branch_list, get_commit_by_addr, Snapshot, Tree, tree};
use crate::git_helper::push::parallel_snapshot_upload_support::{
    ParallelCommit, ParallelCommitUploadSupport, ParallelSnapshot, ParallelSnapshotUploadSupport,
    ParallelTreeUploadSupport,
};
use crate::git_helper::supported_contract_version;
use delete_tag::delete_tag;
use parallel_diffs_upload_support::{ParallelDiff, ParallelDiffsUploadSupport};
use push_tree::push_tree;

use crate::blockchain::tree::load::{construct_map_of_snapshots, GetTreeResult, SnapshotMonitor};
use crate::git_helper::push::push_diff::save_data_to_ipfs;

static PARALLEL_PUSH_LIMIT: usize = 1 << 6;
static MAX_REDEPLOY_ATTEMPTS: i32 = 3;
const GOSH_DEPLOY_RETRIES: &str = "GOSH_DEPLOY_RETRIES";

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

#[derive(Deserialize, Debug)]
struct GetLimitedResult {
    #[serde(rename = "_limited")]
    pub limited: bool,
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
        snapshot_address: String,
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
            snapshot_address,
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
        snapshot_to_commit: &mut HashMap<String, Vec<SnapshotMonitor>>,
    ) -> anyhow::Result<()> {
        let file_diff =
            utilities::generate_blob_diff(&self.local_repository().objects, None, Some(blob_id))
                .await?;
        let snapshot_addr = {
            tracing::trace!("push_new_blob: file_path={file_path}, blob_id={blob_id}, commit_id={commit_id}, branch_name={branch_name}, upgrade_commit={upgrade_commit}");
            let blockchain = self.blockchain.clone();
            let repo_address = self.repo_addr.clone();
            let dao_addr = self.dao_addr.clone();
            let remote_network = self.remote.network.clone();
            let branch_name = branch_name.to_string();
            let file_path = file_path.to_string();
            let commit_str = commit_id.to_string();

            let mut repo_contract = self.blockchain.repo_contract().clone();
            let commit_sha = commit_id.to_string().clone();
            let snapshot_addr = Snapshot::calculate_address(
                self.blockchain.client(),
                &mut repo_contract,
                &commit_sha,
                &file_path,
            )
            .await?;
            let snapshot_addr = String::from(snapshot_addr);
            if !self.get_db()?.snapshot_exists(&snapshot_addr)? {
                let (content, ipfs) = if upgrade_commit {
                    if is_going_to_ipfs(&file_diff.after_patch) {
                        tracing::trace!("push_new_branch_snapshot->save_data_to_ipfs");
                        let ipfs = Some(
                            save_data_to_ipfs(&self.file_provider, &file_diff.after_patch)
                                .await
                                .map_err(|e| {
                                    tracing::trace!("save_data_to_ipfs error: {}", e);
                                    e
                                })?,
                        );
                        ("".to_string(), ipfs)
                    } else {
                        let compressed: Vec<u8> = compress_zstd(&file_diff.after_patch, None)?;
                        tracing::trace!("compressed to {} size", compressed.len());
                        (hex::encode(compressed), None)
                    }
                } else {
                    ("".to_string(), None)
                };

                let snapshot =
                    ParallelSnapshot::new(file_path, upgrade_commit, commit_str, content, ipfs);
                self.get_db()?
                    .put_snapshot(&snapshot, snapshot_addr.clone())?;

                // parallel_snapshot_uploads
                //     .add_to_push_list(self, snapshot_addr.clone(), prev_repo_address)
                //     .await?;
                // } else {
            }

            parallel_snapshot_uploads.push_expected(snapshot_addr.clone());
            snapshot_addr
        };
        if !upgrade_commit {
            let diff = ParallelDiff::new(
                *commit_id,
                branch_name.to_string(),
                *blob_id,
                file_path.to_string(),
                file_diff.original.clone(),
                file_diff.patch.clone(),
                file_diff.after_patch.clone(),
                snapshot_addr,
            );
            parallel_diffs_upload_support.push(self, diff).await?;
            statistics.diffs += 1;
        }
        statistics.new_snapshots += 1;
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
        snapshot_address: String,
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
            snapshot_address,
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
        let sha: GetNameCommitResult = commit_contract
            .run_local(self.blockchain.client(), "getNameCommit", None)
            .await?;
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
        // We are trying to fix it by searching the commit with no parents
        let walk = from
            .ancestors()
            .all()?
            .map(|e| e.expect("all entities should be present"))
            .into_iter();

        let mut ids = vec![];
        let commits: Vec<_> = walk
            .map(|a| {
                ids.push(a.clone().to_string());
                a.object().unwrap().into_commit()
            })
            .collect();
        let query = r#"query($accounts: [String]!) {
            accounts(filter: {
                id: { in: $accounts }
            }) {
                id acc_type
            }
        }"#
        .to_owned();

        let client = self.blockchain.client();
        let mut map_id_addr = Vec::<(String, Vec<String>)>::new();
        tracing::trace!("commits={commits:?}");

        let repo_versions = self.get_repo_versions();
        tracing::trace!("Repo versions {repo_versions:?}");
        let mut repo_contracts: Vec<_> = repo_versions
            .iter()
            .map(|ver| GoshContract::new(ver.repo_address.clone(), gosh_abi::REPO))
            .collect();
        // search for commits in all repo versions
        for ids in ids.chunks(MAX_ACCOUNTS_ADDRESSES_PER_QUERY / repo_contracts.len()) {
            let mut addresses = Vec::<BlockchainContractAddress>::new();
            for id in ids {
                let mut commits = vec![];
                for repo_contract in repo_contracts.iter_mut() {
                    let commit_address = get_commit_address(client, repo_contract, id).await?;
                    // let (version, commit_address) = self.find_commit(id).await?;
                    addresses.push(commit_address.clone());
                    commits.push(String::from(commit_address));
                }
                map_id_addr.push((id.to_owned(), commits));
            }
            let result = ton_client::net::query(
                Arc::clone(client),
                ParamsOfQuery {
                    query: query.clone(),
                    variables: Some(serde_json::json!({ "accounts": addresses })),
                    ..Default::default()
                },
            )
            .await
            .map(|r| r.result)
            .map_err(|e| anyhow::format_err!("query error: {e}"))?;

            let raw_data = result["data"]["accounts"].clone();
            let mut existing_commits: Vec<AccountStatus> = serde_json::from_value(raw_data)?;
            existing_commits.retain(|val| val.status == 1); // leave only active
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
                let pos = ex_iter.position(|x| commit.1.contains(&x.address) && x.status == 1);

                if pos.is_none() {
                    return Ok(Some(commit.0.clone()));
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
        set_commit: bool,
        snapshot_to_commit: &mut HashMap<String, Vec<SnapshotMonitor>>,
    ) -> anyhow::Result<Option<Tree>> {
        tracing::trace!("check_parents object_id: {object_id} remote_branch_name: {remote_branch_name}, local_branch_name: {local_branch_name}, set_commit={set_commit}");
        let mut buffer: Vec<u8> = Vec::new();
        let commit = self
            .local_repository()
            .objects
            .try_find(object_id, &mut buffer)?
            .expect("Commit should exists");

        let raw_commit = String::from_utf8(commit.data.to_vec())?;

        let commit_iter = commit.try_into_commit_iter().unwrap();
        let parent_ids: Vec<String> = commit_iter.parent_ids().map(|e| e.to_string()).collect();

        let mut was_upgraded = false;
        for id in &parent_ids {
            tracing::trace!("check parent: {id}");
            if self.pushed_commits.contains_key(id) {
                was_upgraded = self.pushed_commits.get(id).unwrap().to_owned();
                continue;
            }
            was_upgraded = true;
            for repo_version in &self.repo_versions {
                let mut repo_contract =
                    GoshContract::new(&repo_version.repo_address, gosh_abi::REPO);
                let parent = get_commit_address(
                    self.blockchain.client(),
                    &mut repo_contract,
                    &id.to_string(),
                )
                .await?;
                let commit_contract = GoshContract::new(&parent, gosh_abi::COMMIT);
                if commit_contract.is_active(self.blockchain.client()).await? {
                    if repo_version.version == supported_contract_version().trim_matches(|c| c == '"') {
                        break;
                    }
                    tracing::trace!("Found parent {id} in version {}", repo_version.version);
                    tracing::trace!("Start upgrade of the parent: {id}");
                    let parents_for_upgrade = vec![AddrVersion {
                        address: parent,
                        version: repo_version.version.clone(),
                    }];
                    self.check_and_upgrade_previous_commit(
                        id.to_string(),
                        local_branch_name,
                        remote_branch_name,
                        set_commit,
                        parents_for_upgrade,
                        snapshot_to_commit,
                    )
                    .await?;

                    break;
                } else {
                    tracing::trace!("Not found parent {id} in version {}", repo_version.version);
                }
            }
        }

        // If parent exists load tree of the zero parent
        let parent_tree = match parent_ids.first() {
            Some(id) => {
                if was_upgraded || !self.pushed_commits.contains_key(id) {
                    let mut repo = self.blockchain.repo_contract().clone();
                    let parent = get_commit_address(
                        self.blockchain.client(),
                        &mut repo,
                        &id.to_string(),
                    )
                        .await?;
                    let commit_contract = GoshContract::new(&parent, gosh_abi::COMMIT);
                    if !commit_contract.is_active(self.blockchain.client()).await? {
                        None
                    } else {
                        let result: GetTreeResult = commit_contract.run_local(self.blockchain.client(), "gettree", None).await?;
                        let tree_address = result.address;
                        match Tree::load(
                            self.blockchain.client(),
                            &tree_address,
                        ).await {
                            Ok(tree) => Some(tree),
                            Err(_) => None
                        }
                    }
                } else {
                    None
                }
            },
            None => { None }
        };
        Ok(parent_tree)
    }

    #[instrument(level = "info", skip_all)]
    async fn push_zero_commit(
        &mut self,
        local_branch_name: &str,
        wallet_contract: &GoshContract,
    ) -> anyhow::Result<()> {
        let zero_id = ObjectId::from_str(ZERO_SHA)?;
        let zero_commit_addr = self.calculate_commit_address(&zero_id).await?;

        let zero_commit_contract = GoshContract::new(&zero_commit_addr, gosh_abi::COMMIT);
        match zero_commit_contract
            .is_active(self.blockchain.client())
            .await
        {
            Ok(true) => {
                return Ok(());
            }
            _ => {}
        }
        tracing::trace!("Deploy zero commit of new version");
        let mut push_commits = ParallelCommitUploadSupport::new();
        let push_semaphore = Arc::new(Semaphore::new(PARALLEL_PUSH_LIMIT));
        // let mut parallel_tree_uploads = ParallelTreeUploadSupport::new();

        let branches = branch_list(self.blockchain.client(), &self.repo_addr).await?;
        let prev_zero_commit = branches
            .branch_ref
            .iter()
            .find(|_ref| _ref.branch_name == local_branch_name)
            .ok_or(anyhow::format_err!(
                "Failed to find zero commit of the previous repo version"
            ))?;

        let commit = ParallelCommit::new(
            zero_id,
            "0".to_string(),
            "".to_string(),
            vec![AddrVersion {
                address: prev_zero_commit.commit_address.clone(),
                version: prev_zero_commit.version.clone(),
            }],
            true,
        );

        let commit_address = String::from(zero_commit_addr);
        if !self.get_db()?.commit_exists(&commit_address)? {
            self.get_db()?.put_commit(commit, commit_address.clone())?;

            push_commits
                .add_to_push_list(self, commit_address, push_semaphore.clone())
                .await?;
        } else {
            push_commits.push_expected(commit_address);
        }

        let tree_hash = crate::blockchain::Tree::inner_tree_hash(
            self.blockchain.client(),
            wallet_contract,
            &HashMap::new(),
        )
        .await?;

        let mut expected_contracts = vec![];

        let mut attempts = 0;
        let mut last_rest_cnt = 0;
        let redeploy_attempts = get_redeploy_attempts();

        while attempts < redeploy_attempts {
            if attempts == redeploy_attempts {
                anyhow::bail!(
                "Failed to deploy all commits. Undeployed commits: {expected_contracts:?}"
            )
            }
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
                tracing::trace!("Get params of undeployed tree: {}", address,);
                push_commits
                    .add_to_push_list(self, String::from(address), push_semaphore.clone())
                    .await?;
            }
            attempts += 1;
        }

        self.blockchain
            .notify_commit(
                &zero_id,
                local_branch_name,
                0,
                1,
                &self.remote,
                &self.dao_addr,
                true,
                &self.config,
            )
            .await?;
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
        statistics: &mut PushBlobStatistics,
        parallel_diffs_upload_support: &mut ParallelDiffsUploadSupport,
        parallel_snapshot_uploads: &mut ParallelSnapshotUploadSupport,
        upgrade_commit: bool,
        parents_for_upgrade: Vec<AddrVersion>,
        snapshot_to_commit: &mut HashMap<String, Vec<SnapshotMonitor>>,
        wallet_contract: &GoshContract,
        parallel_tree_upload_support: &mut ParallelTreeUploadSupport,
        previous_tree: Option<Tree>,
    ) -> anyhow::Result<()> {
        tracing::trace!("push_commit_object: object_id={object_id}, remote_branch_name={remote_branch_name}, local_branch_name={local_branch_name}");
        let mut buffer: Vec<u8> = Vec::new();
        let commit = self
            .local_repository()
            .objects
            .try_find(object_id, &mut buffer)?
            .expect("Commit should exists");

        let raw_commit = String::from_utf8(commit.data.to_vec())?;

        let mut commit_iter = commit.try_into_commit_iter().unwrap();
        let tree_id = commit_iter.tree_id()?;

        let prev_commit_id = if !upgrade_commit {
            commit_iter.parent_ids().next()
        } else {
            None
        };
        tracing::trace!("prev_commit_id={prev_commit_id:?}");
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

        for id in &parent_ids {
            let parent = get_commit_address(
                &self.blockchain.client(),
                &mut repo_contract,
                &id.to_string(),
            )
            .await?;
            let parent_contract = GoshContract::new(&parent, gosh_abi::COMMIT);
            let version = parent_contract
                .get_version(self.blockchain.client())
                .await
                .unwrap_or(supported_contract_version());
            parents.push(AddrVersion {
                address: parent,
                version,
            });
        }
        if upgrade_commit && !parents_for_upgrade.is_empty() {
            parents = parents_for_upgrade.clone();
        }

        let ancestor_commits = self.get_commit_ancestors(&object_id)?;

        let tree_diff = utilities::build_tree_diff_from_commits(
            self.local_repository(),
            prev_commit_id,
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
                snapshot_to_commit,
            )
            .await?;
            let snap_mon = SnapshotMonitor {
                base_commit: object_id.to_string(),
                latest_commit: object_id.to_string(),
            };
            let entry = snapshot_to_commit
                .entry(added.filepath.to_string())
                .or_insert(vec![]);
            if upgrade_commit {
                entry.clear();
            }
            entry.push(snap_mon);
        }

        for update in tree_diff.updated {
            tracing::trace!("push update diff");
            // Commit modifies file but snapshot can be updated in the other branch
            // In this case it will be absent in the snapshot_to_commit map
            // of latest commit of the file will be not in this commit ancestors chain
            // and we need to deploy a new snapshot with updated content
            let file_path = update.1.filepath.to_string();

            let mut found = false;
            tracing::trace!("Searching for snapshot: {file_path}");
            tracing::trace!("snap_to_commit: {snapshot_to_commit:?}");
            tracing::trace!("ancestors: {ancestor_commits:?}");
            if !upgrade_commit && snapshot_to_commit.contains_key(&file_path) {
                let snap_mon_vec = snapshot_to_commit.get_mut(&file_path).unwrap();
                for i in 0..snap_mon_vec.len() {
                    if ancestor_commits.contains(&snap_mon_vec[i].latest_commit) {
                        found = true;
                        tracing::trace!("push update diff to existing snapshot");
                        let repo_contract = self.blockchain.repo_contract().clone();
                        let snapshot_address = Snapshot::calculate_address(
                            self.blockchain.client(),
                            &repo_contract,
                            &snap_mon_vec[i].base_commit,
                            &file_path,
                        )
                        .await?;
                        self.push_blob_update(
                            &file_path,
                            &update.0.oid,
                            &update.1.oid,
                            &object_id,
                            local_branch_name,
                            statistics,
                            parallel_diffs_upload_support,
                            String::from(snapshot_address),
                        )
                        .await?;
                        tracing::trace!("Change latest commit for {}", file_path);
                        snap_mon_vec[i].latest_commit = object_id.to_string();
                        break;
                    }
                }
            }
            if !found {
                tracing::trace!("push update diff to new snapshot");
                self.push_new_blob(
                    &file_path,
                    &update.1.oid,
                    &object_id,
                    local_branch_name,
                    statistics,
                    parallel_diffs_upload_support,
                    parallel_snapshot_uploads,
                    upgrade_commit,
                    snapshot_to_commit,
                )
                .await?;
                let snap_mon = SnapshotMonitor {
                    base_commit: object_id.to_string(),
                    latest_commit: object_id.to_string(),
                };
                let mon_vec = snapshot_to_commit.entry(file_path).or_insert(vec![]);
                mon_vec.push(snap_mon);
            }
        }
        if !upgrade_commit {
            for deleted in tree_diff.deleted {
                let file_path = deleted.filepath.to_string();
                tracing::trace!("Delete blob from cache: {:?}", deleted.oid);
                // parallel_tree_upload_support.tree_item_to_base_commit_cache.remove(&format!("{}_{}", file_path, deleted.oid.to_string()));
                if snapshot_to_commit.contains_key(&file_path) {
                    let snap_mon_vec = snapshot_to_commit.get_mut(&file_path).unwrap();
                    for i in 0..snap_mon_vec.len() {
                        if ancestor_commits.contains(&snap_mon_vec[i].latest_commit) {
                            tracing::trace!("push update diff to existing snapshot");
                            let repo_contract = self.blockchain.repo_contract().clone();
                            let snapshot_address = Snapshot::calculate_address(
                                self.blockchain.client(),
                                &repo_contract,
                                &snap_mon_vec[i].base_commit,
                                &file_path,
                            )
                            .await?;

                            self.push_blob_remove(
                                &file_path,
                                &deleted.oid,
                                &object_id,
                                local_branch_name,
                                statistics,
                                parallel_diffs_upload_support,
                                String::from(snapshot_address),
                            )
                            .await?;
                            snap_mon_vec.remove(i);
                            break;
                        }
                    }
                }
            }
        }

        let (tree_addr, tree_sha) = push_tree(
            self,
            &tree_id,
            oid,
            snapshot_to_commit,
            wallet_contract,
            parallel_tree_upload_support,
            push_semaphore.clone(),
            upgrade_commit,
            previous_tree,
        )
        .await?;

        {
            let object_id = object_id.clone();
            let tree_sha = tree_sha.clone();

            let commit =
                ParallelCommit::new(object_id, tree_sha, raw_commit, parents, upgrade_commit);
            let mut repo_contract = self.blockchain.repo_contract().clone();
            let commit_address = get_commit_address(
                self.blockchain.client(),
                &mut repo_contract,
                &object_id.to_string(),
            )
            .await?;
            let commit_address = String::from(commit_address);
            if !self.get_db()?.commit_exists(&commit_address)? {
                self.get_db()?.put_commit(commit, commit_address.clone())?;

                push_commits
                    .add_to_push_list(self, commit_address, push_semaphore.clone())
                    .await?;
            } else {
                push_commits.push_expected(commit_address);
            }
        }

        tracing::trace!("parents: {parent_ids:?}");
        tracing::trace!("snapshot_to_commit: {snapshot_to_commit:?}");

        // if !parent_ids.is_empty() {
        //     parent_ids.remove(0);
        //     for parent in parent_ids {
        //         for (_, snap_mon) in &mut *snapshot_to_commit {
        //             let mut index = 0;
        //             loop {
        //                 if index >= snap_mon.len() {
        //                     break;
        //                 }
        //                 if snap_mon.get(index).unwrap().latest_commit == parent {
        //                     snap_mon.remove(index);
        //                 } else {
        //                     index += 1;
        //                 }
        //             }
        //         }
        //     }
        // }

        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    async fn check_and_upgrade_previous_commit(
        &mut self,
        ancestor_commit: String,
        local_branch_name: &str,
        remote_branch_name: &str,
        set_commit: bool,
        parents_for_upgrade: Vec<AddrVersion>,
        mut snapshot_to_commit: &mut HashMap<String, Vec<SnapshotMonitor>>,
    ) -> anyhow::Result<()> {
        // last commit should be redeployed with flag init_upgrade
        // tree for last commit should be redeployed and addr of new tree goes to commit constructor
        // parent for commit should be prev version of the same commit
        // snapshot should be deployed with content of the last snapshot and new addr of commit

        tracing::trace!("check and upgrade previous commit: {ancestor_commit} {local_branch_name} {remote_branch_name} {set_commit}");

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
        let previous_repo_addr = previous
            .previous
            .clone()
            .ok_or(anyhow::format_err!(
                "Failed to get previous version of the repo"
            ))?
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
        let parents_for_upgrade = vec![AddrVersion {
            address: prev_ancestor_address.clone(),
            version: previous.previous.unwrap().version,
        }];
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
        if self.pushed_commits.contains_key(&commit_objects_list[0]) {
            return Ok(());
        }

        tracing::trace!("List of commit objects: {commit_objects_list:?}");

        // 9) push objects
        let mut push_commits = ParallelCommitUploadSupport::new();
        let push_semaphore = Arc::new(Semaphore::new(PARALLEL_PUSH_LIMIT));
        let mut parallel_tree_uploads = ParallelTreeUploadSupport::new();
        let mut parallel_snapshot_uploads = ParallelSnapshotUploadSupport::new();
        let mut parents_of_commits: HashMap<String, Vec<String>> =
            HashMap::from([(ZERO_SHA.to_owned(), vec![]), ("".to_owned(), vec![])]);
        let visited_trees: HashSet<ObjectId> = HashSet::new();
        let mut statistics = PushBlobStatistics::new();

        let latest_commit_id = self
            .local_repository()
            .find_object(ObjectId::from_str(&ancestor_commit)?)?
            .id;
        let mut parallel_diffs_upload_support = ParallelDiffsUploadSupport::new(&latest_commit_id);

        let zero_wallet_contract = self
            .blockchain
            .user_wallet(&self.dao_addr, &self.remote.network)
            .await?
            .take_zero_wallet()
            .await?;

        // let mut snapshot_to_commit = HashMap::new();
        let onchain_commit = &latest_commit_id;
        let commit_str = onchain_commit.to_string();
        if commit_str != ZERO_SHA {
            tracing::trace!(
                "Start load of previous commit tree. onchain_commit={}",
                onchain_commit
            );
            let commit_version = self.find_commit(&commit_str).await?;
            tracing::trace!("Version of the prev commit: {commit_version:?}");
            // TODO: compare with version 6 or greater not current
            if commit_version.version == supported_contract_version() {
                tracing::trace!("Prev commit is equal to the current, preload the tree");
                let commit_address = self.calculate_commit_address(onchain_commit).await?;
                tracing::trace!("commit_address:{commit_address}");
                let tree_address =
                    Tree::get_address_from_commit(self.blockchain.client(), &commit_address)
                        .await?;
                tracing::trace!("tree_address:{tree_address}");
                let tree = Tree::load(self.blockchain.client(), &tree_address).await?;
                let mut queue = VecDeque::new();
                queue.push_back((tree, "".to_string()));
                loop {
                    if let Some((tree, prefix)) = queue.pop_back() {
                        let repo_contract = self.blockchain.repo_contract().clone();
                        construct_map_of_snapshots(
                            self.blockchain.client(),
                            &repo_contract,
                            tree,
                            &prefix,
                            &mut snapshot_to_commit,
                            &mut queue,
                        )
                        .await?;
                    } else {
                        break;
                    }
                }
                tracing::trace!("Loaded snapshot_to_commit map: {:?}", snapshot_to_commit);
            } else {
                tracing::trace!("Prev commit is not equal to current, skip preload of tree");
            }
        }

        // iterate through the git objects list and push them
        for oid in &commit_objects_list {
            let object_id = git_hash::ObjectId::from_str(oid)?;
            let object_kind = self.local_repository().find_object(object_id)?.kind;
            match object_kind {
                git_object::Kind::Commit => {
                    self.pushed_commits.insert(oid.to_string(), true);
                    // TODO: fix lifetimes (oid can be trivially inferred from object_id)
                    self.push_commit_object(
                        oid,
                        object_id,
                        remote_branch_name,
                        local_branch_name,
                        &mut parents_of_commits,
                        &mut push_commits,
                        push_semaphore.clone(),
                        &mut statistics,
                        &mut parallel_diffs_upload_support,
                        &mut parallel_snapshot_uploads,
                        true,
                        parents_for_upgrade.clone(),
                        snapshot_to_commit,
                        &zero_wallet_contract,
                        &mut parallel_tree_uploads,
                        None,
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
                    // push_tree(
                    //     self,
                    //     &object_id,
                    //     &mut visited_trees,
                    //     &mut parallel_tree_uploads,
                    //     push_semaphore.clone(),
                    // )
                    // .await?;
                }
            }
        }

        tracing::trace!("Start of wait for contracts to be deployed");
        let mut expected_contracts = vec![];
        let mut attempts = 0;
        let mut last_rest_cnt = 0;
        let redeploy_attempts = get_redeploy_attempts();
        while attempts < redeploy_attempts {
            if attempts == redeploy_attempts {
                anyhow::bail!("Failed to deploy all trees. Undeployed trees: {expected_contracts:?}")
            }
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
                tracing::trace!("Get params of undeployed tree: {}", address,);
                parallel_tree_uploads.push_expected(String::from(&address));
                parallel_tree_uploads
                    .add_to_push_list(self, String::from(&address), push_semaphore.clone())
                    .await?;
            }
            attempts += 1;
        }

        let mut attempts = 0;
        let mut last_rest_cnt = 0;
        while attempts < redeploy_attempts {
            if attempts == redeploy_attempts {
                anyhow::bail!(
                "Failed to deploy all commits. Undeployed commits: {expected_contracts:?}"
            )
            }
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
                tracing::trace!("Get params of undeployed tree: {}", address,);
                push_commits
                    .add_to_push_list(self, String::from(address), push_semaphore.clone())
                    .await?;
            }
            attempts += 1;
        }

        let files_cnt = parallel_snapshot_uploads.get_expected().len();
        parallel_snapshot_uploads.start_push(self).await?;

        let stored_snapshot_addresses = parallel_snapshot_uploads.get_expected().clone();
        let db = self.get_db()?;
        for address in stored_snapshot_addresses {
            db.delete_snapshot(&address)?;
        }

        if set_commit {
            let branches = branch_list(self.blockchain.client(), &self.repo_addr).await?;
            for branch_ref in branches.branch_ref {
                // if branch_ref.branch_name == local_branch_name {
                let commit_contract =
                    GoshContract::new(&branch_ref.commit_address, gosh_abi::COMMIT);
                let sha: GetNameCommitResult = commit_contract
                    .run_local(self.blockchain.client(), "getNameCommit", None)
                    .await?;
                tracing::trace!("Commit sha: {sha:?}");
                if sha.name == latest_commit_id.to_string() {
                    // 10) call set commit to the new version of the ancestor commit
                    self.blockchain
                        .notify_commit(
                            &latest_commit_id,
                            &branch_ref.branch_name,
                            files_cnt as u32,
                            1,
                            &self.remote,
                            &self.dao_addr,
                            true,
                            &self.config,
                        )
                        .await?;
                }
                // }
            }
        }

        Ok(())
    }

    // TODO: investigate may be it should be changed to git function
    fn get_commit_ancestors(&self, start_commit: &ObjectId) -> anyhow::Result<Vec<String>> {
        let mut res = vec![];
        res.push(start_commit.to_string());
        let mut queue = VecDeque::new();
        queue.push_back(start_commit.to_owned());

        loop {
            if let Some(object_id) = queue.pop_front() {
                let mut buffer: Vec<u8> = Vec::new();
                let commit = self
                    .local_repository()
                    .objects
                    .try_find(object_id, &mut buffer)?
                    .expect("Commit should exists");

                let commit_iter = commit.try_into_commit_iter().unwrap();
                for parent in commit_iter.parent_ids() {
                    res.push(parent.to_string());
                    queue.push_back(parent);
                    // add only zero parent
                    break;
                }
            } else {
                break;
            }
        }
        Ok(res)
    }

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
        self.open_db()?;
        let local_branch_name: &str = get_ref_name(local_ref)?;
        let remote_branch_name: &str = get_ref_name(remote_ref)?;

        // 1. Check if branch exists and ready in the blockchain
        let remote_commit_addr = self
            .blockchain
            .remote_rev_parse(&self.repo_addr, remote_branch_name)
            .await?
            .map(|pair| pair.0);
        tracing::trace!("remote_commit_addr={remote_commit_addr:?}");

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
        tracing::trace!("ancestor_commit_id={ancestor_commit_id:?}");
        let mut ancestor_commit_object = if ancestor_commit_id != "" {
            Some(ObjectId::from_str(&ancestor_commit_id)?)
        } else {
            None
        };
        tracing::trace!("ancestor_commit_object={ancestor_commit_object:?}");

        let latest_commit = self
            .local_repository()
            .find_reference(local_ref)?
            .into_fully_peeled_id()?;
        tracing::trace!("latest_commit={latest_commit:?}");
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

        // map of base commit for snapshot
        let mut snapshot_to_commit = HashMap::new();

        // 3. If branch needs to be created do so
        if prev_commit_id.is_none() {
            //    ---
            //    Otherwise check if a head of the branch
            //    is pointing to the ancestor commit. Fail
            //    if it doesn't
            let originating_commit = self.find_ancestor_commit(latest_commit).await?.unwrap();
            let originating_commit = git_hash::ObjectId::from_str(&originating_commit)?;
            tracing::trace!("originating_commit={originating_commit:?}");
            self.check_parents(
                originating_commit,
                remote_branch_name,
                local_branch_name,
                false,
                &mut snapshot_to_commit,
            )
            .await?;
            let branching_point = self.get_parent_id(&originating_commit)?;
            tracing::trace!("branching_point={branching_point:?}");
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
                        vec![ancestor_commit_id],
                    );
                    ancestor_commit_object
                }
            };
            tracing::trace!("prev_commit_id={prev_commit_id:?}");
        }

        // create collections for spawned tasks and statistics
        let mut push_commits = ParallelCommitUploadSupport::new();
        let push_semaphore = Arc::new(Semaphore::new(PARALLEL_PUSH_LIMIT));
        let mut parallel_snapshot_uploads = ParallelSnapshotUploadSupport::new();
        let mut parallel_tree_uploads = ParallelTreeUploadSupport::new();
        let mut statistics = PushBlobStatistics::new();

        let zero_wallet_contract = self
            .blockchain
            .user_wallet(&self.dao_addr, &self.remote.network)
            .await?
            .take_zero_wallet()
            .await?;

        let zero_id = ObjectId::from_str(ZERO_SHA)?;
        if prev_commit_id.is_none() || prev_commit_id == Some(zero_id) {
            tracing::trace!("Check zero commit");
            self.push_zero_commit(local_branch_name, &zero_wallet_contract)
                .await?;
        }

        let latest_commit = self
            .local_repository()
            .find_reference(local_ref)?
            .into_fully_peeled_id()?;
        tracing::trace!("latest_commit={latest_commit:?}");

        // TODO: change to list of commits without extra objects
        // get list of git objects in local repo, excluding ancestor ones
        let commit_list =
            get_list_of_commit_objects(latest_commit, ancestor_commit_object)?;

        // 4. Do prepare commit for all commits
        // 5. Deploy tree objects of all commits
        // 6. Deploy all **new** snapshot
        // 7. Deploy diff contracts
        // 8. Deploy all commit objects

        let latest_commit_id = latest_commit.object()?.id;
        tracing::trace!("latest commit id {latest_commit_id}");
        let mut parallel_diffs_upload_support = ParallelDiffsUploadSupport::new(&latest_commit_id);

        tracing::trace!("List of objects: {commit_list:?}");

        // read last onchain commit and init map from its tree
        // map (path -> commit_where_it_was_created)
        tracing::trace!("prev_commit_id={prev_commit_id:?}");
        if let Some(onchain_commit) = &prev_commit_id {
            let commit_str = onchain_commit.to_string();
            if commit_str != ZERO_SHA {
                tracing::trace!(
                    "Start load of previous commit tree. onchain_commit={}",
                    onchain_commit
                );
                let commit_version = self.find_commit(&commit_str).await?;
                tracing::trace!("Version of the prev commit: {commit_version:?}");
                let commit_ver = commit_version.version;
                let current = supported_contract_version();
                let equals = commit_ver == current;
                tracing::trace!("{} == {} : {}", commit_ver, current, equals);
                if commit_ver == supported_contract_version() {
                    tracing::trace!(
                        "Prev commit version is equal to the current, preload the tree"
                    );
                    let commit_address = self.calculate_commit_address(onchain_commit).await?;
                    tracing::trace!("commit_address:{commit_address}");
                    let tree_address =
                        Tree::get_address_from_commit(self.blockchain.client(), &commit_address)
                            .await?;
                    tracing::trace!("tree_address:{tree_address}");
                    let tree = Tree::load(self.blockchain.client(), &tree_address).await?;
                    let mut queue = VecDeque::new();
                    queue.push_back((tree, "".to_string()));
                    loop {
                        if let Some((tree, prefix)) = queue.pop_back() {
                            let repo_contract = self.blockchain.repo_contract().clone();
                            construct_map_of_snapshots(
                                self.blockchain.client(),
                                &repo_contract,
                                tree,
                                &prefix,
                                &mut snapshot_to_commit,
                                &mut queue,
                            )
                            .await?;
                        } else {
                            break;
                        }
                    }
                    tracing::trace!("Loaded map: {:?}", snapshot_to_commit);
                } else {
                    tracing::trace!(
                        "Prev commit version is not equal to current, skip preload of tree"
                    );
                }
            }
        }

        let mut number_of_commits = 0;
        tracing::trace!("commit_list:{commit_list:?}");
        // iterate through the git objects list and push them
        for oid in &commit_list {
            let object_id = git_hash::ObjectId::from_str(oid)?;
            let object_kind = self.local_repository().find_object(object_id)?.kind;
            tracing::trace!("Push object: {object_id:?} {object_kind:?}");
            match object_kind {
                git_object::Kind::Commit => {
                    self.pushed_commits.insert(oid.to_string(), false);
                    number_of_commits += 1;
                    // in case of fast forward commits can be already deployed for another branch
                    // Do not deploy them again
                    let commit_address = self.calculate_commit_address(&object_id).await?;
                    match get_commit_by_addr(
                        self.blockchain.client(),
                        &commit_address
                    ).await {
                        Ok(Some(commit)) => {
                            if commit.is_correct_commit {
                                continue;
                            }
                        }
                        _ => {}
                    }

                    // let commit_contract = GoshContract::new(&commit_address, gosh_abi::COMMIT);
                    // match commit_contract.is_active(self.blockchain.client()).await {
                    //     Ok(true) => continue,
                    //     _ => {}
                    // }

                    // TODO: fix lifetimes (oid can be trivially inferred from object_id)
                    let parent_tree = self.check_parents(
                        object_id,
                        remote_branch_name,
                        local_branch_name,
                        true,
                        &mut snapshot_to_commit,
                    )
                    .await?;
                    self.push_commit_object(
                        oid,
                        object_id,
                        remote_branch_name,
                        local_branch_name,
                        &mut parents_of_commits,
                        &mut push_commits,
                        push_semaphore.clone(),
                        &mut statistics,
                        &mut parallel_diffs_upload_support,
                        &mut parallel_snapshot_uploads,
                        false,
                        vec![],
                        &mut snapshot_to_commit,
                        &zero_wallet_contract,
                        &mut parallel_tree_uploads,
                        parent_tree,
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
                    // Handled in push_commit_object
                }
            }
        }
        // push dangling diffs
        parallel_diffs_upload_support.push_dangling(self).await?;
        let number_of_files_changed = parallel_diffs_upload_support.get_parallels_number();

        tracing::trace!("Start of wait for contracts to be deployed");
        let mut expected_contracts = vec![];
        let mut attempts = 0;
        let mut last_rest_cnt = 0;
        let redeploy_attempts = get_redeploy_attempts();
        while attempts < redeploy_attempts {
            if attempts == redeploy_attempts {
                anyhow::bail!("Failed to deploy all trees. Undeployed trees: {expected_contracts:?}")
            }
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
                tracing::trace!("Get params of undeployed tree: {}", address,);
                parallel_tree_uploads.push_expected(String::from(&address));
                parallel_tree_uploads
                    .add_to_push_list(self, String::from(&address), push_semaphore.clone())
                    .await?;
            }
            attempts += 1;
        }

        let mut attempts = 0;
        let mut last_rest_cnt = 0;
        while attempts < redeploy_attempts {
            if attempts == redeploy_attempts {
                anyhow::bail!(
                "Failed to deploy all commits. Undeployed commits: {expected_contracts:?}"
            )
            }
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
                tracing::trace!("Get params of undeployed tree: {}", address,);
                push_commits
                    .add_to_push_list(self, String::from(address), push_semaphore.clone())
                    .await?;
            }
            attempts += 1;
        }

        // After we have all commits and trees deployed, start push of diffs
        parallel_diffs_upload_support.push_diffs_in_chunks(self).await?;
        parallel_snapshot_uploads.start_push(self).await?;

        // clear database after all objects were deployed
        self.delete_db()?;

        // 9. Set commit (move HEAD)
        ancestor_commit_id = match ancestor_commit_object {
            Some(v) => v.to_string(),
            None => "".to_owned(),
        };

        // TODO: this number can be wrong with slow network
        self.blockchain
            .notify_commit(
                &latest_commit_id,
                local_branch_name,
                number_of_files_changed,
                number_of_commits,
                &self.remote,
                &self.dao_addr,
                false,
                &self.config,
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

    async fn check_if_wallet_is_limited(&self) -> anyhow::Result<()> {
        tracing::trace!("start check whether wallet is limited");
        let wallet = self
            .blockchain
            .user_wallet(&self.dao_addr, &self.remote.network)
            .await?
            .take_zero_wallet()
            .await
            .map_err(|_| anyhow::format_err!("Seems like you are not a member of DAO. Only DAO members can push to the repositories."))?;
        tracing::trace!("Zero wallet address: {:?}", wallet.address);
        let res: GetLimitedResult = wallet
            .run_local(self.blockchain.client(), "_limited", None)
            .await?;
        tracing::trace!("wallet _limited: {:?}", res);
        if res.limited {
            anyhow::bail!("Seems like you are not a member of DAO. Only DAO members can push to the repositories.");
        }
        tracing::trace!("wallet is valid");
        Ok(())
    }

    #[instrument(level = "trace", skip_all)]
    pub async fn push(&mut self, refs: &str) -> anyhow::Result<String> {
        tracing::debug!("push: refs={refs}");
        self.check_if_wallet_is_limited().await?;
        let splitted: Vec<&str> = refs.split(':').collect();
        let result = match splitted.as_slice() {
            ["", remote_tag] if remote_tag.starts_with("refs/tags") => {
                self.delete_remote_tag(remote_tag).await?
            }
            ["", remote_ref] => self.delete_remote_ref(remote_ref).await?,
            [local_tag, remote_tag] if local_tag.starts_with("refs/tags") => {
                self.push_ref_tag(local_tag, remote_tag).await?
            }
            [local_ref, remote_ref] => self.push_ref(local_ref, remote_ref).await?,
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
    tracing::trace!("get_list_of_commit_objects: start:{start:?} till:{till:?}");
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

    tracing::trace!("commits:{commits:?}");

    let mut commit_objects: HashMap<String, git_repository::Commit> = HashMap::new();
    for commit in commits.iter().rev() {
        let commit = commit.object()?.into_commit();
        commit_objects.insert(commit.id.to_string(), commit);
    }

    // Hashmap commits -> number of children
    // TODO: change to heap to increase speed
    let mut child_map: HashMap<String, Vec<String>> = HashMap::from_iter(
        commits.into_iter().map(|el| (el.to_string(), vec![]))
    );

    for (_, commit) in &commit_objects {
        for parent in commit.parent_ids() {
            match child_map.get_mut(&parent.to_string()) {
                Some(val) => {
                    val.push(commit.id.to_string());
                },
                None => {},
            }
        }
    }

    let mut res: Vec<String> = vec![];

    while !child_map.is_empty() {
        let mut zero_child_commits: Vec<String> = child_map.iter().filter(|(k, v)| v.is_empty()).map(|val| val.0.to_owned()).collect();
        zero_child_commits.sort_by_key(|commit| commit_objects.get(commit).unwrap().time().unwrap());
        zero_child_commits.reverse();
        for commit in &zero_child_commits {
            child_map.remove(commit);
            res.push(commit.to_string());
            for (_, children) in &mut child_map {
                if children.contains(commit) {
                    children.retain(|c| c != commit);
                }
            }
        }
    }
    res.reverse();
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
                .returning(|_, _, _, _, _, _, _, _| Ok(()));

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

pub fn get_redeploy_attempts() -> i32 {
    std::env::var(GOSH_DEPLOY_RETRIES)
        .ok()
        .and_then(|num| i32::from_str_radix(&num, 10).ok())
        .unwrap_or(MAX_REDEPLOY_ATTEMPTS)
}