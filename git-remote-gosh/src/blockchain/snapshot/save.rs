#![allow(unused_variables)]
use crate::blockchain::contract::ContractInfo;
use crate::blockchain::user_wallet::UserWallet;
use async_trait::async_trait;
use std::ops::Deref;

use crate::{
    blockchain::call::BlockchainCall,
    blockchain::{BlockchainContractAddress, Everscale},
};

#[derive(Deserialize, Debug)]
pub struct GetDiffAddrResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
pub struct GetDiffResultResult {
    #[serde(rename = "value0")]
    pub hex_encoded_compressed_content: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct GetVersionResult {
    #[serde(rename = "value0")]
    pub version: String,
    #[serde(rename = "value1")]
    pub contract_name: String,
}

#[derive(Serialize, Debug)]
pub struct Diff {
    #[serde(rename = "snap")]
    pub snapshot_addr: BlockchainContractAddress,
    #[serde(rename = "commit")]
    pub commit_id: String,
    pub patch: Option<String>,
    pub ipfs: Option<String>,
    #[serde(rename = "removeIpfs")]
    pub remove_ipfs: bool,
    pub sha1: String,
    pub sha256: String,
}

#[derive(Serialize, Debug)]
struct DeployDiffParams {
    #[serde(rename = "repoName")]
    repo_name: String,
    #[serde(rename = "branchName")]
    branch_name: String,
    #[serde(rename = "commitName")]
    commit_id: String,
    diffs: Vec<Diff>,
    index1: u32,
    index2: u32,
    last: bool,
}

#[derive(Serialize, Debug)]
struct DeploySnapshotParams {
    #[serde(rename = "repo")]
    repo_address: BlockchainContractAddress,
    #[serde(rename = "branch")]
    branch_name: String,
    #[serde(rename = "commit")]
    commit_id: String,
    #[serde(rename = "name")]
    file_path: String,
    #[serde(rename = "snapshotdata")]
    content: String,
    #[serde(rename = "snapshotipfs")]
    ipfs: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SaveRes {
    #[serde(alias = "Hash")]
    hash: String,
}

// Note: making fields verbose
// It must be very clear what is going on
#[derive(Debug, Clone)]
pub struct PushDiffCoordinate {
    pub index_of_parallel_thread: u32,
    pub order_of_diff_in_the_parallel_thread: u32,
}

#[async_trait]
pub trait DeployDiff {
    async fn deploy_diff(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        branch_name: String,
        commit_id: String,
        diffs: Diff,
        index1: u32,
        index2: u32,
        last: bool,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl DeployDiff for Everscale {
    #[instrument(level = "debug", skip(self, wallet, diff))]
    async fn deploy_diff(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        branch_name: String,
        commit_id: String,
        diff: Diff,
        index1: u32,
        index2: u32,
        last: bool,
    ) -> anyhow::Result<()> {
        let diffs = vec![diff];
        let args = DeployDiffParams {
            repo_name,
            branch_name,
            commit_id,
            diffs,
            index1,
            index2,
            last,
        };

        let wallet_contract = wallet.take_one().await?;
        tracing::debug!("Acquired wallet: {}", wallet_contract.get_address());
        let result = self
            .call(
                wallet_contract.deref(),
                "deployDiff",
                Some(serde_json::to_value(args)?),
            )
            .await?;
        drop(wallet_contract);
        tracing::debug!("deployDiff result: {:?}", result);
        Ok(())
    }
}

#[async_trait]
pub trait DeployNewSnapshot {
    async fn deploy_new_snapshot(
        &self,
        wallet: &UserWallet,
        repo_address: BlockchainContractAddress,
        branch_name: String,
        commit_id: String,
        file_path: String,
        content: String,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl DeployNewSnapshot for Everscale {
    #[instrument(level = "debug", skip(self, wallet, content))]
    async fn deploy_new_snapshot(
        &self,
        wallet: &UserWallet,
        repo_address: BlockchainContractAddress,
        branch_name: String,
        commit_id: String,
        file_path: String,
        content: String,
    ) -> anyhow::Result<()> {
        let args = DeploySnapshotParams {
            repo_address,
            branch_name,
            commit_id,
            file_path,
            content,
            ipfs: None,
        };
        let wallet_contract = wallet.take_one().await?;
        tracing::debug!("Acquired wallet: {}", wallet_contract.get_address());
        let result = self
            .call(
                wallet_contract.deref(),
                "deployNewSnapshot",
                Some(serde_json::to_value(args)?),
            )
            .await
            .map(|_| ());
        drop(wallet_contract);
        if let Err(ref e) = result {
            tracing::debug!("deploy_branch_error: {}", e);
        }
        result
    }
}
