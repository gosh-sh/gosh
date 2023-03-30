use crate::{
    blockchain::{tree::TreeNode, BlockchainContractAddress, BlockchainService, tvm_hash},
    git_helper::GitHelper,
};
use git_hash::ObjectId;
use git_object::tree::EntryRef;
use git_odb::{Find, FindExt};
use std::iter::Iterator;
use std::{
    collections::{HashMap, HashSet, VecDeque},
    sync::Arc,
};

use crate::cache::Cache;

use super::is_going_to_ipfs;
use tokio::sync::Semaphore;
use crate::git_helper::push::parallel_snapshot_upload_support::{ParallelTree, ParallelTreeUploadSupport};

const MARKER_FLAG: u32 = 1u32;

#[instrument(level = "trace", skip_all)]
async fn construct_tree_node(
    context: &mut GitHelper<impl BlockchainService>,
    e: &EntryRef<'_>,
) -> anyhow::Result<(String, TreeNode)> {
    tracing::trace!("construct_tree_node: e={e:?}");
    let mut buffer = vec![];
    use git_object::tree::EntryMode::*;
    let content_hash = match e.mode {
        Tree | Link | Commit => {
            let _ = context
                .local_repository()
                .objects
                .try_find(e.oid, &mut buffer)?;
            sha256::digest(&*buffer)
        }
        Blob | BlobExecutable => {
            let content = context
                .local_repository()
                .objects
                .find_blob(e.oid, &mut buffer)?
                .data;

            if is_going_to_ipfs(content) {
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
                tvm_hash(&context.blockchain.client(), content).await?
            }
        }
    };
    let file_name = e.filename.to_string();
    let tree_node = TreeNode::from((format!("0x{content_hash}"), e));
    let type_obj = &tree_node.type_obj;
    let key = tvm_hash(
        &context.blockchain.client(),
        format!("{}:{}", type_obj, file_name).as_bytes(),
    )
        .await?;
    Ok((format!("0x{}", key), tree_node))
}

#[instrument(level = "info", skip_all)]
pub async fn push_tree(
    context: &mut GitHelper<impl BlockchainService + 'static>,
    tree_id: &ObjectId,
    visited: &mut HashSet<ObjectId>,
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
        if context.cache.get(&tree_id).await == Some(MARKER_FLAG) {
            continue;
        }
        visited.insert(tree_id);
        let mut buffer: Vec<u8> = Vec::new();
        let entry_ref_iter = context
            .local_repository()
            .objects
            .try_find(tree_id, &mut buffer)?
            .expect("Local object must be there")
            .try_into_tree_iter()
            .unwrap()
            .entries()?;

        let mut tree_nodes: HashMap<String, TreeNode> = HashMap::new();

        for e in entry_ref_iter.iter() {
            if e.mode == git_object::tree::EntryMode::Tree {
                to_deploy.push_back(e.oid.into());
            }
            let (hash, tree_node) = construct_tree_node(context, e).await?;
            tree_nodes.insert(hash, tree_node);
        }

        let blockchain = context.blockchain.clone();
        let network = context.remote.network.clone();
        let dao_addr = context.dao_addr.clone();
        let repo = context.remote.repo.clone();
        let cache = context.cache.clone();

        handlers.add_to_push_list(context, ParallelTree::new(tree_id, tree_nodes), push_semaphore.clone()).await?;
    }
    Ok(())
}

#[instrument(level = "info", skip_all)]
pub async fn inner_deploy_tree(
    blockchain: &impl BlockchainService,
    remote_network: &str,
    dao_addr: &BlockchainContractAddress,
    remote_repo: &str,
    tree_id: &ObjectId,
    tree_nodes: &HashMap<String, TreeNode>,
) -> anyhow::Result<()> {
    tracing::trace!("inner_deploy_tree: remote_network={remote_network}, dao_addr={dao_addr}, remote_repo={remote_repo}, tree_id={tree_id}");
    let wallet = blockchain.user_wallet(&dao_addr, &remote_network).await?;
    blockchain
        .deploy_tree(
            &wallet,
            &tree_id.to_hex().to_string(),
            &remote_repo,
            tree_nodes,
        )
        .await
}
