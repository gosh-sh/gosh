use crate::blockchain::snapshot::PushDiffCoordinate;
use crate::database::{COMMIT_CF, DIFF_CF, GoshDB, SNAPSHOT_CF, TREE_CF};
use crate::database::types::{DBCommit, DBDiff, DBTree};
use crate::git_helper::push::parallel_diffs_upload_support::ParallelDiff;
use crate::git_helper::push::parallel_snapshot_upload_support::{ParallelCommit, ParallelSnapshot, ParallelTree};

impl GoshDB {
    pub fn get_commit(&self, id: &str) -> anyhow::Result<DBCommit> {
        eprintln!("get commit");
        let value = self.db().get_cf(&self.cf(COMMIT_CF), id)?.expect("Failed to get commit data from db");
        let res: DBCommit = serde_json::from_slice(&value)?;
        Ok(res)
    }

    pub fn get_tree(&self, id: &str) -> anyhow::Result<ParallelTree> {
        eprintln!("get tree");
        let value = self.db().get_cf(&self.cf(TREE_CF), id)?.expect("Failed to get tree data from db");
        let res: DBTree = serde_json::from_slice(&value)?;
        Ok(res.to_parallel_tree())
    }

    pub fn get_diff(&self, id: &str) -> anyhow::Result<(ParallelDiff, PushDiffCoordinate, bool)> {
        eprintln!("get diff");
        let value = self.db().get_cf(&self.cf(DIFF_CF), id)?.expect("Failed to get diff data from db");
        let res: DBDiff = serde_json::from_slice(&value)?;
        Ok(res.to_parallel_diff())
    }

    pub fn get_snapshot(&self, id: &str) -> anyhow::Result<ParallelSnapshot> {
        eprintln!("get snapshot");
        let value = self.db().get_cf(&self.cf(SNAPSHOT_CF), id)?.expect("Failed to get tree data from db");
        let res: ParallelSnapshot = serde_json::from_slice(&value)?;
        Ok(res)
    }
}