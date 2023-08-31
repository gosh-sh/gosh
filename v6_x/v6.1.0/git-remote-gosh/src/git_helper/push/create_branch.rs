use std::{fmt::Debug, str::FromStr};

use crate::{
    blockchain::{
        branch::DeployBranch, snapshot::wait_snapshots_until_ready, user_wallet::WalletError,
        BlockchainContractAddress, Snapshot,
    },
    git_helper::GitHelper,
};
use git_hash::ObjectId;
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
            self.context.remote.repo.clone(),
            self.new_branch.clone(),
            self.ancestor_commit.to_string(),
        )
        .await?;
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    async fn push_initial_snapshots(&mut self) -> anyhow::Result<()> {
        let repository = self.context.local_repository();
        let tree_root_id = repository
            .find_object(self.ancestor_commit)?
            .into_commit()
            .tree()?
            .id;
        let snapshots_to_deploy: Vec<recorder::Entry> =
            super::utilities::all_files(repository, tree_root_id)?;

        let mut snapshot_handlers = JoinSet::new();

        let context = &mut self.context.clone();
        let mut expected_readiness_for = Vec::<BlockchainContractAddress>::new();

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
            let file_path = entry.filepath.to_string();
            let mut repo_contract = blockchain.repo_contract().clone();

            let expected_snapshot_addr = Snapshot::calculate_address(
                self.context.blockchain.client(),
                &mut repo_contract,
                &self.new_branch, // TODO: change to commit
                &file_path,
            )
            .await?;
            expected_readiness_for.push(expected_snapshot_addr.clone());

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
                                &content,
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

        let result =
            wait_snapshots_until_ready(&self.context.blockchain, &expected_readiness_for).await?;
        if !result.is_empty() {
            anyhow::bail!("Some ({}) of snapshot contracts aren't ready", result.len());
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
            is_first_branch = false;
        }
        self.preinit_branch().await?;
        self.wait_branch_ready().await?;
        Ok(is_first_branch)
    }
}
