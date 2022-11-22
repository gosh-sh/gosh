use self::push_diff::push_initial_snapshot;

use super::GitHelper;
use crate::{
    blockchain::{get_commit_address, BlockchainContractAddress, BlockchainService, ZERO_SHA},
    git_helper::push::{
        create_branch::CreateBranchOperation, utilities::retry::default_retry_strategy,
    },
};
use git_hash::{self, ObjectId};
use git_odb::Find;
use std::{
    collections::{HashMap, HashSet},
    process::{Command, Stdio},
    str::FromStr,
    vec::Vec,
};
use tokio::task::{JoinError, JoinSet};
use tokio_retry::Retry;
use tracing::Instrument;

pub mod create_branch;
mod parallel_diffs_upload_support;
mod push_diff;
mod push_tree;
use push_tree::push_tree;
mod utilities;
use parallel_diffs_upload_support::{ParallelDiff, ParallelDiffsUploadSupport};

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

impl<Blockchain> GitHelper<Blockchain>
where
    Blockchain: BlockchainService + 'static,
{
    #[instrument(level = "debug", skip(self, statistics, parallel_diffs_upload_support))]
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

    #[instrument(
        level = "debug",
        skip(
            self,
            statistics,
            parallel_diffs_upload_support,
            parallel_snapshot_uploads
        )
    )]
    async fn push_new_blob(
        &mut self,
        file_path: &str,
        blob_id: &ObjectId,
        commit_id: &ObjectId,
        branch_name: &str,
        statistics: &mut PushBlobStatistics,
        parallel_diffs_upload_support: &mut ParallelDiffsUploadSupport,
        parallel_snapshot_uploads: &mut JoinSet<anyhow::Result<()>>,
    ) -> anyhow::Result<()> {
        {
            let blockchain = self.blockchain.clone();
            let repo_address = self.repo_addr.clone();
            let dao_addr = self.dao_addr.clone();
            let remote_network = self.remote.network.clone();
            let branch_name = branch_name.to_string();
            let file_path = file_path.to_string();

            parallel_snapshot_uploads.spawn(
                async move {
                    push_initial_snapshot(
                        blockchain,
                        repo_address,
                        dao_addr,
                        remote_network,
                        branch_name,
                        file_path,
                    )
                    .await
                }
                .instrument(debug_span!("tokio::spawn::push_initial_snapshot").or_current()),
            );
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

    #[instrument(level = "debug", skip(self, statistics, parallel_diffs_upload_support))]
    async fn push_blob_remove(
        &mut self,
        file_path: &str,
        blob_id: &ObjectId,
        commit_id: &ObjectId,
        branch_name: &str,
        statistics: &mut PushBlobStatistics,
        parallel_diffs_upload_support: &mut ParallelDiffsUploadSupport,
    ) -> anyhow::Result<()> {
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

    #[instrument(level = "debug", skip(self))]
    fn tree_root_for_commit(&mut self, commit_id: &ObjectId) -> ObjectId {
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

    #[instrument(level = "debug", skip(self))]
    fn get_parent_id(&mut self, commit_id: &ObjectId) -> anyhow::Result<ObjectId> {
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

    #[instrument(level = "debug", skip(self))]
    async fn find_ancestor_commit_in_remote_repo(
        &self,
        remote_branch_name: &str,
        remote_commit_addr: BlockchainContractAddress,
    ) -> anyhow::Result<(String, Option<ObjectId>)> {
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
        let commit = self
            .blockchain
            .get_commit_by_addr(&remote_commit_addr)
            .await?
            .unwrap();
        let prev_commit_id = Some(ObjectId::from_str(&commit.sha)?);

        Ok((
            if commit.sha != ZERO_SHA.to_owned() {
                commit.sha
            } else {
                String::new()
            },
            prev_commit_id,
        ))
    }

    #[instrument(
        level = "debug",
        skip(
            self,
            statistics,
            parallel_diffs_upload_support,
            parallel_snapshot_uploads,
            push_handlers,
            parents_of_commits
        )
    )]
    async fn push_commit_object<'a>(
        &mut self,
        oid: &'a str,
        object_id: ObjectId,
        remote_branch_name: &str,
        local_branch_name: &str,
        parents_of_commits: &mut HashMap<&'a str, Vec<String>>,
        push_handlers: &mut JoinSet<anyhow::Result<()>>,
        prev_commit_id: &mut Option<ObjectId>,
        statistics: &mut PushBlobStatistics,
        parallel_diffs_upload_support: &mut ParallelDiffsUploadSupport,
        parallel_snapshot_uploads: &mut JoinSet<anyhow::Result<()>>,
    ) -> anyhow::Result<()> {
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
            parents_of_commits.insert(oid, parent_ids.clone());
        } else {
            parents_of_commits.insert(oid, vec![ZERO_SHA.to_owned()]);
            // if parent_ids is empty, add bogus parent
            parent_ids.push(ZERO_SHA.to_string());
        }
        let mut parents: Vec<BlockchainContractAddress> = vec![];
        let mut repo_contract = self.blockchain.repo_contract().clone();

        for id in parent_ids {
            let parent = get_commit_address(
                &self.blockchain.client(),
                &mut repo_contract,
                &id.to_string(),
            )
            .await?;
            parents.push(parent);
        }
        let tree_addr = self.calculate_tree_address(tree_id).await?;

        {
            let blockchain = self.blockchain.clone();
            let remote = self.remote.clone();
            let dao_addr = self.dao_addr.clone();
            let object_id = object_id.clone();
            let tree_addr = tree_addr.clone();
            let branch_name = remote_branch_name.to_owned().clone();

            push_handlers.spawn(
                async move {
                    Retry::spawn(default_retry_strategy(), || async {
                        blockchain
                            .push_commit(
                                &object_id,
                                &branch_name,
                                &tree_addr,
                                &remote,
                                &dao_addr,
                                &raw_commit,
                                &*parents,
                            )
                            .await
                            .map_err(|e| {
                                tracing::warn!("Attempt failed with {:#?}", e);
                                e
                            })
                    })
                    .await
                }
                .instrument(debug_span!("tokio::spawn::push_commit").or_current()),
            );
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
            )
            .await?;
        }

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

        *prev_commit_id = Some(object_id);
        Ok(())
    }

    // find ancestor commit
    #[instrument(level = "debug", skip(self))]
    async fn push_ref(&mut self, local_ref: &str, remote_ref: &str) -> anyhow::Result<String> {
        // Note:
        // Here is the problem. We have file snapshot per branch per path.
        // However in git file is not attached to a branch neither it is bound to a path.
        // Our first approach was to take what objects are different in git.
        // This led to a problem that some files were copied from one place to another
        // and snapshots were not created since git didn't count them as changed.
        // Our second attempt is to calculated tree diff from one commit to another.
        tracing::info!("push_ref {} : {}", local_ref, remote_ref);
        fn get_branch_name(_ref: &str) -> anyhow::Result<&str> {
            let mut iter = _ref.rsplit('/');
            iter.next()
                .ok_or(anyhow::anyhow!("wrong ref format '{}'", &_ref))
        }
        let local_branch_name: &str = get_branch_name(local_ref)?;
        let remote_branch_name: &str = get_branch_name(remote_ref)?;

        // 1. Check if branch exists and ready in the blockchain

        let remote_commit_addr = self
            .blockchain
            .remote_rev_parse(&self.repo_addr, remote_branch_name)
            .await?
            .map(|pair| pair.0);

        // 2. Find ancestor commit in local repo

        // find ancestor commit in remote repo, if the remote branch was found
        let (ancestor_commit_id, mut prev_commit_id) =
            if let Some(remote_commit_addr) = remote_commit_addr {
                self.find_ancestor_commit_in_remote_repo(remote_branch_name, remote_commit_addr)
                    .await?
            } else {
                // prev_commit_id is not filled up here. It's Ok.
                // this means a branch is created and all initial states are filled there
                ("".to_owned(), None)
            };

        // get list of git objects in local repo, excluding ancestor ones
        let (commit_objects_list, status) =
            get_list_of_commit_objects(local_ref, &ancestor_commit_id)?;
        if !status {
            // TODO: Check if it is right to return Ok here
            return Ok(format!("error {remote_ref} fetch first\n"));
        }

        // 3. If branch needs to be created do so
        if prev_commit_id.is_none() {
            //    ---
            //    Otherwise check if a head of the branch
            //    is pointing to the ancestor commit. Fail
            //    if it doesn't
            let originating_commit = git_hash::ObjectId::from_str(
                commit_objects_list
                    .lines()
                    .next()
                    .expect("git object list is empty"),
            )?;
            let branching_point = self.get_parent_id(&originating_commit)?;
            let mut create_branch_op =
                CreateBranchOperation::new(branching_point, remote_branch_name, self);
            let is_first_ever_branch = create_branch_op.run().await?;
            prev_commit_id = {
                if is_first_ever_branch {
                    None
                } else {
                    Some(originating_commit)
                }
            };
        }

        // 4. Do prepare commit for all commits
        // 5. Deploy tree objects of all commits
        // 6. Deploy all **new** snapshot
        // 7. Deploy diff contracts
        // 8. Deploy all commit objects

        // create collections for spawned tasks and statistics
        let mut push_handlers: JoinSet<anyhow::Result<()>> = JoinSet::new();
        let mut parallel_snapshot_uploads: JoinSet<anyhow::Result<()>> = JoinSet::new();
        let mut parents_of_commits: HashMap<&str, Vec<String>> =
            HashMap::from([(ZERO_SHA, vec![]), ("", vec![])]);
        let mut visited_trees: HashSet<ObjectId> = HashSet::new();
        let mut statistics = PushBlobStatistics::new();

        let latest_commit_id = self
            .local_repository()
            .find_reference(local_ref)?
            .into_fully_peeled_id()?
            .object()?
            .id;

        tracing::debug!("latest commit id {latest_commit_id}");
        let mut parallel_diffs_upload_support = ParallelDiffsUploadSupport::new(&latest_commit_id);

        // iterate through the git objects list and push them
        for line in commit_objects_list.lines() {
            let Some(oid) = line.split_ascii_whitespace().next() else {
                break;
            };
            let object_id = git_hash::ObjectId::from_str(oid)?;
            let object_kind = self.local_repository().find_object(object_id)?.kind;
            match object_kind {
                git_object::Kind::Commit => {
                    self.push_commit_object(
                        oid,
                        object_id,
                        remote_branch_name,
                        local_branch_name,
                        &mut parents_of_commits,
                        &mut push_handlers,
                        &mut prev_commit_id,
                        &mut statistics,
                        &mut parallel_diffs_upload_support,
                        &mut parallel_snapshot_uploads,
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
                    let _ =
                        push_tree(self, &object_id, &mut visited_trees, &mut push_handlers).await?;
                }
            }
        }

        // wait for all spawned collections to finish
        parallel_diffs_upload_support.push_dangling(self).await?;
        parallel_diffs_upload_support
            .wait_all_diffs(self.blockchain.clone())
            .await?;

        while let Some(finished_task) = push_handlers.join_next().await {
            let finished_task: std::result::Result<anyhow::Result<()>, JoinError> = finished_task;
            match finished_task {
                Err(e) => {
                    panic!("obj join-hanlder: {}", e);
                }
                Ok(Err(e)) => {
                    panic!("obj inner: {}", e)
                }
                Ok(Ok(_)) => {}
            }
        }

        while let Some(finished_task) = parallel_snapshot_uploads.join_next().await {
            let finished_task: std::result::Result<anyhow::Result<()>, JoinError> = finished_task;
            match finished_task {
                Err(e) => {
                    panic!("snapshots join-hanlder: {}", e);
                }
                Ok(Err(e)) => {
                    panic!("snapshots inner: {}", e)
                }
                Ok(Ok(_)) => {}
            }
        }

        // 9. Set commit (move HEAD)
        let number_of_commits = calculate_left_distance(
            parents_of_commits,
            &latest_commit_id.clone().to_string(),
            &ancestor_commit_id,
        );
        self.blockchain
            .notify_commit(
                &latest_commit_id,
                local_branch_name,
                parallel_diffs_upload_support.get_parallels_number(),
                number_of_commits,
                &self.remote,
                &self.dao_addr,
            )
            .await?;

        // 10. move HEAD
        //
        let result_ok = format!("ok {remote_ref}\n");
        Ok(result_ok)
    }

    #[instrument(level = "debug", skip(self))]
    pub async fn push(&mut self, refs: &str) -> anyhow::Result<String> {
        let splitted: Vec<&str> = refs.split(':').collect();
        let result = match splitted.as_slice() {
            [remote_ref] => delete_remote_ref(remote_ref).await?,
            [local_ref, remote_ref] => self.push_ref(local_ref, remote_ref).await?,
            _ => unreachable!(),
        };
        tracing::debug!("push ref result: {result}");
        Ok(result)
    }
}

async fn delete_remote_ref(remote_ref: &str) -> anyhow::Result<String> {
    Ok("delete ref ok".to_owned())
}

#[instrument(level = "debug", skip(m))]
fn calculate_left_distance(m: HashMap<&str, Vec<String>>, from: &str, till: &str) -> u64 {
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
    _ref: &str,
    ancestor_commit_id: &str,
) -> anyhow::Result<(String, bool)> {
    // TODO: git rev-list?
    let mut cmd_args = [
        "rev-list",
        "--objects",
        "--in-commit-order",
        "--reverse",
        _ref,
    ]
    .map(String::from)
    .to_vec();

    if !ancestor_commit_id.is_empty() {
        cmd_args.push(format!("^{}", ancestor_commit_id));
    }

    let cmd = Command::new("git")
        .args(cmd_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("git rev-list failed");

    let out = cmd.wait_with_output()?;
    if !out.status.success() {
        Ok((String::new(), false))
    } else {
        Ok((String::from_utf8(out.stdout)?, true))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::git_helper::test_utils::{init_logger, shutdown_logger};
    use crate::{
        blockchain::{self, service::tests::MockEverscale},
        git_helper::{test_utils::setup_repo, tests::setup_test_helper},
    };

    #[test]
    fn ensure_calc_left_dist_correctly() {
        let m = HashMap::from([
            (
                "7986a9690ed067dc1a917b6df10342a5b9129e0b",
                vec![ZERO_SHA.to_owned()],
            ),
            (ZERO_SHA, vec![]),
        ]);
        let dist = calculate_left_distance(m, "7986a9690ed067dc1a917b6df10342a5b9129e0b", "");
        assert_eq!(dist, 1);

        let m = HashMap::from([
            (
                "5c39d86543b994882f83689fbfa79b952fa8e711",
                vec!["d043874c7e470206ddf62f21b7c7d23a6792a8f5".to_owned()],
            ),
            (
                "d043874c7e470206ddf62f21b7c7d23a6792a8f5",
                vec!["16798be2e82bc8ec3d64c27352b05d0c6552c83c".to_owned()],
            ),
            (
                "16798be2e82bc8ec3d64c27352b05d0c6552c83c",
                vec![ZERO_SHA.to_owned()],
            ),
            (ZERO_SHA, vec![]),
        ]);
        let dist = calculate_left_distance(m, "5c39d86543b994882f83689fbfa79b952fa8e711", "");
        assert_eq!(dist, 3);

        let m = HashMap::from([
            (
                "fc99c36ef31c6e5c6fef6e45acbc91018f73eef8",
                vec!["f7ccf77b87907612d3c03d21eea2d63f5345f4e4".to_owned()],
            ),
            (
                "f7ccf77b87907612d3c03d21eea2d63f5345f4e4",
                vec![ZERO_SHA.to_owned()],
            ),
            (ZERO_SHA, vec![]),
        ]);
        let dist = calculate_left_distance(m, "fc99c36ef31c6e5c6fef6e45acbc91018f73eef8", "");
        assert_eq!(dist, 2);

        let m = HashMap::from([
            (
                "d37a30e4a2023e5dd419b0ad08526fa4adb6c1d1",
                vec![
                    "eb452a9deefbf63574af0b375488029dd2c4342a".to_owned(),
                    "eb7cb820baae9165838fec6c99a6b58d8dcfd57c".to_owned(),
                ],
            ),
            (
                "eb7cb820baae9165838fec6c99a6b58d8dcfd57c",
                vec!["8b9d412c468ea82d45384edb695f388db7a9aaee".to_owned()],
            ),
            (
                "8b9d412c468ea82d45384edb695f388db7a9aaee",
                vec!["8512ab02f932cb1735e360356632c4daebec8c22".to_owned()],
            ),
            (
                "eb452a9deefbf63574af0b375488029dd2c4342a",
                vec!["8512ab02f932cb1735e360356632c4daebec8c22".to_owned()],
            ),
            (
                "8512ab02f932cb1735e360356632c4daebec8c22",
                vec!["98efe1b538f0b43593cca2c23f4f7f5141ae93df".to_owned()],
            ),
            (
                "98efe1b538f0b43593cca2c23f4f7f5141ae93df",
                vec![ZERO_SHA.to_owned()],
            ),
            (ZERO_SHA, vec![]),
        ]);
        let dist = calculate_left_distance(m, "d37a30e4a2023e5dd419b0ad08526fa4adb6c1d1", "");
        assert_eq!(dist, 4);

        let m = HashMap::from([
            (
                "a3888f56db3b43dedd32991b49842b16965041af",
                vec!["44699fc8627c1d78191f48d336e4d07d1325e38d".to_owned()],
            ),
            ("", vec![]),
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
                .returning(|_, _, _, _, _, _| Ok(()));

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
