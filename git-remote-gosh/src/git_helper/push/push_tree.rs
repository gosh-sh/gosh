use crate::{
    blockchain::{tree::TreeNode, tvm_hash, BlockchainContractAddress, BlockchainService},
    git_helper::GitHelper,
};
use git_hash::ObjectId;
use git_object::tree::EntryRef;
use git_odb::{Find, FindExt};
use std::collections::{HashMap, HashSet, VecDeque};
use std::iter::Iterator;

use tokio_retry::Retry;
use tracing::Instrument;

use tokio::task::JoinSet;

use super::utilities::retry::default_retry_strategy;

#[instrument(level = "debug", skip(context))]
async fn construct_tree_node(
    context: &GitHelper<impl BlockchainService>,
    e: &EntryRef<'_>,
) -> anyhow::Result<(String, TreeNode)> {
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
            if content.len() > crate::config::IPFS_CONTENT_THRESHOLD {
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

#[instrument(level = "debug", skip(context, visited))]
pub async fn push_tree(
    context: &GitHelper<impl BlockchainService + 'static>,
    tree_id: &ObjectId,
    visited: &mut HashSet<ObjectId>,
    handlers: &mut JoinSet<anyhow::Result<()>>,
) -> anyhow::Result<()> {
    let mut to_deploy = VecDeque::new();
    to_deploy.push_back(*tree_id);
    while let Some(tree_id) = to_deploy.pop_front() {
        if visited.contains(&tree_id) {
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

        handlers.spawn(
            async move {
                Retry::spawn(default_retry_strategy(), || async {
                    inner_deploy_tree(
                        &blockchain,
                        &network,
                        &dao_addr,
                        &repo,
                        &tree_id,
                        &tree_nodes,
                    )
                    .await
                })
                .await
                .map_err(|e| {
                    tracing::warn!("Attempt failed with {:#?}", e);
                    e
                })
            }
            .instrument(debug_span!("tokio::spawn::inner_deploy_tree").or_current()),
        );
    }
    Ok(())
}

#[instrument(level = "debug", skip(blockchain, tree_nodes))]
async fn inner_deploy_tree(
    blockchain: &impl BlockchainService,
    remote_network: &str,
    dao_addr: &BlockchainContractAddress,
    remote_repo: &str,
    tree_id: &ObjectId,
    tree_nodes: &HashMap<String, TreeNode>,
) -> anyhow::Result<()> {
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
