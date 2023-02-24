use std::ops::Deref;

use async_trait::async_trait;

use crate::blockchain::{
    call::BlockchainCall, contract::ContractInfo, user_wallet::UserWallet,
    BlockchainContractAddress, Everscale,
};

#[derive(Serialize, Debug)]
pub struct DeployTagParams {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "nametag")]
    pub tag_name: String,
    #[serde(rename = "nameCommit")]
    pub commit_id: String,
    #[serde(rename = "content")]
    pub content: String,
    #[serde(rename = "commit")]
    pub commit_address: BlockchainContractAddress,
}

#[derive(Serialize, Debug)]
pub struct DeleteTagParams {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "nametag")]
    pub tag_name: String,
}

#[async_trait]
pub trait Tagging {
    async fn deploy_tag(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        tag_name: String,
        commit_id: String,
        content: String,
        commit_address: BlockchainContractAddress,
    ) -> anyhow::Result<()>;

    async fn delete_tag(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        tag_name: String,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl Tagging for Everscale {
    #[instrument(level = "trace", skip_all)]
    async fn deploy_tag(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        tag_name: String,
        commit_id: String,
        content: String,
        commit_address: BlockchainContractAddress,
    ) -> anyhow::Result<()> {
        let wallet_contract = wallet.take_one().await?;
        tracing::debug!("Acquired wallet: {}", wallet_contract.get_address());

        let params = DeployTagParams {
            repo_name,
            tag_name,
            commit_id,
            content,
            commit_address,
        };
        tracing::debug!("deployTag params: {:?}", params);

        let result = self
            .send_message(
                wallet_contract.deref(),
                "deployTag",
                Some(serde_json::to_value(params)?),
                None,
            )
            .await
            .map(|_| ());

        drop(wallet_contract);

        if let Err(ref e) = result {
            tracing::debug!("deploy_tag_error: {}", e);
        }

        result
    }

    #[instrument(level = "trace", skip_all)]
    async fn delete_tag(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        tag_name: String,
    ) -> anyhow::Result<()> {
        let wallet_contract = wallet.take_one().await?;
        tracing::debug!("Acquired wallet: {}", wallet_contract.get_address());

        let params = DeleteTagParams {
            repo_name,
            tag_name,
        };
        tracing::debug!("deleteTag params: {:?}", params);

        let result = self
            .send_message(
                wallet_contract.deref(),
                "deleteTag",
                Some(serde_json::to_value(params)?),
                None,
            )
            .await
            .map(|_| ());

        drop(wallet_contract);

        if let Err(ref e) = result {
            tracing::debug!("delete_tag_error: {}", e);
        }

        result
    }
}
