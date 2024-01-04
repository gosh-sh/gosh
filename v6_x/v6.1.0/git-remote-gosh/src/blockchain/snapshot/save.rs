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
    pub contract_name: String,
    #[serde(rename = "value1")]
    pub version: String,
}

// TODO: leave only one struct Diff
#[derive(Serialize, Debug)]
pub struct Diff {
    #[serde(rename = "snap")]
    pub snapshot_addr: BlockchainContractAddress,
    #[serde(rename = "nameSnap")]
    pub snapshot_file_path: String,
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
    #[serde(rename = "commitsha")]
    commit_sha: String,
    #[serde(rename = "name")]
    file_path: String,
    #[serde(rename = "snapshotdata")]
    content: String,
    #[serde(rename = "snapshotipfs")]
    ipfs: Option<String>,
    #[serde(rename = "isPin")]
    is_pin: bool,
}

#[derive(Serialize, Debug)]
struct DeleteSnapshotParams {
    #[serde(rename = "snap")]
    snapshot_address: BlockchainContractAddress,
}

// #[derive(Debug, Deserialize)]
// struct SaveRes {
//     #[serde(alias = "Hash")]
//     hash: String,
// }

// Note: making fields verbose
// It must be very clear what is going on
#[derive(Debug, Clone, Serialize, Deserialize)]
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

    async fn construct_deploy_diff_message(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        branch_name: String,
        commit_id: String,
        diffs: Diff,
        index1: u32,
        index2: u32,
        last: bool,
        expire: u32,
    ) -> anyhow::Result<String>;
}

#[async_trait]
impl DeployDiff for Everscale {
    #[instrument(level = "info", skip_all)]
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
        tracing::trace!(
            "deploy_diff: repo_name={}, branch_name={}, commit_id={}, index1={}, index2={}, last={}",
            repo_name,
            branch_name,
            commit_id,
            index1,
            index2,
            last,
        );
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
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());
        let result = self
            .send_message(
                wallet_contract.deref(),
                "deployDiff",
                Some(serde_json::to_value(args)?),
                None,
            )
            .await?;
        drop(wallet_contract);
        tracing::trace!("deployDiff result: {:?}", result);
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    async fn construct_deploy_diff_message(
        &self,
        wallet: &UserWallet,
        repo_name: String,
        branch_name: String,
        commit_id: String,
        diff: Diff,
        index1: u32,
        index2: u32,
        last: bool,
        expire: u32,
    ) -> anyhow::Result<String> {
        tracing::trace!(
            "construct_deploy_diff_message: repo_name={}, branch_name={}, commit_id={}, index1={}, index2={}, last={}",
            repo_name,
            branch_name,
            commit_id,
            index1,
            index2,
            last,
        );
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
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());
        let (message_id, boc) = self
            .construct_boc(
                wallet_contract.deref(),
                "deployDiff",
                Some(serde_json::to_value(args)?),
                Some(expire),
            )
            .await?;
        drop(wallet_contract);
        tracing::trace!("construct_deploy_diff_message done: {message_id}");
        Ok(boc)
    }
}

#[async_trait]
pub trait DeployNewSnapshot {
    async fn deploy_new_snapshot(
        &self,
        wallet: &UserWallet,
        repo_address: BlockchainContractAddress,
        commit_id: String,
        file_path: String,
        content: String,
        ipfs: Option<String>,
    ) -> anyhow::Result<()>;

    async fn construct_deploy_snapshot_message(
        &self,
        wallet: &UserWallet,
        repo_address: BlockchainContractAddress,
        commit_id: String,
        file_path: String,
        content: String,
        ipfs: Option<String>,
        expire: u32,
    ) -> anyhow::Result<String>;
}

#[async_trait]
impl DeployNewSnapshot for Everscale {
    #[instrument(level = "info", skip_all)]
    async fn deploy_new_snapshot(
        &self,
        wallet: &UserWallet,
        repo_address: BlockchainContractAddress,
        commit_id: String,
        file_path: String,
        content: String,
        ipfs: Option<String>,
    ) -> anyhow::Result<()> {
        tracing::trace!("deploy_new_snapshot: repo_address={repo_address}, commit_id={commit_id}, file_path={file_path}");
        let args = DeploySnapshotParams {
            repo_address,
            commit_sha: commit_id,
            file_path,
            content,
            ipfs,
            is_pin: false,
        };
        let wallet_contract = wallet.take_one().await?;
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());
        let result = self
            .send_message(
                wallet_contract.deref(),
                "deployNewSnapshot",
                Some(serde_json::to_value(args)?),
                None,
            )
            .await
            .map(|_| ());
        drop(wallet_contract);
        if let Err(ref e) = result {
            tracing::trace!("deploy_branch_error: {}", e);
        }
        result
    }

    #[instrument(level = "info", skip_all)]
    async fn construct_deploy_snapshot_message(
        &self,
        wallet: &UserWallet,
        repo_address: BlockchainContractAddress,
        commit_id: String,
        file_path: String,
        content: String,
        ipfs: Option<String>,
        expire: u32,
    ) -> anyhow::Result<String> {
        tracing::trace!("deploy_new_snapshot: repo_address={repo_address}, commit_id={commit_id}, file_path={file_path}");
        let args = DeploySnapshotParams {
            repo_address,
            commit_sha: commit_id,
            file_path,
            content,
            ipfs,
            is_pin: false,
        };
        let wallet_contract = wallet.take_one().await?;
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());
        let (message_id, boc) = self
            .construct_boc(
                wallet_contract.deref(),
                "deployNewSnapshot",
                Some(serde_json::to_value(args)?),
                Some(expire),
            )
            .await?;
        drop(wallet_contract);
        tracing::trace!("construct_deploy_snapshot_message done: {message_id}");
        Ok(boc)
    }
}

#[async_trait]
pub trait DeleteSnapshot {
    async fn delete_snapshot(
        &self,
        wallet: &UserWallet,
        snapshot_address: BlockchainContractAddress,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl DeleteSnapshot for Everscale {
    #[instrument(level = "info", skip_all)]
    async fn delete_snapshot(
        &self,
        wallet: &UserWallet,
        snapshot_address: BlockchainContractAddress,
    ) -> anyhow::Result<()> {
        tracing::trace!("delete_snapshot: address={snapshot_address}");

        let wallet_contract = wallet.take_one().await?;
        let args = DeleteSnapshotParams { snapshot_address };
        let result = self
            .send_message(
                wallet_contract.deref(),
                "deleteSnapshot",
                Some(serde_json::to_value(args)?),
                None,
            )
            .await
            .map(|_| ());
        drop(wallet_contract);

        if let Err(ref e) = result {
            tracing::trace!("delete_snapshot: error: {}", e);
        }

        result
    }
}
