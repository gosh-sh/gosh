use crate::{
    blockchain::{
        contract::wait_contracts_deployed::wait_contracts_deployed,
        tree::{load::check_if_tree_is_ready, TreeNode},
        user_wallet::WalletError, AddrVersion, BlockchainContractAddress,
        BlockchainService,
    },
    git_helper::{
        push::{
            push_diff::push_initial_snapshot, push_tree::inner_deploy_tree,
            utilities::retry::default_retry_strategy,
        },
        GitHelper,
    },
};
use anyhow::bail;
use git_hash::ObjectId;
use std::time::Duration;
use std::{collections::HashMap, sync::Arc, vec::Vec};
use tokio::time::sleep;
use tokio::{sync::Semaphore, task::JoinSet};
use tokio_retry::RetryIf;
use tracing::Instrument;
use crate::blockchain::snapshot::wait_snapshots_until_ready;

const WAIT_TREE_READY_MAX_ATTEMPTS: i32 = 3;

// TODO: refactor this code and unite all this parallel pushes

pub struct ParallelSnapshotUploadSupport {
    expecting_deployed_contacts_addresses: Vec<(String, Option<BlockchainContractAddress>)>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ParallelSnapshot {
    pub branch_name: String,
    pub file_path: String,
    pub upgrade: bool,
    pub commit_id: String,
}

impl ParallelSnapshot {
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(branch_name: String, file_path: String, upgrade: bool, commit_id: String) -> Self {
        tracing::trace!(
            "new_ParallelSnapshot branch_name:{}, file_path:{}, upgrade:{}, commit_id:{}",
            branch_name,
            file_path,
            upgrade,
            commit_id
        );
        Self {
            branch_name,
            file_path,
            upgrade,
            commit_id,
        }
    }
}

impl ParallelSnapshotUploadSupport {
    pub fn new() -> Self {
        Self {
            expecting_deployed_contacts_addresses: vec![],
            pushed_blobs: JoinSet::new(),
        }
    }

    pub fn get_expected(&self) -> Vec<String> {
        self.expecting_deployed_contacts_addresses.clone().iter().map(|val| val.0.clone()).collect()
    }

    pub fn push_expected(&mut self, value: String, prev_repo: Option<BlockchainContractAddress>) {
        self.expecting_deployed_contacts_addresses.push((value, prev_repo));
    }

    pub async fn start_push(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
    ) -> anyhow::Result<()> {
        let exp = self.expecting_deployed_contacts_addresses.clone();
        for (addr, prev_repo) in exp {
            self.add_to_push_list(
                context,
                addr,
                prev_repo
            ).await?;
        }
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    pub async fn add_to_push_list(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        snapshot_address: String,
        prev_repo_address: Option<BlockchainContractAddress>,
    ) -> anyhow::Result<()> {
        let blockchain = context.blockchain.clone();
        let dao_address: BlockchainContractAddress = context.dao_addr.clone();
        let remote_network: String = context.remote.network.clone();
        let repo_address = context.repo_addr.clone();

        tracing::trace!("Start push of snapshot: address: {snapshot_address:?}");

        // self.expecting_deployed_contacts_addresses
        //     .push(snapshot_address.to_string());

        let database = context.get_db()?.clone();
        self.pushed_blobs.spawn(
            async move {
                push_initial_snapshot(
                    blockchain,
                    repo_address,
                    dao_address,
                    remote_network,
                    snapshot_address,
                    database,
                    prev_repo_address,
                )
                .await
            }
            .instrument(info_span!("tokio::spawn::push_initial_snapshot").or_current()),
        );
        Ok(())
    }

    pub async fn wait_all_snapshots<B>(
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
            .iter()
            .map(|addr| BlockchainContractAddress::new(addr.0.clone()))
            .collect::<Vec<BlockchainContractAddress>>();

        wait_snapshots_until_ready(&blockchain, &addresses).await
    }
}

pub struct ParallelCommitUploadSupport {
    expecting_deployed_contacts_addresses: Vec<String>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone, Debug)]
pub struct ParallelCommit {
    pub commit_id: ObjectId,
    pub tree_addr: BlockchainContractAddress,
    pub raw_commit: String,
    pub parents: Vec<AddrVersion>,
    pub upgrade_commit: bool,
}

impl ParallelCommit {
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(
        commit_id: ObjectId,
        tree_addr: BlockchainContractAddress,
        raw_commit: String,
        parents: Vec<AddrVersion>,
        upgrade_commit: bool,
    ) -> Self {
        Self {
            commit_id,
            tree_addr,
            raw_commit,
            parents,
            upgrade_commit,
        }
    }
}

impl ParallelCommitUploadSupport {
    pub fn new() -> Self {
        Self {
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

    #[instrument(level = "info", skip_all)]
    pub async fn add_to_push_list(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        commit_address: String,
        push_semaphore: Arc<Semaphore>,
    ) -> anyhow::Result<()> {
        let blockchain = context.blockchain.clone();
        let dao_address: BlockchainContractAddress = context.dao_addr.clone();
        let remote = context.remote.clone();
        let database = context.get_db()?.clone();

        tracing::trace!("Start push of commit: address: {commit_address:?}");

        self.expecting_deployed_contacts_addresses
            .push(commit_address.clone());

        let permit = push_semaphore.acquire_owned().await?;

        let condition = |e: &anyhow::Error| {
            if e.is::<WalletError>() {
                false
            } else {
                tracing::warn!("Attempt failed with {:#?}", e);
                true
            }
        };

        self.pushed_blobs.spawn(
            async move {
                let res = RetryIf::spawn(
                    default_retry_strategy(),
                    || async {
                        blockchain
                            .push_commit(&commit_address, &remote, &dao_address, database.clone())
                            .await
                    },
                    condition,
                )
                .await;

                drop(permit);
                res
            }
            .instrument(info_span!("tokio::spawn::push_commit").or_current()),
        );
        Ok(())
    }

    pub async fn wait_all_commits<B>(
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
            .iter()
            .map(|addr| BlockchainContractAddress::new(addr))
            .collect::<Vec<BlockchainContractAddress>>();
        tracing::debug!(
            "Expecting the following commit contracts to be deployed: {:?}",
            addresses
        );
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
        wait_contracts_deployed(&blockchain, &addresses).await
    }
}

pub struct ParallelTreeUploadSupport {
    expecting_deployed_contacts_addresses: Vec<String>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone, Debug)]
pub struct ParallelTree {
    pub tree_id: ObjectId,
    pub tree_nodes: HashMap<String, TreeNode>,
    pub sha_inner_tree: String,
}

impl ParallelTree {
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(tree_id: ObjectId, tree_nodes: HashMap<String, TreeNode>, sha_inner_tree: String) -> Self {
        tracing::trace!("new_ParallelTree tree_id:{tree_id:?}, tree_nodes:{tree_nodes:?}, sha_inner_tree:{sha_inner_tree}");
        Self {
            tree_id,
            tree_nodes,
            sha_inner_tree,
        }
    }
}

impl ParallelTreeUploadSupport {
    pub fn new() -> Self {
        Self {
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

    #[instrument(level = "info", skip_all)]
    pub async fn add_to_push_list(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        tree_address: String,
        push_semaphore: Arc<Semaphore>,
    ) -> anyhow::Result<()> {
        let blockchain = context.blockchain.clone();
        let dao_address: BlockchainContractAddress = context.dao_addr.clone();
        let repo_address = context.repo_addr.clone();
        let remote_network = context.remote.network.clone();
        let repo = context.remote.repo.clone();

        self.expecting_deployed_contacts_addresses
            .push(tree_address.clone());

        let permit = push_semaphore.clone().acquire_owned().await?;

        let condition = |e: &anyhow::Error| {
            if e.is::<WalletError>() {
                false
            } else {
                tracing::warn!("Attempt failed with {:#?}", e);
                true
            }
        };

        let database = context.get_db()?.clone();

        self.pushed_blobs.spawn(
            async move {
                let res = RetryIf::spawn(
                    default_retry_strategy(),
                    || async {
                        inner_deploy_tree(
                            &blockchain,
                            &remote_network,
                            &dao_address,
                            &repo,
                            &tree_address,
                            database.clone(),
                        )
                        .await
                    },
                    condition,
                )
                .await;
                drop(permit);
                res
            }
            .instrument(info_span!("tokio::spawn::inner_deploy_tree").or_current()),
        );
        Ok(())
    }

    pub async fn wait_all_trees<B>(
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
            .iter()
            .map(|addr| BlockchainContractAddress::new(addr))
            .collect::<Vec<BlockchainContractAddress>>();
        tracing::debug!(
            "Expecting the following tree contracts to be deployed: {:?}",
            addresses
        );
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
        let _ = wait_contracts_deployed(&blockchain, &addresses).await?;

        let mut rest: HashMap<BlockchainContractAddress, usize> =
            addresses.iter().map(|addr| (addr.to_owned(), 0)).collect();
        let mut attempt = 0;
        loop {
            attempt += 1;
            let mut new_rest = HashMap::new();
            for (address, _) in &rest {
                match check_if_tree_is_ready(&blockchain, address).await {
                    Ok((true, _)) => {}
                    Ok((false, num)) => {
                        if &num != rest.get(address).unwrap() {
                            attempt = 0;
                        }
                        new_rest.insert(address.to_owned(), num);
                    }
                    _ => {
                        new_rest.insert(address.to_owned(), 0usize);
                    }
                }
            }
            rest = new_rest;
            if attempt == WAIT_TREE_READY_MAX_ATTEMPTS {
                break;
            }
            sleep(Duration::from_secs(5)).await;
        }
        Ok(rest.keys().map(|a| a.to_owned()).collect())
    }
}
