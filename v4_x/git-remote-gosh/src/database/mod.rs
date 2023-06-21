mod types;

use std::ops::{Deref, DerefMut};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use rocksdb::{BoundColumnFamily, DBCommon, DBWithThreadMode, MultiThreaded};
use tokio::sync::Mutex;
use uuid::Uuid;
use crate::database::types::DBCommit;
use crate::git_helper::push::parallel_snapshot_upload_support::ParallelCommit;

const DB_FOLDER_NAME: &str = "gosh_db";
const DEFAULT_LEVEL_OF_PARALLELISM: i32 = 4;
const DIFF_CF: &str = "Diff";
const TREE_CF: &str = "Tree";
const COMMIT_CF: &str = "Commit";
const SNAPSHOT_CF: &str = "Snapshot";

fn get_db_path() -> anyhow::Result<String> {
    let local_git_dir = std::env::var("GIT_DIR")?;
    let mut path = PathBuf::from(local_git_dir);
    path.push(DB_FOLDER_NAME);
    let res = path.to_str().ok_or(anyhow::format_err!("Failed to generate path for temporary database"))?.to_string();
    tracing::trace!("Database path: {res}");
    Ok(res)
}

fn get_db_options() -> rocksdb::Options {
    let mut db_options = rocksdb::Options::default();

    // Create db if it does not exist
    db_options.create_if_missing(true);

    // Set parallelism to the number of cores
    db_options.increase_parallelism(
        std::thread::available_parallelism().map(|val| val.get() as i32).unwrap_or(DEFAULT_LEVEL_OF_PARALLELISM)
    );

    db_options
}

fn create_db() -> anyhow::Result<DBWithThreadMode<MultiThreaded>> {
    eprintln!("create db");
    tracing::trace!("Create local database");
    let db_options = get_db_options();
    let db_path = get_db_path()?;
    let db = if Path::new(&db_path).exists() {
        let cfs = DBWithThreadMode::<MultiThreaded>::list_cf(&db_options, &db_path)?;
        DBWithThreadMode::<MultiThreaded>::open_cf(&db_options, &db_path, cfs.clone())
            .map_err(|e| anyhow::format_err!("Failed to open DB: {e}"))?
    } else {
        let db = DBWithThreadMode::<MultiThreaded>::open(&db_options, &db_path)
            .map_err(|e| anyhow::format_err!("Failed to open temporary database: {e}"))?;
        let cfs = vec![DIFF_CF, TREE_CF, SNAPSHOT_CF, COMMIT_CF];
        for cf in cfs {
            db.create_cf(cf, &db_options)?;
        }
        db
    };
    Ok(db)
}

pub struct GoshDB {
    db: Option<DBWithThreadMode<MultiThreaded>>,
}

impl GoshDB {
    pub fn new() -> anyhow::Result<Self> {
        let db = create_db()?;
        Ok(GoshDB {
            db: Some(db),
        })
    }

    fn db(&self) -> &DBWithThreadMode<MultiThreaded> {
        self.db.as_ref().expect("Failed to access DB")
    }

    fn cf(&self, name: &str) -> Arc<BoundColumnFamily> {
        self.db().cf_handle(name).expect("Failed to access column")
    }

    fn id() -> String {
        Uuid::new_v4().to_string()
    }

    pub fn put_commit(&self, commit: &ParallelCommit) -> anyhow::Result<()> {
        eprintln!("put commit");
        let commit_for_db = DBCommit::from(commit);
        let value = serde_json::to_string(&commit_for_db).expect("Failed to serialize commit");
        let db = self.db();
        db.put_cf(&self.cf(COMMIT_CF), GoshDB::id(), value)?;
        db.flush()?;
        Ok(())
    }

    pub fn delete(&mut self) -> anyhow::Result<()> {
        eprintln!("delete db");
        match self.db.take() {
            Some(db) => {
                let db_path = db.path().to_str().unwrap().to_owned();
                let db_options = get_db_options();
                drop(db);
                DBWithThreadMode::<MultiThreaded>::destroy(&db_options, &db_path)?;
            },
            _ => {}
        }
        Ok(())
    }
}
