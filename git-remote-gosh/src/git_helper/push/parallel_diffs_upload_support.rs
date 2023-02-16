use crate::blockchain::{snapshot::PushDiffCoordinate, BlockchainContractAddress};
use crate::blockchain::{BlockchainService, FormatShort, MAX_ACCOUNTS_ADDRESSES_PER_QUERY};
use crate::git_helper::push::push_diff::{diff_address, is_diff_deployed, push_diff};
use crate::git_helper::GitHelper;

use anyhow::bail;
use std::collections::{HashMap, HashSet};
use std::vec::Vec;
use tokio::task::JoinSet;
use tracing::Instrument;

const MAX_RETRIES_FOR_DIFFS_TO_APPEAR: i32 = 20; // x 3sec

pub struct ParallelDiffsUploadSupport {
    parallels: HashMap<String, u32>,
    next_index: HashMap<String, u32>,
    dangling_diffs: HashMap<String, (PushDiffCoordinate, ParallelDiff)>,
    next_parallel_index: u32,
    last_commit_id: git_hash::ObjectId,
    expecting_deployed_contacts_addresses: Vec<BlockchainContractAddress>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone)]
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
            expecting_deployed_contacts_addresses: vec![],
            pushed_blobs: JoinSet::new(),
        }
    }

    #[instrument(level = "info", skip_all)]
    pub async fn push_dangling(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
    ) -> anyhow::Result<()> {
        for (diff_coordinates, parallel_diff) in self.dangling_diffs.values() {
            {
                let blockchain = context.blockchain.clone();
                let dao_address: BlockchainContractAddress = context.dao_addr.clone();
                let remote_network: String = context.remote.network.clone();
                let diff_coordinates = diff_coordinates.clone();
                let parallel_diff = parallel_diff.clone();
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
                            &parallel_diff.commit_id,
                            &parallel_diff.branch_name,
                            &parallel_diff.blob_id,
                            &parallel_diff.file_path,
                            &diff_coordinates,
                            &last_commit_id,
                            true, // <- It is known now
                            &parallel_diff.original_snapshot_content,
                            &parallel_diff.diff,
                            &parallel_diff.new_snapshot_content,
                        )
                        .await
                    }
                    .instrument(info_span!("tokio::spawn::push_diff").or_current()),
                );
            }
            let mut repo_contract = context.blockchain.repo_contract().clone();
            let diff_contract_address = diff_address(
                &context.blockchain.client(),
                &mut repo_contract,
                &self.last_commit_id,
                diff_coordinates,
            )
            .await?;
            tracing::trace!(
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

    pub async fn wait_all_diffs<B>(&mut self, blockchain: B) -> anyhow::Result<()>
    where
        B: BlockchainService + 'static,
    {
        // TODO:
        // - Let user know if we reached it
        // - Make it configurable
        tracing::trace!(
            "Expecting the following diff contracts to be deployed: {:?}",
            self.expecting_deployed_contacts_addresses
        );
        while let Some(finished_task) = self.pushed_blobs.join_next().await {
            match finished_task {
                Err(e) => {
                    bail!("diffs joih-handler: {}", e);
                }
                Ok(Err(e)) => {
                    bail!("diffs inner: {}", e);
                }
                Ok(Ok(_)) => {}
            }
        }
        ParallelDiffsUploadSupport::wait_contracts_deployed(
            &blockchain,
            &self.expecting_deployed_contacts_addresses,
        )
        .await
    }

    #[instrument(level = "info", skip_all)]
    pub async fn wait_contracts_deployed<B>(
        blockchain: &B,
        addresses: &[BlockchainContractAddress],
    ) -> anyhow::Result<()>
    where
        B: BlockchainService + 'static,
    {
        tracing::trace!("wait_contracts_deployed: addresses={addresses:?}");
        let mut deploymend_results: JoinSet<anyhow::Result<()>> = JoinSet::new();
        for chunk in addresses.chunks(MAX_ACCOUNTS_ADDRESSES_PER_QUERY) {
            let mut waiting_for_addresses = Vec::from(addresses);
            let b = blockchain.clone();
            deploymend_results.spawn(
                async move {
                    let mut iteration = 0;
                    while !waiting_for_addresses.is_empty() {
                        iteration += 1;
                        if iteration > MAX_RETRIES_FOR_DIFFS_TO_APPEAR + 1 {
                            anyhow::bail!(
                                "Some contracts didn't appear in time: {}",
                                waiting_for_addresses.format_short()
                            );
                        }
                        match b
                            .get_contracts_state_raw_data(&waiting_for_addresses, true)
                            .await
                        {
                            Ok(available_bocs) => {
                                let found_addresses: Vec<BlockchainContractAddress> =
                                    available_bocs.into_keys().collect();
                                let available: HashSet<BlockchainContractAddress> =
                                    HashSet::from_iter(found_addresses.iter().cloned());
                                waiting_for_addresses.retain(|e| !available.contains(e));
                                if !waiting_for_addresses.is_empty() {
                                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                                    tracing::trace!(
                                        "Addresses {} are not ready yet. iteration {}",
                                        waiting_for_addresses.format_short(),
                                        iteration
                                    );
                                }
                            }
                            Err(ref e) => {
                                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                                tracing::trace!(
                                    "State request failed with: {}. iteration {}",
                                    e,
                                    iteration
                                );
                            }
                        }
                    } // While loop
                    Ok(())
                } //move
                .instrument(info_span!("tokio::spawn::wait_diff_deployed").or_current()),
            );
        }
        while let Some(res) = deploymend_results.join_next().await {
            let _: () = res??;
        }
        Ok(())
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
                    tracing::trace!(
                        "diff {} is not ready yet. iteration {}",
                        expecting_address,
                        iteration
                    );
                }
                Err(ref e) => {
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    tracing::trace!(
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
                let blockchain = context.blockchain.clone();
                let dao_address: BlockchainContractAddress = context.dao_addr.clone();
                let remote_network: String = context.remote.network.clone();
                let diff_coordinates = diff_coordinates.clone();
                let parallel_diff = parallel_diff.clone();
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
                            &parallel_diff.commit_id,
                            &parallel_diff.branch_name,
                            &parallel_diff.blob_id,
                            &parallel_diff.file_path,
                            &diff_coordinates,
                            &last_commit_id,
                            false, // <- It is known now
                            &parallel_diff.original_snapshot_content,
                            &parallel_diff.diff,
                            &parallel_diff.new_snapshot_content,
                        )
                        .await
                    }
                    .instrument(info_span!("tokio::spawn::push_diff").or_current()),
                );
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
