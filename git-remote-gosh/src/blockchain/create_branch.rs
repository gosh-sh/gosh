use std::str::FromStr;

use crate::{blockchain, ipfs::IpfsService};
use git_hash::ObjectId;
use git_object::tree;
use git_odb::Find;
use git_repository::Repository;
use git_traverse::tree::recorder;

use super::{GoshContract, TonClient, ZERO_SHA};

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

// #[derive(Debug)]
pub struct CreateBranchOperation<'a> {
    ancestor_commit: ObjectId,
    cli: &'a TonClient,
    ipfs_client: &'a IpfsService,
    repo: &'a Repository,
    repo_addr: String,
    wallet: GoshContract,
    new_branch: String,
    repo_name: String,
}

impl<'a> CreateBranchOperation<'a> {
    pub fn new(
        ancestor_commit: ObjectId,
        cli: &'a TonClient,
        ipfs_client: &'a IpfsService,
        repo: &'a Repository,
        repo_addr: &str,
        wallet: &GoshContract,
        branch_name: impl Into<String>,
        repo_name: &str,
    ) -> Self {
        return Self {
            ancestor_commit,
            cli,
            ipfs_client,
            repo,
            repo_addr: repo_addr.to_string(),
            wallet: wallet.clone(),
            new_branch: branch_name.into(),
            repo_name: repo_name.to_string(),
        };
    }

    async fn prepare_commit_for_branching(&mut self) -> Result<()> {
        // We must prepare root tree for this commit
        // It needs to know a number of all blobs
        // in the entire tree
        // NOTE:
        // Ignoring this. It is not yet implemented in contracts
        // todo!();
        Ok(())
    }

    #[instrument(level = "debug", skip(self))]
    async fn preinit_branch(&mut self) -> Result<()> {
        let params = serde_json::json!({
            "repoName": self.repo_name,
            "newName": self.new_branch,
            "fromCommit": self.ancestor_commit.to_string(),
        });
        blockchain::call(&self.cli, &self.wallet, "deployBranch", Some(params)).await?;
        Ok(())
    }

    #[instrument(level = "debug", skip(self))]
    async fn deploy_snapshot(&mut self, file_path: &str, id: &ObjectId) -> Result<()> {
        let mut buffer: Vec<u8> = Vec::new();
        let content = self
            .repo
            .objects
            .try_find(id, &mut buffer)?
            .expect("blob must be in the local repository")
            .decode()?
            .as_blob()
            .expect("It must be a blob object")
            .data;

        blockchain::snapshot::push_new_branch_snapshot(
            &self.cli,
            &self.ipfs_client,
            &self.wallet,
            &self.ancestor_commit,
            &self.new_branch,
            &self.repo_addr,
            file_path,
            content,
        )
        .await?;
        Ok(())
    }

    #[instrument(level = "debug", skip(self))]
    async fn push_initial_snapshots(&mut self) -> Result<()> {
        let all_files: Vec<recorder::Entry> = {
            self.repo
                .find_object(self.ancestor_commit)?
                .into_commit()
                .tree()?
                .traverse()
                .breadthfirst
                .files()?
                .into_iter()
                .collect()
        };
        let snapshots_to_deploy: Vec<recorder::Entry> = all_files
            .into_iter()
            .filter(|e| match e.mode {
                tree::EntryMode::Blob | tree::EntryMode::BlobExecutable => true,
                tree::EntryMode::Link => true,
                tree::EntryMode::Tree => false,
                tree::EntryMode::Commit => {
                    panic!("Commits of git submodules are not supported yet");
                }
            })
            .collect();

        for entry in snapshots_to_deploy {
            let full_path = entry.filepath.to_string();
            self.deploy_snapshot(&full_path, &entry.oid).await?;
        }
        Ok(())
    }

    #[instrument(level = "debug", skip(self))]
    async fn wait_branch_ready(&mut self) -> Result<()> {
        // Ensure repository contract state
        // Ping Sergey Horelishev for details
        // todo!();
        Ok(())
    }

    /// Run create branch operation.
    /// Returns false if it was a branch from a commit
    /// and true if it was the first ever branch
    #[instrument(level = "debug", skip(self))]
    pub async fn run(&mut self) -> Result<bool> {
        let mut is_first_branch = true;
        self.prepare_commit_for_branching().await?;
        self.preinit_branch().await?;
        if self.ancestor_commit != git_hash::ObjectId::from_str(ZERO_SHA)? {
            self.push_initial_snapshots().await?;
            is_first_branch = false;
        }
        self.wait_branch_ready().await?;
        Ok(is_first_branch)
    }
}
