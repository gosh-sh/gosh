use crate::{
    blockchain::{tree::TreeNode, tvm_hash, BlockchainContractAddress, BlockchainService},
    git_helper::GitHelper,
};
use git_hash::ObjectId;
use git_object::tree::EntryRef;
use git_odb::{Find, FindExt};
use std::iter::Iterator;
use std::{
    collections::{HashMap, HashSet, VecDeque},
    sync::Arc,
    str::FromStr,
};
use async_recursion::async_recursion;

use crate::cache::Cache;

use super::is_going_to_ipfs;
use crate::blockchain::Tree;
use crate::database::GoshDB;
use crate::git_helper::push::parallel_snapshot_upload_support::{
    ParallelTree, ParallelTreeUploadSupport,
};
use tokio::sync::Semaphore;
use crate::blockchain::contract::GoshContract;

const MARKER_FLAG: u32 = 1u32;

#[derive(Deserialize)]
pub struct CalculateHashResult {
    hash: String,
}

#[instrument(level = "trace", skip_all)]
#[async_recursion]
async fn construct_tree_node(
    context: GitHelper<impl BlockchainService>,
    // blockchain: &impl BlockchainService,
    // repository: Arc<git_repository::Repository>,
    e: &EntryRef<'_>,
    to_deploy: &mut VecDeque<ObjectId>,
    current_commit: &str,
    snapshot_to_commit: &HashMap<String, String>,
    wallet_contract: &GoshContract,
) -> anyhow::Result<(String, TreeNode)> {
    tracing::trace!("construct_tree_node: e={e:?}");
    let mut buffer = vec![];
    use git_object::tree::EntryMode::*;
    let (file_hash, tree_hash, commit) = match e.mode {
        Tree | Link | Commit => {
            let tree_id = git_hash::ObjectId::from_str(&e.oid.to_string())?;
            let mut buffer: Vec<u8> = Vec::new();
            tracing::trace!("Get tree refs for {}", tree_id);
            // let entry_ref_iter = repository
            let entry_ref_iter = context
                .local_repository()
                .objects
                .try_find(tree_id, &mut buffer)?
                .expect("Local object must be there")
                .try_into_tree_iter()
                .unwrap()
                .entries()?;
            // let tree = construct_tree(blockchain, repository, entry_ref_iter, to_deploy, current_commit, snapshot_to_commit, wallet_contract).await?;
            let tree = construct_tree(context, entry_ref_iter, to_deploy, current_commit, snapshot_to_commit, wallet_contract).await?;
            let args = json!({ "tree": tree });
            let hash: CalculateHashResult = wallet_contract.run_static(
                // blockchain.client(),
                context.blockchain.client(),
                "calculateInnerTreeHash",
                Some(args),
            ).await?;
            (None, Some(hash.hash), "".to_string())
        }
        Blob | BlobExecutable => {
            // let content = repository
            let content = context
                .local_repository()
                .objects
                .find_blob(e.oid, &mut buffer)?
                .data;

            let file_hash = if is_going_to_ipfs(content) {
                // NOTE:
                // Here is a problem: we calculate if this blob is going to ipfs
                // one way (blockchain::snapshot::save::is_going_to_ipfs)
                // and it's different here.
                // However!
                // 1. This sha will be validated for files NOT in IPFS
                // 2. We can be sure if this check passed than this file surely
                //    goes to IPFS
                // 3. If we though that this file DOES NOT go to IPFS and calculated
                //    tvm_hash instead it will not break
                sha256::digest(content)
            } else {
                // tvm_hash(&blockchain.client(), content).await?
                tvm_hash(&context.blockchain.client(), content).await?
            };
            // TODO: change current_commit to a right one
            (Some(format!("0x{file_hash}")), None, current_commit.to_string())
        }
    };
    let file_name = e.filename.to_string();
    let tree_node = TreeNode::from((file_hash, tree_hash, commit, e));
    let type_obj = &tree_node.type_obj;
    let key = tvm_hash(
        // &blockchain.client(),
        &context.blockchain.client(),
        format!("{}:{}", type_obj, file_name).as_bytes(),
    )
    .await?;
    Ok((format!("0x{}", key), tree_node))
}

#[instrument(level = "trace", skip_all)]
async fn construct_tree(
    context: &GitHelper<impl BlockchainService>,
    // blockchain: &impl BlockchainService,
    // repository: Arc<git_repository::Repository>,
    entry_ref_iter: Vec<EntryRef<'_>>,
    to_deploy: &mut VecDeque<ObjectId>,
    current_commit: &str,
    snapshot_to_commit: &HashMap<String, String>,
    wallet_contract: &GoshContract,
) -> anyhow::Result<HashMap<String, TreeNode>> {
    tracing::trace!("Construct tree for blockchain.");
    let mut tree_nodes: HashMap<String, TreeNode> = HashMap::new();

    for e in entry_ref_iter.iter() {
        if e.mode == git_object::tree::EntryMode::Tree {
            to_deploy.push_back(e.oid.into());
        }
        // let repo_clone = repository.clone();
        // let (hash, tree_node) = construct_tree_node(blockchain, repo_clone, e, to_deploy, current_commit, snapshot_to_commit, wallet_contract).await?;
        let (hash, tree_node) = construct_tree_node(context, e, to_deploy, current_commit, snapshot_to_commit, wallet_contract).await?;
        tree_nodes.insert(hash, tree_node);
    }

    Ok(tree_nodes)
}

#[instrument(level = "info", skip_all)]
pub async fn push_tree(
    context: &mut GitHelper<impl BlockchainService + 'static>,
    tree_id: &ObjectId,
    visited: &mut HashSet<ObjectId>,
    current_commit: &str,
    snapshot_to_commit: &HashMap<String, String>,
    wallet_contract: &GoshContract,
    handlers: &mut ParallelTreeUploadSupport,
    push_semaphore: Arc<Semaphore>,
) -> anyhow::Result<()> {
    tracing::trace!("push_tree: tree_id={tree_id}");
    let mut to_deploy = VecDeque::new();
    to_deploy.push_back(*tree_id);
    while let Some(tree_id) = to_deploy.pop_front() {
        if visited.contains(&tree_id) {
            continue;
        }

        // TODO: looks like we don't use this cache. Mb delete it
        if context.cache.get(&tree_id).await == Some(MARKER_FLAG) {
            continue;
        }

        visited.insert(tree_id);
        let mut buffer: Vec<u8> = Vec::new();
        tracing::trace!("Get tree refs for {}", tree_id);
        let entry_ref_iter = context
            .local_repository()
            .objects
            .try_find(tree_id, &mut buffer)?
            .expect("Local object must be there")
            .try_into_tree_iter()
            .unwrap()
            .entries()?;
        // let tree_nodes = construct_tree(&context.blockchain, context.local_repository.clone(), entry_ref_iter, &mut to_deploy, current_commit, snapshot_to_commit, wallet_contract).await?;
        let tree_nodes = construct_tree(context, entry_ref_iter, &mut to_deploy, current_commit, snapshot_to_commit, wallet_contract).await?;
        let args = json!({ "tree": &tree_nodes });
        let hash: CalculateHashResult = wallet_contract.run_static(
            context.blockchain.client(),
            "calculateInnerTreeHash",
            Some(args),
        ).await?;
        let blockchain = context.blockchain.clone();
        let network = context.remote.network.clone();
        let dao_addr = context.dao_addr.clone();
        let repo = context.remote.repo.clone();

        // TODO: looks like we don't use this cache. Mb delete it
        let cache = context.cache.clone();

        let tree = ParallelTree::new(tree_id, tree_nodes, hash.hash);

        let mut repo_contract = context.blockchain.repo_contract().clone();
        let tree_address = Tree::calculate_address(
            &Arc::clone(context.blockchain.client()),
            &mut repo_contract,
            &tree_id.to_string(),
        )
        .await?;
        let tree_address = String::from(tree_address);

        if !context.get_db()?.tree_exists(&tree_address)? {
            context.get_db()?.put_tree(tree, tree_address.clone())?;

            handlers
                .add_to_push_list(context, tree_address, push_semaphore.clone())
                .await?;
        } else {
            handlers.push_expected(tree_address);
        }
    }
    Ok(())
}

#[instrument(level = "info", skip_all)]
pub async fn inner_deploy_tree(
    blockchain: &impl BlockchainService,
    remote_network: &str,
    dao_addr: &BlockchainContractAddress,
    remote_repo: &str,
    tree_address: &str,
    database: Arc<GoshDB>,
) -> anyhow::Result<()> {
    let mut tree = database.get_tree(tree_address)?;
    tracing::trace!("inner_deploy_tree: remote_network={remote_network}, dao_addr={dao_addr}, remote_repo={remote_repo}, tree_id={}", tree.tree_id);
    let wallet = blockchain.user_wallet(&dao_addr, &remote_network).await?;
    blockchain
        .deploy_tree(
            &wallet,
            &tree.tree_id.to_hex().to_string(),
            tree_address,
            &remote_repo,
            &mut tree.tree_nodes,
            &tree.sha_inner_tree,
        )
        .await
}
