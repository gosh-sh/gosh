use crate::blockchain::{
    call::BlockchainCall, contract::ContractInfo, user_wallet::UserWallet, Everscale,
};
use async_trait::async_trait;

#[derive(Serialize, Debug)]
struct DeployBranchParams {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "newName")]
    pub new_name: String,
    #[serde(rename = "fromCommit")]
    pub from_commit: String,
}

#[derive(Serialize, Debug)]
struct DeleteBranchParams {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "Name")]
    pub branch_name: String,
}

#[async_trait]
pub trait DeployBranch {
    async fn deploy_branch(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        new_name: String,
        from_commit: String,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl DeployBranch for Everscale {
    async fn deploy_branch(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        new_name: String,
        from_commit: String,
    ) -> anyhow::Result<()> {
        let wallet_contract = wallet.take_zero_wallet().await?;

        let params = DeployBranchParams {
            repo_name,
            new_name,
            from_commit,
        };
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());

        let result = self
            .call(
                &wallet_contract,
                "deployBranch",
                Some(serde_json::to_value(params)?),
            )
            .await
            .map(|_| ());
        // drop(wallet_contract);
        if let Err(ref e) = result {
            tracing::trace!("deploy_branch_error: {}", e);
        }
        result
    }
}

#[async_trait]
pub trait DeleteBranch {
    async fn delete_branch(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        branch_name: String,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl DeleteBranch for Everscale {
    #[instrument(level = "trace", skip_all)]
    async fn delete_branch(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        branch_name: String,
    ) -> anyhow::Result<()> {
        let wallet_contract = wallet.take_zero_wallet().await?;
        tracing::debug!("Acquired wallet: {}", wallet_contract.get_address());

        let params = DeleteBranchParams {
            repo_name,
            branch_name,
        };
        tracing::debug!("deleteBranch params: {:?}", params);

        let result = self
            .call(
                &wallet_contract,
                "deleteBranch",
                Some(serde_json::to_value(params)?),
            )
            .await
            .map(|_| ());

        // drop(wallet_contract);

        if let Err(ref e) = result {
            tracing::debug!("delete_branch_error: {}", e);
        }

        result
    }
}
