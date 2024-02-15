use crate::blockchain::snapshot::PushDiffCoordinate;
use crate::database::types::{DBCommit, DBDiff, DBTree};
use crate::database::{GoshDB, COMMIT_CF, DANGLING_DIFF_CF, DIFF_CF, SNAPSHOT_CF, TREE_CF};
use crate::git_helper::push::parallel_diffs_upload_support::ParallelDiff;
use crate::git_helper::push::parallel_snapshot_upload_support::{ParallelSnapshot, ParallelTree};
use rocksdb::{IteratorMode, ReadOptions};

fn read_opt() -> ReadOptions {
    let mut opt = ReadOptions::default();
    opt.fill_cache(false);
    opt
}

impl GoshDB {
    pub fn get_commit(&self, id: &str) -> anyhow::Result<DBCommit> {
        tracing::trace!("get commit {id}");
        let value = self
            .db()
            .get_cf(&self.cf(COMMIT_CF), id)?
            .expect("Failed to get commit data from db");
        let res: DBCommit = rmp_serde::from_slice(&value)?;
        Ok(res)
    }

    pub fn get_tree(&self, id: &str) -> anyhow::Result<ParallelTree> {
        tracing::trace!("get tree {id}");
        let value = self
            .db()
            .get_cf(&self.cf(TREE_CF), id)?
            .expect("Failed to get tree data from db");
        let res: DBTree = rmp_serde::from_slice(&value)?;
        Ok(res.to_parallel_tree())
    }

    pub fn get_diff(&self, id: &str) -> anyhow::Result<(ParallelDiff, PushDiffCoordinate, bool)> {
        tracing::trace!("get diff {id}");
        let value = self
            .db()
            .get_cf(&self.cf(DIFF_CF), id)?
            .expect("Failed to get diff data from db");
        let res: DBDiff = rmp_serde::from_slice(&value)?;
        Ok(res.to_parallel_diff())
    }

    pub fn get_snapshot(&self, id: &str) -> anyhow::Result<ParallelSnapshot> {
        tracing::trace!("get snapshot {id}");
        let value = self
            .db()
            .get_cf(&self.cf(SNAPSHOT_CF), id)?
            .expect("Failed to get tree data from db");
        let res: ParallelSnapshot = rmp_serde::from_slice(&value)?;
        Ok(res)
    }

    pub fn get_dangling_diff(
        &self,
        id: &str,
    ) -> anyhow::Result<(ParallelDiff, PushDiffCoordinate)> {
        tracing::trace!("get dangling diff {id}");
        let value = self
            .db()
            .get_cf(&self.cf(DANGLING_DIFF_CF), id)?
            .expect("Failed to get dangling diff data from db");
        let res: DBDiff = rmp_serde::from_slice(&value)?;
        let val = res.to_parallel_diff();
        Ok((val.0, val.1))
    }

    pub fn get_all_dangling_diffs(
        &self,
    ) -> anyhow::Result<Vec<(ParallelDiff, PushDiffCoordinate)>> {
        tracing::trace!("get all dangling diffs");
        let iter = self
            .db()
            .iterator_cf(&self.cf(DANGLING_DIFF_CF), IteratorMode::Start);
        let mut diffs = vec![];
        for value in iter {
            let res: DBDiff = rmp_serde::from_slice(&value?.1)?;
            let diff = res.to_parallel_diff();
            diffs.push((diff.0, diff.1));
        }
        Ok(diffs)
    }

    fn value_exists(&self, value: &str, cf: &str) -> anyhow::Result<bool> {
        tracing::trace!("Check value {value} exists in {cf}");
        Ok(self
            .db()
            .get_pinned_cf_opt(&self.cf(cf), value, &read_opt())?
            .is_some())
    }

    pub fn tree_exists(&self, address: &str) -> anyhow::Result<bool> {
        self.value_exists(address, TREE_CF)
    }

    pub fn commit_exists(&self, address: &str) -> anyhow::Result<bool> {
        self.value_exists(address, COMMIT_CF)
    }

    pub fn snapshot_exists(&self, address: &str) -> anyhow::Result<bool> {
        self.value_exists(address, SNAPSHOT_CF)
    }

    pub fn diff_exists(&self, address: &str) -> anyhow::Result<bool> {
        self.value_exists(address, DIFF_CF)
    }

    fn delete_value(&self, key: &str, cf: &str) -> anyhow::Result<()> {
        tracing::trace!("Delete value {key} exists in {cf}");
        Ok(self.db().delete_cf(&self.cf(cf), key)?)
    }

    pub fn delete_snapshot(&self, address: &str) -> anyhow::Result<()> {
        self.delete_value(address, SNAPSHOT_CF)
    }
}
