use std::collections::HashMap;
use crate::blockchain::{AddrVersion, BlockchainContractAddress};
use crate::blockchain::tree::TreeNode;
use crate::git_helper::push::parallel_diffs_upload_support::ParallelDiff;
use crate::git_helper::push::parallel_snapshot_upload_support::{ParallelCommit, ParallelTree};

#[derive(Serialize, Deserialize)]
pub struct DBCommit {
    commit_id: String,
    branch: String,
    tree_addr: BlockchainContractAddress,
    raw_commit: String,
    parents: Vec<AddrVersion>,
    upgrade_commit: bool,
}

impl From<&ParallelCommit> for DBCommit {
    fn from(value: &ParallelCommit) -> Self {
        Self {
            commit_id: value.commit_id.to_string(),
            branch: value.branch.clone(),
            tree_addr: value.tree_addr.clone(),
            raw_commit: value.raw_commit.clone(),
            parents: value.parents.clone(),
            upgrade_commit: value.upgrade_commit.clone(),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct DBTree {
    tree_id: String,
    tree_nodes: HashMap<String, TreeNode>,
}

impl From<&ParallelTree> for DBTree {
    fn from(value: &ParallelTree) -> Self {
        Self {
            tree_id: value.tree_id.to_string(),
            tree_nodes: value.tree_nodes.clone(),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct DBDiff {
    commit_id: String,
    branch_name: String,
    blob_id: String,
    file_path: String,
    original_snapshot_content: Vec<u8>,
    diff: Vec<u8>,
    new_snapshot_content: Vec<u8>,
}

impl From<&ParallelDiff> for DBDiff {
    fn from(value: &ParallelDiff) -> Self {
        Self {
            commit_id: value.commit_id.to_string(),
            branch_name: value.branch_name.clone(),
            blob_id: value.blob_id.to_string(),
            file_path: value.file_path.clone(),
            original_snapshot_content: value.original_snapshot_content.clone(),
            diff: value.diff.clone(),
            new_snapshot_content: value.new_snapshot_content.clone(),
        }
    }
}