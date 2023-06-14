use crate::blockchain::contract::wait_contracts_deployed::wait_contracts_deployed;
use crate::blockchain::tree::load::check_if_tree_is_ready;
use crate::{
    blockchain::{
        get_commit_address, tree::TreeNode, user_wallet::WalletError, AddrVersion,
        BlockchainContractAddress, BlockchainService, Snapshot, Tree,
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
use std::{collections::HashMap, sync::Arc, vec::Vec};
use std::time::Duration;
use tokio::{sync::Semaphore, task::JoinSet};
use tokio::time::sleep;
use tokio_retry::RetryIf;
use tracing::Instrument;

const WAIT_TREE_READY_MAX_ATTEMPTS: i32 = 3;

// TODO: refactor this code and unite all this parallel pushes

pub struct ParallelSnapshotUploadSupport {
    expecting_deployed_contacts_addresses: HashMap<BlockchainContractAddress, ParallelSnapshot>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone, Debug)]
pub struct ParallelSnapshot {
    branch_name: String,
    file_path: String,
    upgrade: bool,
    commit_id: String,
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
            expecting_deployed_contacts_addresses: HashMap::new(),
            pushed_blobs: JoinSet::new(),
        }
    }

    pub fn get_expected(&self) -> &HashMap<BlockchainContractAddress, ParallelSnapshot> {
        &self.expecting_deployed_contacts_addresses
    }

    #[instrument(level = "info", skip_all)]
    pub async fn add_to_push_list(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        snapshot: ParallelSnapshot,
    ) -> anyhow::Result<()> {
        let blockchain = context.blockchain.clone();
        let dao_address: BlockchainContractAddress = context.dao_addr.clone();
        let remote_network: String = context.remote.network.clone();
        let repo_address = context.repo_addr.clone();
        let branch_name = snapshot.branch_name.clone();

        let file_path = snapshot.file_path.clone();
        let commit_str = snapshot.commit_id.clone();
        let upgrade_commit = snapshot.upgrade.clone();

        let mut repo_contract = blockchain.repo_contract().clone();
        let snapshot_addr = Snapshot::calculate_address(
            blockchain.client(),
            &mut repo_contract,
            &branch_name,
            &file_path,
        )
        .await?;

        tracing::trace!(
            "Start push of snapshot: address: {snapshot_addr:?}, snapshot: {snapshot:?}"
        );

        self.expecting_deployed_contacts_addresses
            .insert(snapshot_addr, snapshot.clone());

        self.pushed_blobs.spawn(
            async move {
                push_initial_snapshot(
                    blockchain,
                    repo_address,
                    dao_address,
                    remote_network,
                    branch_name,
                    file_path,
                    upgrade_commit,
                    commit_str,
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
            .clone()
            .into_keys()
            .collect::<Vec<BlockchainContractAddress>>();
        tracing::debug!(
            "Expecting the following diff contracts to be deployed: {:?}",
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

pub struct ParallelCommitUploadSupport {
    expecting_deployed_contacts_addresses: HashMap<BlockchainContractAddress, ParallelCommit>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone, Debug)]
pub struct ParallelCommit {
    pub commit_id: ObjectId,
    branch: String,
    tree_addr: BlockchainContractAddress,
    raw_commit: String,
    parents: Vec<AddrVersion>,
    upgrade_commit: bool,
}

impl ParallelCommit {
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(
        commit_id: ObjectId,
        branch: String,
        tree_addr: BlockchainContractAddress,
        raw_commit: String,
        parents: Vec<AddrVersion>,
        upgrade_commit: bool,
    ) -> Self {
        Self {
            commit_id,
            branch,
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
            expecting_deployed_contacts_addresses: HashMap::new(),
            pushed_blobs: JoinSet::new(),
        }
    }

    pub fn get_expected(&self) -> &HashMap<BlockchainContractAddress, ParallelCommit> {
        &self.expecting_deployed_contacts_addresses
    }

    #[instrument(level = "info", skip_all)]
    pub async fn add_to_push_list(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        commit: ParallelCommit,
        push_semaphore: Arc<Semaphore>,
    ) -> anyhow::Result<()> {
        let blockchain = context.blockchain.clone();
        let dao_address: BlockchainContractAddress = context.dao_addr.clone();
        let remote = context.remote.clone();

        let commit_id = commit.commit_id.clone();
        let branch = commit.branch.clone();
        let tree_addr = commit.tree_addr.clone();
        let raw_commit = commit.raw_commit.clone();
        let parents = commit.parents.clone();
        let upgrade_commit = commit.upgrade_commit.clone();

        let mut repo_contract = blockchain.repo_contract().clone();
        let commit_address = get_commit_address(
            &blockchain.client(),
            &mut repo_contract,
            &commit_id.to_string(),
        )
        .await?;

        tracing::trace!("Start push of commit: address: {commit_address:?}, snapshot: {commit:?}");

        self.expecting_deployed_contacts_addresses
            .insert(commit_address, commit.clone());

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
                            .push_commit(
                                &commit_id,
                                &branch,
                                &tree_addr,
                                &remote,
                                &dao_address,
                                &raw_commit,
                                &parents,
                                upgrade_commit,
                            )
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
            .clone()
            .into_keys()
            .collect::<Vec<BlockchainContractAddress>>();
        tracing::debug!(
            "Expecting the following diff contracts to be deployed: {:?}",
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
    expecting_deployed_contacts_addresses: HashMap<BlockchainContractAddress, ParallelTree>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone, Debug)]
pub struct ParallelTree {
    pub tree_id: ObjectId,
    tree_nodes: HashMap<String, TreeNode>,
}

impl ParallelTree {
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(tree_id: ObjectId, tree_nodes: HashMap<String, TreeNode>) -> Self {
        tracing::trace!("new_ParallelTree tree_id:{tree_id:?}, tree_nodes:{tree_nodes:?}");
        Self {
            tree_id,
            tree_nodes,
        }
    }
}

impl ParallelTreeUploadSupport {
    pub fn new() -> Self {
        Self {
            expecting_deployed_contacts_addresses: HashMap::new(),
            pushed_blobs: JoinSet::new(),
        }
    }

    pub fn get_expected(&self) -> &HashMap<BlockchainContractAddress, ParallelTree> {
        &self.expecting_deployed_contacts_addresses
    }

    #[instrument(level = "info", skip_all)]
    pub async fn add_to_push_list(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
        tree: ParallelTree,
        push_semaphore: Arc<Semaphore>,
    ) -> anyhow::Result<()> {
        let blockchain = context.blockchain.clone();
        let dao_address: BlockchainContractAddress = context.dao_addr.clone();
        let remote_network: String = context.remote.network.clone();
        let repo_address = context.repo_addr.clone();
        let network = context.remote.network.clone();
        let repo = context.remote.repo.clone();

        let tree_id = tree.tree_id.clone();
        let tree_nodes = tree.tree_nodes.clone();

        let mut repo_contract = blockchain.repo_contract().clone();
        let tree_addr = Tree::calculate_address(
            &Arc::clone(context.blockchain.client()),
            &mut repo_contract,
            &tree_id.to_string(),
        )
        .await?;

        tracing::trace!(
            "Start push of tree: address: {tree_addr:?}, tree_id: {:?}",
            tree.tree_id
        );

        self.expecting_deployed_contacts_addresses
            .insert(tree_addr, tree.clone());

        let permit = push_semaphore.clone().acquire_owned().await?;

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
                        inner_deploy_tree(
                            &blockchain,
                            &network,
                            &dao_address,
                            &repo,
                            &tree_id,
                            &tree_nodes,
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
            .clone()
            .into_keys()
            .collect::<Vec<BlockchainContractAddress>>();
        tracing::debug!(
            "Expecting the following diff contracts to be deployed: {:?}",
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

        let mut rest: HashMap<BlockchainContractAddress, usize> = addresses.iter().map(|addr| (addr.to_owned(), 0)).collect();
        let mut attempt = 0;
        loop {
            attempt += 1;
            let mut new_rest = HashMap::new();
            for (address, _) in &rest {
                match check_if_tree_is_ready(&blockchain, address).await {
                    Ok((true, _)) => {},
                    Ok((false, num)) => {
                        if &num != rest.get(address).unwrap() {
                            attempt = 0;
                        }
                        new_rest.insert(address.to_owned(), num);
                    },
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
