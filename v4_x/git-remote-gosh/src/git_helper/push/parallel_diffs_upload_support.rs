use crate::blockchain::BlockchainService;
use crate::blockchain::{snapshot::PushDiffCoordinate, BlockchainContractAddress};
use crate::git_helper::push::push_diff::{diff_address, is_diff_deployed, push_diff};
use crate::git_helper::GitHelper;

use crate::blockchain::contract::wait_contracts_deployed::wait_contracts_deployed;
use anyhow::bail;
use std::collections::HashMap;
use std::vec::Vec;
use tokio::task::JoinSet;
use tracing::Instrument;
use crate::logger::trace_memory;

const MAX_RETRIES_FOR_DIFFS_TO_APPEAR: i32 = 20; // x 3sec

pub struct ParallelDiffsUploadSupport {
    parallels: HashMap<String, u32>,
    next_index: HashMap<String, u32>,
    dangling_diffs: HashMap<String, (PushDiffCoordinate, ParallelDiff)>,
    next_parallel_index: u32,
    last_commit_id: git_hash::ObjectId,
    expecting_deployed_contacts_addresses:
        HashMap<BlockchainContractAddress, (PushDiffCoordinate, ParallelDiff, bool)>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone, Debug)]
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
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(
        commit_id: git_hash::ObjectId,
        branch_name: String,
        blob_id: git_hash::ObjectId,
        file_path: String,
        original_snapshot_content: Vec<u8>,
        diff: Vec<u8>,
        new_snapshot_content: Vec<u8>,
    ) -> Self {
        tracing::trace!("new_ParallelDiff: commit_id={commit_id}, branch_name={branch_name}, blob_id={blob_id}, file_path={file_path}");
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
            last_commit_id: *last_commit_id,
            expecting_deployed_contacts_addresses: HashMap::new(),
            pushed_blobs: JoinSet::new(),
        }
    }

    pub fn get_expected(
        &self,
    ) -> &HashMap<BlockchainContractAddress, (PushDiffCoordinate, ParallelDiff, bool)> {
        &self.expecting_deployed_contacts_addresses
    }

    pub async fn add_to_push_list(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        diff_coordinates: &PushDiffCoordinate,
        parallel_diff: &ParallelDiff,
        is_last: bool,
    ) -> anyhow::Result<()> {
        let blockchain = context.blockchain.clone();
        let dao_address: BlockchainContractAddress = context.dao_addr.clone();
        let remote_network: String = context.remote.network.clone();
        let diff_coordinates_clone = diff_coordinates.clone();
        let parallel_diff_clone = parallel_diff.clone();
        let last_commit_id = self.last_commit_id.clone();
        let repo_name: String = context.remote.repo.clone();
        let ipfs_http_endpoint: String = context.config.ipfs_http_endpoint().to_string();
        self.pushed_blobs.spawn(
            async move {
                push_diff(
                    &blockchain,
                    &repo_name,
                    &dao_address,
                    &remote_network,
                    &ipfs_http_endpoint,
                    &parallel_diff_clone.commit_id,
                    &parallel_diff_clone.branch_name,
                    &parallel_diff_clone.blob_id,
                    &parallel_diff_clone.file_path,
                    &diff_coordinates_clone,
                    &last_commit_id,
                    is_last, // <- It is known now
                    &parallel_diff_clone.original_snapshot_content,
                    &parallel_diff_clone.diff,
                    &parallel_diff_clone.new_snapshot_content,
                )
                .await
            }
            .instrument(debug_span!("tokio::spawn::push_diff").or_current()),
        );
        let mut repo_contract = context.blockchain.repo_contract().clone();
        let diff_contract_address = diff_address(
            &context.blockchain.client(),
            &mut repo_contract,
            &self.last_commit_id,
            &diff_coordinates,
        )
        .await?;
        tracing::trace!(
            "diff_contract_address <commit: {}, coord: {:?}>: {}",
            self.last_commit_id,
            diff_coordinates,
            diff_contract_address
        );
        trace_memory();
        self.expecting_deployed_contacts_addresses.insert(
            diff_contract_address,
            (
                diff_coordinates.to_owned(),
                parallel_diff.to_owned(),
                is_last,
            ),
        );
        trace_memory();
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    pub async fn push_dangling(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
    ) -> anyhow::Result<()> {
        let values = self
            .dangling_diffs
            .clone()
            .into_values()
            .collect::<Vec<(PushDiffCoordinate, ParallelDiff)>>();
        for (diff_coordinates, parallel_diff) in values {
            {
                self.add_to_push_list(context, &diff_coordinates, &parallel_diff, true)
                    .await?;
            }
        }
        Ok(())
    }

    pub async fn wait_all_diffs<B>(
        &mut self,
        blockchain: B,
    ) -> anyhow::Result<Vec<BlockchainContractAddress>>
    where
        B: BlockchainService + 'static,
    {
        // TODO:
        // - Let user know if we reached it
        // - Make it configurable
        let addresses = self
            .expecting_deployed_contacts_addresses
            .clone()
            .into_keys()
            .collect::<Vec<BlockchainContractAddress>>();
        tracing::debug!(
            "Expecting the following diff contracts to be deployed: {:?}",
            addresses
        );
        trace_memory();
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
        trace_memory();
        wait_contracts_deployed(&blockchain, &addresses).await
    }

    #[instrument(level = "info", skip_all)]
    async fn wait_diff_deployed<B>(
        blockchain: &B,
        expecting_address: &BlockchainContractAddress,
    ) -> anyhow::Result<()>
    where
        B: BlockchainService,
    {
        tracing::trace!("wait_diff_deployed: expecting_address={expecting_address}");
        for iteration in 0..MAX_RETRIES_FOR_DIFFS_TO_APPEAR {
            let is_diff_deployed_result =
                is_diff_deployed(blockchain.client(), expecting_address).await;
            match is_diff_deployed_result {
                Ok(true) => {
                    return Ok(());
                }
                Ok(false) => {
                    //TODO: replace with web-socket listen
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    tracing::debug!(
                        "diff {} is not ready yet. iteration {}",
                        expecting_address,
                        iteration
                    );
                }
                Err(ref e) => {
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    tracing::debug!(
                        "Is diff deployed failed with: {}. iteration {}",
                        e,
                        iteration
                    );
                }
            }
        }
        anyhow::bail!(
            "Some contracts didn't appear in time: {}",
            expecting_address
        );
    }

    #[instrument(level = "info", skip_all)]
    pub async fn push(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        diff: ParallelDiff,
    ) -> anyhow::Result<()> {
        let diff_coordinates = self.next_diff(&diff.file_path);
        let prev_value = self
            .dangling_diffs
            .insert(diff.file_path.clone(), (diff_coordinates, diff));

        match prev_value {
            None => {}
            Some((diff_coordinates, parallel_diff)) => {
                self.add_to_push_list(context, &diff_coordinates, &parallel_diff, false)
                    .await?;
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
