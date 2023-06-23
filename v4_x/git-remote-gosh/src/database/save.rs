use crate::blockchain::snapshot::PushDiffCoordinate;
use crate::database::{COMMIT_CF, DANGLING_DIFF_CF, DIFF_CF, GoshDB, SNAPSHOT_CF, TREE_CF};
use crate::database::types::{DBCommit, DBDiff, DBTree};
use crate::git_helper::push::parallel_diffs_upload_support::ParallelDiff;
use crate::git_helper::push::parallel_snapshot_upload_support::{ParallelCommit, ParallelSnapshot, ParallelTree};

impl GoshDB {
    pub fn put_commit(&self, commit: ParallelCommit, id: String) -> anyhow::Result<()> {
        tracing::trace!("put commit {id}");
        let commit_for_db = DBCommit::from(commit);
        let value = serde_json::to_string(&commit_for_db).expect("Failed to serialize commit");
        let db = self.db();
        db.put_cf(&self.cf(COMMIT_CF), id, value)?;
        db.flush()?;
        Ok(())
    }

    pub fn put_tree(&self, tree: ParallelTree, id: String) -> anyhow::Result<()> {
        tracing::trace!("put tree {id}");
        let commit_for_db = DBTree::from(tree);
        let value = serde_json::to_string(&commit_for_db).expect("Failed to serialize tree");
        let db = self.db();
        db.put_cf(&self.cf(TREE_CF), id, value)?;
        db.flush()?;
        Ok(())
    }

    pub fn put_diff(&self, diff: (&ParallelDiff, PushDiffCoordinate, bool), id: String) -> anyhow::Result<()> {
        tracing::trace!("put diff {id}");
        let commit_for_db = DBDiff::from(diff);
        let value = serde_json::to_string(&commit_for_db).expect("Failed to serialize diff");
        let db = self.db();
        db.put_cf(&self.cf(DIFF_CF), id, value)?;
        db.flush()?;
        Ok(())
    }

    pub fn put_snapshot(&self, snapshot: &ParallelSnapshot, id: String) -> anyhow::Result<()> {
        tracing::trace!("put snapshot {id}");
        let value = serde_json::to_string(snapshot).expect("Failed to serialize snapshot");
        let db = self.db();
        db.put_cf(&self.cf(SNAPSHOT_CF), id, value)?;
        db.flush()?;
        Ok(())
    }

    pub fn put_dangling_diff(&self, diff: (&ParallelDiff, PushDiffCoordinate), id: String) -> anyhow::Result<()> {
        tracing::trace!("put dangling diff {id}");
        let commit_for_db = DBDiff::from((diff.0, diff.1, false));
        let value = serde_json::to_string(&commit_for_db).expect("Failed to serialize diff");
        let db = self.db();
        db.put_cf(&self.cf(DANGLING_DIFF_CF), id, value)?;
        db.flush()?;
        Ok(())
    }

}