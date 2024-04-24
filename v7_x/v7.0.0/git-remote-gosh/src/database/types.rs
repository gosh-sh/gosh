use crate::blockchain::snapshot::PushDiffCoordinate;
use crate::blockchain::AddrVersion;
use crate::git_helper::push::parallel_diffs_upload_support::ParallelDiff;
use crate::git_helper::push::parallel_snapshot_upload_support::{ParallelCommit, ParallelTree};
use git_hash::ObjectId;
use std::collections::HashMap;
use std::str::FromStr;
use crate::blockchain::tree::load::TreeComponent;

// change to DeployCommitParams?
#[derive(Serialize, Deserialize)]
pub struct DBCommit {
    pub commit_id: String,
    pub tree_sha: String,
    pub raw_commit: String,
    pub parents: Vec<AddrVersion>,
    pub upgrade_commit: bool,
}

impl From<ParallelCommit> for DBCommit {
    fn from(value: ParallelCommit) -> Self {
        Self {
            commit_id: value.commit_id.to_string(),
            tree_sha: value.tree_sha,
            raw_commit: value.raw_commit,
            parents: value.parents,
            upgrade_commit: value.upgrade_commit,
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct DBTree {
    tree_id: String,
    tree_nodes: HashMap<String, TreeComponent>,
    sha_inner_tree: String,
}

impl DBTree {
    pub fn to_parallel_tree(self) -> ParallelTree {
        ParallelTree {
            tree_id: ObjectId::from_str(&self.tree_id).unwrap(),
            tree_nodes: self.tree_nodes,
            sha_inner_tree: self.sha_inner_tree,
        }
    }
}

impl From<ParallelTree> for DBTree {
    fn from(value: ParallelTree) -> Self {
        Self {
            tree_id: value.tree_id.to_string(),
            tree_nodes: value.tree_nodes,
            sha_inner_tree: value.sha_inner_tree,
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
    snapshot_address: String,
    coordinates: PushDiffCoordinate,
    is_last: bool,
}

impl DBDiff {
    pub fn to_parallel_diff(self) -> (ParallelDiff, PushDiffCoordinate, bool) {
        let diff = ParallelDiff {
            commit_id: ObjectId::from_str(&self.commit_id).unwrap(),
            branch_name: self.branch_name,
            blob_id: ObjectId::from_str(&self.blob_id).unwrap(),
            file_path: self.file_path,
            original_snapshot_content: self.original_snapshot_content,
            diff: self.diff,
            new_snapshot_content: self.new_snapshot_content,
            snapshot_address: self.snapshot_address,
        };
        (diff, self.coordinates, self.is_last)
    }
}

impl From<(&ParallelDiff, PushDiffCoordinate, bool)> for DBDiff {
    fn from(value: (&ParallelDiff, PushDiffCoordinate, bool)) -> Self {
        Self {
            commit_id: value.0.commit_id.to_string(),
            branch_name: value.0.branch_name.clone(),
            blob_id: value.0.blob_id.to_string(),
            file_path: value.0.file_path.clone(),
            original_snapshot_content: value.0.original_snapshot_content.clone(),
            diff: value.0.diff.clone(),
            new_snapshot_content: value.0.new_snapshot_content.clone(),
            snapshot_address: value.0.snapshot_address.clone(),
            coordinates: value.1,
            is_last: value.2,
        }
    }
}
