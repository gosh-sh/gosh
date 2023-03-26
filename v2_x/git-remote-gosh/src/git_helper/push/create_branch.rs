use std::{fmt::Debug, str::FromStr};

use crate::{
    blockchain::{branch::DeployBranch, user_wallet::WalletError, Snapshot},
    git_helper::GitHelper,
};
use git_hash::ObjectId;
use git_object::tree;
use git_odb::Find;
use git_traverse::tree::recorder;
use tokio::task::{JoinError, JoinSet};
use tokio_retry::RetryIf;
use tracing::Instrument;

use super::{
    push_diff::push_new_branch_snapshot, utilities::retry::default_retry_strategy,
    BlockchainService, ZERO_SHA,
};

#[derive(Debug)]
pub struct CreateBranchOperation<'a, Blockchain> {
    ancestor_commit: ObjectId,
    new_branch: String,
    context: &'a GitHelper<Blockchain>,
}

impl<'a, Blockchain> CreateBranchOperation<'a, Blockchain>
where
    Blockchain: BlockchainService + 'static,
{
    pub fn new(
        ancestor_commit: ObjectId,
        branch_name: impl Into<String>,
        context: &'a GitHelper<Blockchain>,
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

    #[instrument(level = "info", skip_all)]
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

    #[instrument(level = "info", skip_all)]
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

        let mut snapshot_handlers = JoinSet::new();

        let context = &mut self.context.clone();

        let ancestor_id = self.ancestor_commit.to_string();
        let ancestor_address = context.calculate_commit_address(&self.ancestor_commit).await?;
        let ancestor_data = crate::blockchain::GoshCommit::load(
            context.blockchain.client(),
            &ancestor_address
        )
        .await
        .map_err(|e| anyhow::format_err!("Failed to load commit with SHA=\"{}\". Error: {e}", ancestor_id))?;

        for entry in snapshots_to_deploy {
            let blockchain = self.context.blockchain.clone();
            let file_path = entry.filepath.to_string();
            let mut repo_contract = blockchain.repo_contract().clone();

            let snapshot_addr = Snapshot::calculate_address(
                self.context.blockchain.client(),
                &mut repo_contract,
                &ancestor_data.branch,
                &file_path,
            ).await?;
            let snapshot = Snapshot::load(blockchain.client(), &snapshot_addr).await?;

            let expected_snapshot_addr = Snapshot::calculate_address(
                self.context.blockchain.client(),
                &mut repo_contract,
                &self.new_branch,
                &file_path,
            ).await?;

            let remote_network = self.context.remote.network.clone();
            let dao_addr = self.context.dao_addr.clone();
            let repo_addr = self.context.repo_addr.clone();
            let file_provider = self.context.file_provider.clone();
            let ancestor_commit = self.ancestor_commit.clone();
            let new_branch = self.new_branch.clone();

            let condition = |e: &anyhow::Error| {
                if e.is::<WalletError>() {
                    false
                } else {
                    tracing::warn!("Attempt failed with {:#?}", e);
                    true
                }
            };

            snapshot_handlers.spawn(
                async move {
                    RetryIf::spawn(
                        default_retry_strategy(),
                        || async {
                            tracing::debug!("attempt to push a new snapshot");
                            push_new_branch_snapshot(
                                &blockchain,
                                &file_provider,
                                &remote_network,
                                &dao_addr,
                                &repo_addr,
                                &expected_snapshot_addr,
                                &ancestor_commit,
                                &new_branch,
                                &file_path,
                                &snapshot.current_content,
                                &snapshot.current_ipfs,
                            )
                            .await
                        },
                        condition,
                    )
                    .await
                }
                .instrument(info_span!("tokio::spawn::push_new_branch_snapshot").or_current()),
            );
        }
        while let Some(finished_task) = snapshot_handlers.join_next().await {
            let result: Result<anyhow::Result<()>, JoinError> = finished_task;
            result??;
        }
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    async fn wait_branch_ready(&mut self) -> anyhow::Result<()> {
        // Ensure repository contract state
        // Ping Sergey Horelishev for details
        // todo!();
        Ok(())
    }

    /// Run create branch operation.
    /// Returns false if it was a branch from a commit
    /// and true if it was the first ever branch
    #[instrument(level = "info", skip_all)]
    pub async fn run(&mut self) -> anyhow::Result<bool> {
        let mut is_first_branch = true;
        self.prepare_commit_for_branching().await?;
        if self.ancestor_commit != git_hash::ObjectId::from_str(ZERO_SHA)? {
            self.push_initial_snapshots().await?;
            is_first_branch = false;
        }
        self.preinit_branch().await?;
        self.wait_branch_ready().await?;
        Ok(is_first_branch)
    }
}
