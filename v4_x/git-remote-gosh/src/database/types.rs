use crate::blockchain::{AddrVersion, BlockchainContractAddress};
use crate::git_helper::push::parallel_snapshot_upload_support::ParallelCommit;

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
