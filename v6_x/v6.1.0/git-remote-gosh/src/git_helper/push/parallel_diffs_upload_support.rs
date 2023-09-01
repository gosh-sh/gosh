use crate::blockchain::BlockchainService;
use crate::blockchain::{snapshot::PushDiffCoordinate, BlockchainContractAddress};
use crate::git_helper::push::push_diff::{diff_address, is_diff_deployed, push_diff};
use crate::git_helper::GitHelper;

use crate::blockchain::snapshot::diffs::wait_diffs_ready::wait_diffs_until_ready;
use anyhow::bail;
use std::collections::HashMap;
use std::vec::Vec;
use tokio::task::JoinSet;
use tracing::Instrument;
use crate::git_helper::push::get_redeploy_attempts;
use crate::git_helper::push::parallel_snapshot_upload_support::get_push_chunk;

const MAX_RETRIES_FOR_DIFFS_TO_APPEAR: i32 = 20; // x 3sec

pub struct ParallelDiffsUploadSupport {
    parallels: HashMap<String, u32>,
    next_index: HashMap<String, u32>,
    dangling_diffs: Vec<String>,
    next_parallel_index: u32,
    last_commit_id: git_hash::ObjectId,
    expecting_deployed_contacts_addresses: Vec<String>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone, Debug)]
pub struct ParallelDiff {
    pub commit_id: git_hash::ObjectId,
    pub branch_name: String,
    pub blob_id: git_hash::ObjectId,
    pub file_path: String,
    pub original_snapshot_content: Vec<u8>,
    pub diff: Vec<u8>,
    pub new_snapshot_content: Vec<u8>,
    pub snapshot_address: String,
}

impl ParallelDiff {
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(
        commit_id: git_hash::ObjectId,
        branch_name: String,
        blob_id: git_hash::ObjectId,
        file_path: String,
        original_snapshot_content: Vec<u8>,
        diff: Vec<u8>,
        new_snapshot_content: Vec<u8>,
        snapshot_address: String,
    ) -> Self {
        tracing::trace!("new_ParallelDiff: commit_id={commit_id}, branch_name={branch_name}, blob_id={blob_id}, file_path={file_path}, snapshot_address={snapshot_address}");
        Self {
            commit_id,
            branch_name,
            blob_id,
            file_path,
            original_snapshot_content,
            diff,
            new_snapshot_content,
            snapshot_address,
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
            dangling_diffs: vec![],
            next_parallel_index: 0,
            last_commit_id: *last_commit_id,
            expecting_deployed_contacts_addresses: vec![],
            pushed_blobs: JoinSet::new(),
        }
    }

    pub fn get_expected(&self) -> &Vec<String> {
        &self.expecting_deployed_contacts_addresses
    }

    pub fn push_expected(&mut self, value: String) {
        self.expecting_deployed_contacts_addresses.push(value);
    }

    pub async fn start_push(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
    ) -> anyhow::Result<()> {
        let chunk_size = get_push_chunk();
        let max_attempts = get_redeploy_attempts();
        tracing::trace!("Start push of diffs, chunk_size={chunk_size}, max_attempts={max_attempts}");
        let mut exp: Vec<BlockchainContractAddress> = self.expecting_deployed_contacts_addresses.iter().map(|addr| BlockchainContractAddress::new(addr)).collect();
        let mut attempt = 0;
        let mut last_rest_cnt = 0;
        loop {
            if attempt == max_attempts {
                anyhow::bail!("Failed to deploy snapshots. Undeployed snapshots: {exp:?}");
            }
            let mut rest = vec![];
            for chunk in exp.chunks(chunk_size) {
                for addr in chunk {
                    self.add_to_push_list(context, &String::from(addr)).await?;
                }
                self.finish_push().await?;
                let mut tmp_rest = wait_diffs_until_ready(&context.blockchain, chunk).await?;
                rest.append(&mut tmp_rest);
            }
            exp = rest;
            if exp.is_empty() {
                break;
            }
            if exp.len() != last_rest_cnt {
                attempt = 0;
            }
            last_rest_cnt = exp.len();

            attempt += 1;
        }
        Ok(())
    }


    pub async fn add_to_push_list(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        diff_address: &String,
    ) -> anyhow::Result<()> {
        let diff_address = diff_address.to_owned();
        let blockchain = context.blockchain.clone();
        let dao_address: BlockchainContractAddress = context.dao_addr.clone();
        let remote_network: String = context.remote.network.clone();
        let last_commit_id = self.last_commit_id.clone();
        let repo_name: String = context.remote.repo.clone();
        let ipfs_http_endpoint: String = context.config.ipfs_http_endpoint().to_string();
        tracing::trace!("start push of diff: {}", diff_address);

        let database = context.get_db()?.clone();

        // self.expecting_deployed_contacts_addresses
        //     .push(diff_address.clone());
        self.pushed_blobs.spawn(
            async move {
                push_diff(
                    &blockchain,
                    &repo_name,
                    &dao_address,
                    &remote_network,
                    &ipfs_http_endpoint,
                    &last_commit_id,
                    diff_address,
                    database,
                )
                .await
            }
            .instrument(debug_span!("tokio::spawn::push_diff").or_current()),
        );
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    pub async fn push_dangling(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
    ) -> anyhow::Result<()> {
        let values = context.get_db()?.get_all_dangling_diffs()?;
        for (parallel_diff, diff_coordinates) in values {
            {
                let mut repo_contract = context.blockchain.repo_contract().clone();
                let diff_contract_address = diff_address(
                    &context.blockchain.client(),
                    &mut repo_contract,
                    &self.last_commit_id,
                    &diff_coordinates,
                )
                .await?;
                let diff_contract_address = String::from(diff_contract_address);

                if !context.get_db()?.diff_exists(&diff_contract_address)? {
                    context.get_db()?.put_diff(
                        (&parallel_diff, diff_coordinates, true),
                        diff_contract_address.clone(),
                    )?;

                    // self.add_to_push_list(context, diff_contract_address)
                    //     .await?;
                    // } else {
                    //     self.push_expected(diff_contract_address);
                }
                self.push_expected(diff_contract_address);
            }
        }
        Ok(())
    }

    async fn finish_push(&mut self) -> anyhow::Result<()> {
        while let Some(finished_task) = self.pushed_blobs.join_next().await {
            match finished_task {
                Err(e) => {
                    bail!("diffs join-handler: {}", e);
                }
                Ok(Err(e)) => {
                    bail!("diffs inner: {}", e);
                }
                Ok(Ok(_)) => {}
            }
        }
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    pub async fn push(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        diff: ParallelDiff,
    ) -> anyhow::Result<()> {
        let file_path = diff.file_path.clone();
        let diff_coordinates = self.next_diff(&file_path);
        let prev_value = if self.dangling_diffs.contains(&file_path) {
            Some(context.get_db()?.get_dangling_diff(&file_path)?)
        } else {
            self.dangling_diffs.push(file_path.clone());
            None
        };

        context
            .get_db()?
            .put_dangling_diff((&diff, diff_coordinates), file_path)?;

        match prev_value {
            None => {}
            Some((parallel_diff, diff_coordinates)) => {
                let mut repo_contract = context.blockchain.repo_contract().clone();
                let diff_contract_address = diff_address(
                    &context.blockchain.client(),
                    &mut repo_contract,
                    &self.last_commit_id,
                    &diff_coordinates,
                )
                .await?;
                let diff_contract_address = String::from(diff_contract_address);

                if !context.get_db()?.diff_exists(&diff_contract_address)? {
                    context.get_db()?.put_diff(
                        (&parallel_diff, diff_coordinates, false),
                        diff_contract_address.clone(),
                    )?;

                    // self.add_to_push_list(context, diff_contract_address)
                    //     .await?;
                    // } else {
                    //     self.push_expected(diff_contract_address);
                }
                self.push_expected(diff_contract_address);
            }
        }
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    fn next_diff(&mut self, file_path: &str) -> PushDiffCoordinate {
        tracing::trace!("next_diff: file_path={file_path}");
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
        PushDiffCoordinate {
            index_of_parallel_thread,
            order_of_diff_in_the_parallel_thread,
        }
    }
}
