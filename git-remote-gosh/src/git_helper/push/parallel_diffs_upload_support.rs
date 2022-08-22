use super::Result;
use crate::blockchain::user_wallet;
use crate::blockchain::{self, snapshot::PushDiffCoordinate};
use crate::git_helper::GitHelper;
use futures::stream::FuturesUnordered;
use futures::StreamExt;
use std::collections::HashMap;
use std::vec::Vec;

const MAX_RETRIES_FOR_DIFFS_TO_APPEAR: i32 = 20; // x 3sec

pub struct ParallelDiffsUploadSupport {
    parallels: HashMap<String, u32>,
    next_index: HashMap<String, u32>,
    dangling_diffs: HashMap<String, (PushDiffCoordinate, ParallelDiff)>,
    next_parallel_index: u32,
    last_commit_id: git_hash::ObjectId,
    expecting_deployed_contacts_addresses: Vec<String>,
    pushed_blobs:
        FuturesUnordered<tokio::task::JoinHandle<std::result::Result<(), std::string::String>>>,
}

pub struct ParallelDiff {
    commit_id: git_hash::ObjectId,
    branch_name: String,
    blob_id: git_hash::ObjectId,
    file_path: String,
    original_snapshot_content: Vec<u8>,
    diff: Vec<u8>,
    new_snapshot_content: Vec<u8>,
}

impl ParallelDiff {
    pub fn new(
        commit_id: git_hash::ObjectId,
        branch_name: String,
        blob_id: git_hash::ObjectId,
        file_path: String,
        original_snapshot_content: Vec<u8>,
        diff: Vec<u8>,
        new_snapshot_content: Vec<u8>,
    ) -> Self {
        Self {
            commit_id,
            branch_name,
            blob_id,
            file_path,
            original_snapshot_content,
            diff,
            new_snapshot_content,
        }
    }
}

impl ParallelDiffsUploadSupport {
    pub fn get_parallels_number(&self) -> u32 {
        self.next_parallel_index
    }
    pub fn new(last_commit_id: &git_hash::ObjectId) -> Self {
        Self {
            parallels: HashMap::new(),
            next_index: HashMap::new(),
            dangling_diffs: HashMap::new(),
            next_parallel_index: 0,
            last_commit_id: last_commit_id.clone(),
            expecting_deployed_contacts_addresses: vec![],
            pushed_blobs: FuturesUnordered::new(),
        }
    }

    pub async fn push_dangling(&mut self, context: &mut GitHelper) -> Result<()> {
        for (
            diff_coordinates,
            ParallelDiff {
                commit_id,
                branch_name,
                blob_id,
                file_path,
                original_snapshot_content,
                diff,
                new_snapshot_content,
            },
        ) in self.dangling_diffs.values().into_iter()
        {
            let wallet = user_wallet(context).await?;
            let mut repo_contract = context.repo_contract.clone();
            self.pushed_blobs.push(
                blockchain::snapshot::push_diff(
                    &context.ipfs_client,
                    &context.es_client,
                    &wallet,
                    &mut repo_contract,
                    &commit_id,
                    &branch_name,
                    &context.remote.repo,
                    &blob_id,
                    &file_path,
                    &diff_coordinates,
                    &self.last_commit_id,
                    true, // <- It is known now
                    original_snapshot_content,
                    diff,
                    new_snapshot_content,
                )
                .await?,
            );
            let diff_contract_address = blockchain::snapshot::diff_address(
                &context.es_client,
                &mut context.repo_contract,
                &self.last_commit_id,
                &diff_coordinates,
            )
            .await?;
            log::debug!(
                "diff_contract_address <commit: {}, coord: {:?}>: {}",
                self.last_commit_id,
                diff_coordinates,
                diff_contract_address
            );
            self.expecting_deployed_contacts_addresses
                .push(diff_contract_address);
        }
        Ok(())
    }

    pub async fn wait_all_diffs(&mut self, context: &mut GitHelper) -> Result<()> {
        // TODO:
        // - Let user know if we reached it
        // - Make it configurable
        let mut index = 0;
        log::debug!(
            "Expecting the following diff contracts to be deployed: {:?}",
            self.expecting_deployed_contacts_addresses
        );
        while let Some(finished_task) = self.pushed_blobs.next().await {
            match finished_task {
                Err(e) => {
                    panic!("{}", e);
                }
                Ok(result) => {}
            }
        }
        let mut attempt = 0;
        loop {
            if index >= self.expecting_deployed_contacts_addresses.len() {
                return Ok(());
            }
            let expecting_address = self
                .expecting_deployed_contacts_addresses
                .get(index)
                .unwrap();
            if blockchain::snapshot::is_diff_deployed(&context.es_client, expecting_address).await?
            {
                index += 1;
                attempt = 0;
            } else {
                //TODO: replace with web-socket listen
                std::thread::sleep(std::time::Duration::from_secs(3));
                attempt += 1;
                if attempt == MAX_RETRIES_FOR_DIFFS_TO_APPEAR {
                    panic!(
                        "Some contracts didn't appear in time: {}",
                        expecting_address
                    );
                }
            }
        }
    }

    pub async fn push(&mut self, context: &mut GitHelper, diff: ParallelDiff) -> Result<()> {
        match self.dangling_diffs.get(&diff.file_path) {
            None => {}
            Some((
                diff_coordinates,
                ParallelDiff {
                    commit_id,
                    branch_name,
                    blob_id,
                    file_path,
                    original_snapshot_content,
                    diff,
                    new_snapshot_content,
                },
            )) => {
                let wallet = user_wallet(context).await?;
                let mut repo_contract = context.repo_contract.clone();
                self.pushed_blobs.push(
                    blockchain::snapshot::push_diff(
                        &context.ipfs_client,
                        &context.es_client,
                        &wallet,
                        &mut repo_contract,
                        &commit_id,
                        &branch_name,
                        &context.remote.repo,
                        &blob_id,
                        &file_path,
                        &diff_coordinates,
                        &self.last_commit_id,
                        false, // <- It is known now
                        original_snapshot_content,
                        diff,
                        new_snapshot_content,
                    )
                    .await?,
                );
            }
        }
        let diff_coordinates = self.next_diff(&diff.file_path);
        self.dangling_diffs
            .insert(diff.file_path.clone(), (diff_coordinates, diff));
        Ok(())
    }

    fn next_diff(&mut self, file_path: &str) -> PushDiffCoordinate {
        if !self.parallels.contains_key(file_path) {
            self.parallels
                .insert(file_path.to_string(), self.next_parallel_index);
            self.next_index.insert(file_path.to_string(), 0);
            self.next_parallel_index += 1;
        }

        let index_of_parallel_thread = self.parallels[file_path];
        let order_of_diff_in_the_parallel_thread = self.next_index[file_path];
        self.next_index.insert(
            file_path.to_string(),
            order_of_diff_in_the_parallel_thread + 1,
        );
        return PushDiffCoordinate {
            index_of_parallel_thread,
            order_of_diff_in_the_parallel_thread,
        };
    }
}
