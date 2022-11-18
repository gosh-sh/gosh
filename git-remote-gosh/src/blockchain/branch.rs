use super::call::BlockchainCall;

use super::Everscale;
use crate::blockchain::user_wallet::UserWallet;

use async_trait::async_trait;
use std::ops::Deref;

#[async_trait]
pub trait DeployBranch {
    async fn deploy_branch(
        &self,
        wallet: &UserWallet,
        repo_name: &str,
        new_name: &str,
        from_commit: &str,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl DeployBranch for Everscale {
    async fn deploy_branch(
        &self,
        wallet: &UserWallet,
        repo_name: &str,
        new_name: &str,
        from_commit: &str,
    ) -> anyhow::Result<()> {
        let params = serde_json::json!({
            "repoName": repo_name,
            "newName": new_name,
            "fromCommit": from_commit,
        });
        let wallet_contract = wallet.take_one().await?;
        let result = self
            .call(wallet_contract.deref(), "deployBranch", Some(params))
            .await
            .map(|_| ());
        drop(wallet_contract);
        if let Err(ref e) = result {
            tracing::debug!("deploy_branch_error: {}", e);
        }
        result
    }
}
