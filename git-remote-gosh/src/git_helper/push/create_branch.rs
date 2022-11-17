use std::{fmt::Debug, str::FromStr};

use crate::{blockchain::branch::DeployBranch, git_helper::GitHelper};
use git_hash::ObjectId;
use git_object::tree;
use git_odb::Find;
use git_traverse::tree::recorder;
use tokio_retry::Retry;
use tracing::Instrument;

use super::{
    push_diff::push_new_branch_snapshot, utilities::retry::default_retry_strategy,
    BlockchainService, ZERO_SHA,
};

#[derive(Debug)]
pub struct CreateBranchOperation<'a, Blockchain> {
    ancestor_commit: ObjectId,
    new_branch: String,
    context: &'a mut GitHelper<Blockchain>,
}

impl<'a, Blockchain> CreateBranchOperation<'a, Blockchain>
where
    Blockchain: BlockchainService + 'static,
{
    pub fn new(
        ancestor_commit: ObjectId,
        branch_name: impl Into<String>,
        context: &'a mut GitHelper<Blockchain>,
    ) -> Self
    where
        Blockchain: BlockchainService,
    {
        Self {
            ancestor_commit,
            new_branch: branch_name.into(),
            context,
        }
    }

    async fn prepare_commit_for_branching(&mut self) -> anyhow::Result<()> {
        // We must prepare root tree for this commit
        // It needs to know a number of all blobs
        // in the entire tree
        // NOTE:
        // Ignoring this. It is not yet implemented in contracts
        // todo!();
        Ok(())
    }

    #[instrument(level = "debug")]
    async fn preinit_branch(&mut self) -> anyhow::Result<()> {
        let wallet = self
            .context
            .blockchain
            .user_wallet(&self.context.dao_addr, &self.context.remote.network)
            .await?;

        DeployBranch::deploy_branch(
            &self.context.blockchain,
            &wallet,
            &self.context.remote.repo,
            &self.new_branch,
            &self.ancestor_commit.to_string(),
        )
        .await?;
        Ok(())
    }

    #[instrument(level = "debug")]
    async fn push_initial_snapshots(&mut self) -> anyhow::Result<()> {
        let all_files: Vec<recorder::Entry> = {
            self.context
                .local_repository()
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
                tree::EntryMode::Commit => false,
            })
            .collect();

        let mut snapshot_handlers = Vec::new();

        for entry in snapshots_to_deploy {
            let mut buffer: Vec<u8> = Vec::new();
            let content = self
                .context
                .local_repository()
                .objects
                .try_find(entry.oid, &mut buffer)?
                .expect("blob must be in the local repository")
                .decode()?
                .as_blob()
                .expect("It must be a blob object")
                .data
                .to_owned();

            let blockchain = self.context.blockchain.clone();
            let remote_network = self.context.remote.network.clone();
            let dao_addr = self.context.dao_addr.clone();
            let repo_addr = self.context.repo_addr.clone();
            let file_provider = self.context.file_provider.clone();
            let ancestor_commit = self.ancestor_commit.clone();
            let new_branch = self.new_branch.clone();
            let full_path = entry.filepath.to_string();

            snapshot_handlers.push(tokio::spawn(
                async move {
                    Retry::spawn(default_retry_strategy(), || async {
                        push_new_branch_snapshot(
                            &blockchain,
                            &file_provider,
                            &remote_network,
                            &dao_addr,
                            &repo_addr,
                            &ancestor_commit,
                            &new_branch,
                            &full_path,
                            &content,
                        )
                        .await
                    })
                    .await
                }
                .instrument(debug_span!("tokio::spawn::push_new_branch_snapshot").or_current()),
            ));
        }
        for handler in snapshot_handlers {
            handler.await??;
        }
        Ok(())
    }

    #[instrument(level = "debug")]
    async fn wait_branch_ready(&mut self) -> anyhow::Result<()> {
        // Ensure repository contract state
        // Ping Sergey Horelishev for details
        // todo!();
        Ok(())
    }

    /// Run create branch operation.
    /// Returns false if it was a branch from a commit
    /// and true if it was the first ever branch
    #[instrument(level = "debug")]
    pub async fn run(&mut self) -> anyhow::Result<bool> {
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
