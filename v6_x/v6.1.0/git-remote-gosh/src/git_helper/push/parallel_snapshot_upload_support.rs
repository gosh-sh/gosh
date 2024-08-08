use anyhow::bail;
use crate::{
    blockchain::{
        contract::wait_contracts_deployed::wait_contracts_deployed,
        snapshot::wait_snapshots_until_ready,
        tree::load::{check_if_tree_is_ready, TreeComponent},
        user_wallet::WalletError,
        AddrVersion, BlockchainContractAddress, BlockchainService,
    },
    git_helper::{
        push::{
            get_redeploy_attempts, wait_chunk_until_send,
            push_diff::prepush_initial_snapshot, push_tree::inner_deploy_tree,
            utilities::retry::default_retry_strategy,
        },
        GitHelper,
    },
};
use crate::database::GoshDB;
use git_hash::ObjectId;
use std::{collections::HashMap, sync::Arc, time::{Duration, SystemTime}, vec::Vec};
use tokio::{sync::Semaphore, task::JoinSet, time::sleep};
use tokio_retry::RetryIf;
use tracing::Instrument;

const WAIT_TREE_READY_MAX_ATTEMPTS: i32 = 4;
const GOSH_PUSH_CHUNK: &str = "GOSH_PUSH_CHUNK";
const DEFAULT_PUSH_CHUNK_SIZE: usize = 150;
const WAIT_CONTRACT_CHUNK_SIZE: usize = 50;

pub fn get_push_chunk() -> usize {
    std::env::var(GOSH_PUSH_CHUNK)
        .ok()
        .and_then(|num| usize::from_str_radix(&num, 10).ok())
        .unwrap_or(DEFAULT_PUSH_CHUNK_SIZE)
}

// TODO: refactor this code and unite all this parallel pushes

pub struct ParallelSnapshotUploadSupport {
    expecting_deployed_contacts_addresses: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ParallelSnapshot {
    pub file_path: String,
    pub upgrade: bool,
    pub commit_id: String,
    pub content: String,
    pub ipfs: Option<String>,
}

impl ParallelSnapshot {
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(
        file_path: String,
        upgrade: bool,
        commit_id: String,
        content: String,
        ipfs: Option<String>,
    ) -> Self {
        tracing::trace!(
            "new_ParallelSnapshot file_path:{}, upgrade:{}, commit_id:{}, content: {}, ipfs: {:?}",
            file_path,
            upgrade,
            commit_id,
            content,
            ipfs
        );
        Self {
            file_path,
            upgrade,
            commit_id,
            content,
            ipfs,
        }
    }
}

impl ParallelSnapshotUploadSupport {
    pub fn new() -> Self {
        Self {
            expecting_deployed_contacts_addresses: vec![],
        }
    }

    pub fn get_expected(&self) -> &Vec<String> {
        &self.expecting_deployed_contacts_addresses
    }

    pub fn push_expected(&mut self, value: String) {
        self.expecting_deployed_contacts_addresses.push(value);
    }

    #[instrument(level = "info", skip_all)]
    pub async fn push_snapshots_in_chunks(
        &mut self,
        context: &mut GitHelper<impl BlockchainService + 'static>,
    ) -> anyhow::Result<()> {
        let chunk_size = get_push_chunk();
        let max_attempts = get_redeploy_attempts();

        tracing::trace!("Start push of snapshots, chunk_size={chunk_size}, max_attempts={max_attempts}");
        let mut exp: Vec<BlockchainContractAddress> = self
            .expecting_deployed_contacts_addresses
            .iter()
            .map(|addr| BlockchainContractAddress::new(addr))
            .collect();

        let mut attempt = 0;
        loop {
            if attempt == max_attempts {
                anyhow::bail!("Failed to deploy snapshots. Undeployed snapshots: {exp:?}");
            }

            let mut rest = vec![];
            for chunk in exp.chunks(chunk_size) {
                let blockchain = context.blockchain.clone();
                let dao_address = context.dao_addr.clone();
                let remote_network = context.remote.network.clone();
                let repo_addr = context.repo_addr.clone();
                let database = context.get_db()?.clone();

                let mut unsent = push_chunk(
                    &blockchain,
                    &repo_addr,
                    &dao_address,
                    &remote_network,
                    database,
                    chunk,
                ).await?;
                rest.append(&mut unsent);
            }

            if rest.len() == 0 {
                break;
            } else {
                exp = rest;
            }
            attempt += 1;
        }

        attempt = 0;
        loop {
            if attempt == max_attempts {
                anyhow::bail!("Failed to deploy diffs. Undeployed diffs: {exp:?}");
            }

            let mut rest: Vec<BlockchainContractAddress> = vec![];
            for chunk in exp.chunks(chunk_size) {
                let mut undeployed =
                    wait_snapshots_until_ready(&context.blockchain, chunk).await?;

                tracing::trace!("undeployed {} diffs. iteration {}", undeployed.len(), attempt + 1);
                rest.append(&mut undeployed);
            }
            if rest.len() == 0 {
                break;
            } else {
                exp = rest;
            }

            attempt += 1;
        }
        Ok(())
    }
}

pub struct ParallelCommitUploadSupport {
    expecting_deployed_contacts_addresses: Vec<String>,
    pushed_blobs: JoinSet<anyhow::Result<()>>,
}

#[derive(Clone, Debug)]
pub struct ParallelCommit {
    pub commit_id: ObjectId,
    pub tree_sha: String,
    pub raw_commit: String,
    pub parents: Vec<AddrVersion>,
    pub upgrade_commit: bool,
}

impl ParallelCommit {
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(
        commit_id: ObjectId,
        tree_sha: String,
        raw_commit: String,
        parents: Vec<AddrVersion>,
        upgrade_commit: bool,
    ) -> Self {
        Self {
            commit_id,
            tree_sha,
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
        // tracing::debug!(
        //     "Expecting the following commit contracts to be deployed: {:?}",
        //     addresses
        // );
        while let Some(finished_task) = self.pushed_blobs.join_next().await {
            match finished_task {
                Err(e) => {
                    bail!("commits join-handler: {}", e);
                }
                Ok(Err(e)) => {
                    bail!("commits inner: {}", e);
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
    pub tree_item_to_base_commit_cache: HashMap<String, String>,
}

#[derive(Clone, Debug)]
pub struct ParallelTree {
    pub tree_id: ObjectId,
    pub tree_nodes: HashMap<String, TreeComponent>,
    pub sha_inner_tree: String,
}

impl ParallelTree {
    #[instrument(level = "info", skip_all, name = "new_ParallelDiff")]
    pub fn new(
        tree_id: ObjectId,
        tree_nodes: HashMap<String, TreeComponent>,
        sha_inner_tree: String,
    ) -> Self {
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
            tree_item_to_base_commit_cache: HashMap::new(),
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
        // tracing::debug!(
        //     "Expecting the following tree contracts to be deployed: {:?}",
        //     addresses
        // );
        while let Some(finished_task) = self.pushed_blobs.join_next().await {
            match finished_task {
                Err(e) => {
                    bail!("trees join-handler: {}", e);
                }
                Ok(Err(e)) => {
                    bail!("trees inner: {}", e);
                }
                Ok(Ok(_)) => {}
            }
        }
        let _ = wait_contracts_deployed(&blockchain, &addresses).await?;

        wait_trees_until_ready(&blockchain, addresses).await
    }
}

#[instrument(level = "info", skip_all)]
pub async fn wait_trees_until_ready<B>(
    blockchain: &B,
    addresses: Vec<BlockchainContractAddress>,
) -> anyhow::Result<Vec<BlockchainContractAddress>>
    where
        B: BlockchainService + 'static,
{
    let mut tree_results: JoinSet<anyhow::Result<Vec<BlockchainContractAddress>>> = JoinSet::new();

    for chunk in addresses.chunks(WAIT_CONTRACT_CHUNK_SIZE) {
        let waiting_for_addresses = Vec::from(chunk);
        let ever = blockchain.clone();
        tree_results.spawn(
            async move {
                let mut rest: HashMap<BlockchainContractAddress, usize> =
                    waiting_for_addresses.iter().map(|addr| (addr.to_owned(), 0)).collect();
                let mut attempt = 0;
                loop {
                    attempt += 1;
                    if attempt == WAIT_TREE_READY_MAX_ATTEMPTS {
                        break;
                    }
                    let mut new_rest = HashMap::new();
                    for (address, _) in &rest {
                        match check_if_tree_is_ready(&ever, address).await {
                            Ok((true, _)) => {}
                            Ok((false, num)) => {
                                if &num != rest.get(address).unwrap() {   // TODO: check that condition
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
                    sleep(Duration::from_secs(5)).await;
                }
                Ok(rest.keys().map(|a| a.to_owned()).collect())
            }
        );
    }

    let mut not_ready_trees = vec![];
    while let Some(res) = tree_results.join_next().await {
        let mut val = res??;
        not_ready_trees.append(&mut val);
    }

    Ok(not_ready_trees)
}

#[instrument(level = "info", skip_all)]
pub async fn push_chunk<B>(
    blockchain: &B,
    repo_addr: &BlockchainContractAddress,
    dao_address: &BlockchainContractAddress,
    remote_network: &str,
    database: Arc<GoshDB>,
    chunk: &[BlockchainContractAddress],
) -> anyhow::Result<Vec<BlockchainContractAddress>>
where
    B: BlockchainService + 'static,
{
    let wallet = blockchain.user_wallet(dao_address, remote_network).await?;

    let mut chunk = chunk.to_vec();
    let mut message_bocs: Vec<(String, Option<BlockchainContractAddress>)> = vec![];

    let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap();
    let expire = now.as_secs() as u32 + 120; // todo remove magic num

    let mut bocs: JoinSet<anyhow::Result<(String, Option<BlockchainContractAddress>)>> = JoinSet::new();
    for addr in &chunk {
        let blockchain = blockchain.clone();
        let repo_addr = repo_addr.clone();
        let wallet = wallet.clone();
        let snapshot_address = addr.clone();
        let database = database.clone();

        bocs.spawn(
            async move {
                let boc_pair = prepush_initial_snapshot(
                    &blockchain,
                    &repo_addr,
                    &wallet,
                    &snapshot_address,
                    database,
                    expire,
                ).await;
                boc_pair
            }
            .instrument(info_span!("tokio::spawn::prepush_diff").or_current())
        );
    }

    while let Some(finished_task) = bocs.join_next().await {
        match finished_task {
            Err(e) => {
                anyhow::bail!("prepush objects join-handler: {}", e);
            }
            Ok(Err(e)) => {
                anyhow::bail!("prepush objects inner: {}", e);
            }
            Ok(Ok(boc_pair)) => message_bocs.push(boc_pair)
        }
    }

    let wait_until = expire + 5;
    tracing::trace!("msg expire={}, wait_until={}", expire, wait_until);
    let queue_name = blockchain.send_messages(&message_bocs, wait_until).await?;

    wait_chunk_until_send(blockchain, &mut chunk, queue_name).await?;

    if chunk.len() > 0 {
        tracing::trace!("failed to send {} messages", chunk.len());
    }

    Ok(chunk)
}