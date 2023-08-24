use crate::{
    blockchain::{tree::TreeNode, tvm_hash, BlockchainContractAddress, BlockchainService},
    git_helper::GitHelper,
};
use git_hash::ObjectId;
use git_object::tree::Entry;
use git_odb::{Find, FindExt};
use std::iter::Iterator;
use std::{collections::HashMap, str::FromStr, sync::Arc};

use super::is_going_to_ipfs;
use crate::blockchain::contract::GoshContract;
use crate::blockchain::tree::load::SnapshotMonitor;
use crate::blockchain::Tree;
use crate::database::GoshDB;
use crate::git_helper::push::parallel_snapshot_upload_support::{
    ParallelTree, ParallelTreeUploadSupport,
};
use tokio::sync::Semaphore;

fn flatten_tree(
    context: &GitHelper<impl BlockchainService>,
    tree_id: &ObjectId,
    path_prefix: &str,
) -> anyhow::Result<HashMap<String, Entry>> {
    tracing::trace!("flatten_tree: {path_prefix}");
    let mut map = HashMap::new();
    let mut buffer: Vec<u8> = Vec::new();
    let entry_ref_iter = context
        .local_repository()
        .objects
        .try_find(tree_id, &mut buffer)?
        .expect("Local object must be there")
        .try_into_tree_iter()
        .unwrap()
        .entries()?;
    tracing::trace!("Tree entries: {:?}", entry_ref_iter);
    use git_object::tree::EntryMode::*;
    for entry in entry_ref_iter {
        match entry.mode {
            Tree => {
                let dir = format!("{}/", entry.filename);
                let subtree = flatten_tree(context, &entry.oid.to_owned(), &dir)?;
                for (k, v) in subtree {
                    map.insert(format!("{}{}", path_prefix, k), v);
                }
                let path = format!("{}{}", path_prefix, entry.filename);
                map.insert(path, Entry::from(entry));
            }
            Blob | BlobExecutable | Link | Commit => {
                let path = format!("{}{}", path_prefix, entry.filename);
                map.insert(path, Entry::from(entry));
            }
        };
    }
    Ok(map)
}

#[instrument(level = "trace", skip_all)]
async fn construct_tree(
    context: &GitHelper<impl BlockchainService + 'static>,
    tree_id: &ObjectId,
    current_commit: &str,
    snapshot_to_commit: &mut HashMap<String, Vec<SnapshotMonitor>>,
    wallet_contract: &GoshContract,
    to_deploy: &mut Vec<ParallelTree>,
    is_upgrade: bool,
) -> anyhow::Result<HashMap<String, TreeNode>> {
    tracing::trace!("construct tree: tree_id={tree_id}, snapshot_to_commit:{snapshot_to_commit:?}, is_upgrade={is_upgrade}");
    // flatten tree map to get rid of recursive calls of async funcs
    let flat_tree = flatten_tree(context, tree_id, "")?;
    tracing::trace!("construct tree: flat_tree={flat_tree:?}");
    let mut nodes = HashMap::new();
    let mut paths: Vec<String> = Vec::new();
    let commit_obj = ObjectId::from_hex(current_commit.as_bytes())?;
    let commit_chain = context.get_commit_ancestors(&commit_obj)?;
    tracing::trace!("start processing single tree items");
    // prepare file entries
    use git_object::tree::EntryMode::*;
    for (path, entry) in &flat_tree {
        let file_hash = match entry.mode {
            Link | Commit => {
                tracing::trace!("Single link or item: {}", path);
                let mut buffer = vec![];
                let _ = context
                    .local_repository()
                    .objects
                    .try_find(entry.oid, &mut buffer)?;
                sha256::digest(&*buffer)
            }
            Blob | BlobExecutable => {
                tracing::trace!("Single tree item: {}", path);
                // let content = repository
                let mut buffer = vec![];
                let content = context
                    .local_repository()
                    .objects
                    .find_blob(entry.oid, &mut buffer)?
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
                    // tvm_hash(&blockchain.client(), content).await?
                    tvm_hash(&context.blockchain.client(), content).await?
                }
            }
            _ => {
                paths.push(path.to_string());
                continue;
            }
        };
        let file_name = entry.filename.to_string();

        let commit = if !is_upgrade {
            snapshot_to_commit
                .get(&file_name)
                .and_then(|val| {
                    for snap_mon in val {
                        if commit_chain.contains(&snap_mon.latest_commit) {
                            return Some(snap_mon.base_commit.clone());
                        }
                        if commit_chain.contains(&snap_mon.base_commit) {
                            return Some(snap_mon.base_commit.clone());
                        }
                    }
                    None
                })
                .unwrap_or(current_commit.to_string())
        } else {
            current_commit.to_string()
        };

        let tree_node = TreeNode::from((Some(format!("0x{file_hash}")), None, commit, entry));
        let type_obj = &tree_node.type_obj;
        let key = tvm_hash(
            &context.blockchain.client(),
            format!("{}:{}", type_obj, file_name).as_bytes(),
        )
        .await?;
        nodes.insert(
            format!("{}_{}", entry.filename, entry.oid.to_string()),
            (format!("0x{}", key), tree_node),
        );
    }
    tracing::trace!("end processing single tree items");
    tracing::trace!("single nodes: {nodes:?}");
    // after all single files prepared, prepare subtrees
    // start from longest paths
    paths.sort();
    paths.reverse();
    tracing::trace!("start processing subtrees. Paths: {paths:?}");
    for path in paths {
        let entry = flat_tree
            .get(&path)
            .ok_or(anyhow::format_err!("Failed to get tree value"))?;
        match entry.mode {
            Tree => {
                tracing::trace!("Subtree item: {}", path);
                let mut subtree = HashMap::new();

                let tree_id = git_hash::ObjectId::from_str(&entry.oid.to_string())?;
                let mut buffer: Vec<u8> = Vec::new();
                let entry_ref_iter = context
                    .local_repository()
                    .objects
                    .try_find(tree_id, &mut buffer)?
                    .expect("Local object must be there")
                    .try_into_tree_iter()
                    .unwrap()
                    .entries()?;

                for file_entry in entry_ref_iter {
                    tracing::trace!("looking for file: {:?}", file_entry);
                    let key = format!("{}_{}", file_entry.filename, file_entry.oid.to_string());
                    tracing::trace!("key: {}", key);
                    // let (key, tree_node) = nodes.remove(&key).ok_or(anyhow::format_err!(
                    let (key, tree_node) = nodes.get(&key).ok_or(anyhow::format_err!(
                        "Failed to get tree node: {}",
                        file_entry.oid
                    ))?;
                    subtree.insert(key.to_owned(), tree_node.to_owned());
                }

                let tree_hash = crate::blockchain::Tree::inner_tree_hash(
                    context.blockchain.client(),
                    wallet_contract,
                    &subtree,
                )
                .await?;

                // For trees commit is set to empty string
                let commit = "".to_string();

                let file_name = entry.filename.to_string();
                let tree_node = TreeNode::from((None, Some(tree_hash.clone()), commit, entry));
                let type_obj = &tree_node.type_obj;
                let key = tvm_hash(
                    &context.blockchain.client(),
                    format!("{}:{}", type_obj, file_name).as_bytes(),
                )
                .await?;
                nodes.insert(
                    format!("{}_{}", entry.filename, entry.oid.to_string()),
                    (format!("0x{}", key), tree_node),
                );
                let parallel_tree = ParallelTree::new(tree_id, subtree, tree_hash);
                to_deploy.push(parallel_tree);
            }
            _ => {}
        }
    }
    tracing::trace!("end processing subtrees");

    let mut tree_nodes = HashMap::new();
    let mut buffer: Vec<u8> = Vec::new();
    let entry_ref_iter = context
        .local_repository()
        .objects
        .try_find(tree_id, &mut buffer)?
        .expect("Local object must be there")
        .try_into_tree_iter()
        .unwrap()
        .entries()?;
    tracing::trace!("root tree entries: {entry_ref_iter:?}");
    for file_entry in entry_ref_iter {
        let key = format!("{}_{}", file_entry.filename, file_entry.oid.to_string());
        tracing::trace!("look for root entry: {key:?}");
        tracing::trace!("nodes: {nodes:?}");
        let (key, tree_node) = nodes
            .remove(&key)
            .ok_or(anyhow::format_err!("Failed to get tree node"))?;
        tree_nodes.insert(key, tree_node);
    }

    let tree_hash = crate::blockchain::Tree::inner_tree_hash(
        context.blockchain.client(),
        wallet_contract,
        &tree_nodes,
    )
    .await?;

    let parallel_tree = ParallelTree::new(tree_id.to_owned(), tree_nodes.clone(), tree_hash);
    to_deploy.push(parallel_tree);

    Ok(tree_nodes)
}

#[instrument(level = "info", skip_all)]
pub async fn push_tree(
    context: &mut GitHelper<impl BlockchainService + 'static>,
    root_tree_id: &ObjectId,
    current_commit: &str,
    snapshot_to_commit: &mut HashMap<String, Vec<SnapshotMonitor>>,
    wallet_contract: &GoshContract,
    handlers: &mut ParallelTreeUploadSupport,
    push_semaphore: Arc<Semaphore>,
    is_upgrade: bool,
) -> anyhow::Result<(BlockchainContractAddress, String)> {
    tracing::trace!("start push_tree: tree_id={root_tree_id}, current_commit={current_commit}");
    let mut to_deploy = Vec::new();
    let tree_nodes = construct_tree(
        context,
        root_tree_id,
        current_commit,
        snapshot_to_commit,
        wallet_contract,
        &mut to_deploy,
        is_upgrade,
    )
    .await?;
    tracing::trace!("Trees to deploy after construct: {to_deploy:?}");
    let mut res_address = None;
    for tree in to_deploy {
        tracing::trace!("push_tree: tree_id={}", tree.tree_id);

        let mut repo_contract = context.blockchain.repo_contract().clone();
        let tree_address = Tree::calculate_address(
            &Arc::clone(context.blockchain.client()),
            &mut repo_contract,
            &tree.sha_inner_tree,
        )
        .await?;
        let tree_address = String::from(tree_address);

        if &tree.tree_id == root_tree_id {
            res_address = Some((
                BlockchainContractAddress::new(&tree_address),
                tree.sha_inner_tree.clone(),
            ));
        }
        if !context.get_db()?.tree_exists(&tree_address)? {
            context.get_db()?.put_tree(tree, tree_address.clone())?;

            handlers
                .add_to_push_list(context, tree_address, push_semaphore.clone())
                .await?;
        } else {
            handlers.push_expected(tree_address);
        }
    }
    res_address.ok_or(anyhow::format_err!("Failed to get result tree address"))
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
