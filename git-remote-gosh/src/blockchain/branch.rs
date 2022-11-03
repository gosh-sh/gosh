use super::call::BlockchainCall;
use super::contract::ContractInfo;
use super::{CallResult, Everscale};
use async_trait::async_trait;

#[async_trait]
pub trait DeployBranch {
    async fn deploy_branch<W>(
        &self,
        wallet: &W,
        repo_name: &str,
        new_name: &str,
        from_commit: &str,
    ) -> anyhow::Result<()>
    where
        W: ContractInfo + Sync + 'static;
}

#[async_trait]
impl DeployBranch for Everscale {
    async fn deploy_branch<W>(
        &self,
        wallet: &W,
        repo_name: &str,
        new_name: &str,
        from_commit: &str,
    ) -> anyhow::Result<()>
    where
        W: ContractInfo + Sync + 'static,
    {
        let params = serde_json::json!({
            "repoName": repo_name,
            "newName": new_name,
            "fromCommit": from_commit,
        });
        self.call(wallet, "deployBranch", Some(params))
            .await
            .map(|_| ())
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    // see details: https://docs.rs/mockall/latest/mockall/#multiple-and-inherited-traits
    mockall::mock! {
        #[derive(Debug, Clone)]
        pub Everscale {
            // empty
        }

        #[async_trait]
        impl DeployBranch for Everscale {
            async fn deploy_branch<W>(
                &self,
                wallet: &W,
                repo_name: &str,
                new_name: &str,
                from_commit: &str,
            ) -> anyhow::Result<CallResult>
            where
                W: ContractInfo + Sync + 'static;
        }
    }
}
