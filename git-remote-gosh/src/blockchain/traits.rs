use super::{
    contract::{ContractInfo, ContractRead, ContractStatic},
    BlockchainContractAddress, CallResult, GetAddrBranchResult, GetBoolResult, GetCommitAddrResult,
    GoshCommit, GoshContract, TonClient,
};
use crate::blockchain;
use crate::{
    abi as gosh_abi,
    blockchain::{call, commit::save::DeployCommitParams, user_wallet, ZERO_SHA},
    git_helper::GitHelper,
};
use async_trait::async_trait;
use git_hash::ObjectId;
use git_object::tree::{self, EntryRef};
use git_odb;
use std::{
    collections::{HashMap, HashSet, VecDeque},
    fmt::Debug,
    marker::{Send, Sync},
};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Debug)]
pub struct Blockchain;

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait BlockchainService: Debug + Send + Sync {
    async fn is_branch_protected(
        context: &TonClient,
        repo_addr: &BlockchainContractAddress,
        branch_name: &str,
    ) -> Result<bool>;
    async fn remote_rev_parse(
        context: &TonClient,
        repository_address: &BlockchainContractAddress,
        rev: &str,
    ) -> Result<Option<BlockchainContractAddress>>;
    async fn get_commit_by_addr(
        context: &TonClient,
        address: &BlockchainContractAddress,
    ) -> Result<Option<GoshCommit>>;

    async fn get_commit_address<C>(
        context: &TonClient,
        repo_contract: &mut C,
        sha: &str,
    ) -> Result<BlockchainContractAddress>
    where
        C: ContractStatic + Send + 'static,
    {
        let result: GetCommitAddrResult = repo_contract
            .static_method(
                context,
                "getCommitAddr",
                gosh_abi::get_commit_addr_args(sha),
            )
            .await?;
        Ok(result.address)
    }
}

#[async_trait]
impl BlockchainService for Blockchain {
    #[instrument(level = "debug", skip(context))]
    async fn is_branch_protected(
        context: &TonClient,
        repo_addr: &BlockchainContractAddress,
        branch_name: &str,
    ) -> Result<bool> {
        let contract = GoshContract::new(repo_addr, gosh_abi::REPO);

        let params = serde_json::json!({ "branch": branch_name });
        let result: GetBoolResult = contract
            .run_local(context, "isBranchProtected", Some(params))
            .await?;
        Ok(result.is_ok)
    }

    #[instrument(level = "debug", skip(context))]
    async fn remote_rev_parse(
        context: &TonClient,
        repository_address: &BlockchainContractAddress,
        rev: &str,
    ) -> Result<Option<BlockchainContractAddress>> {
        let contract = GoshContract::new(repository_address, gosh_abi::REPO);
        let args = serde_json::json!({ "name": rev });
        let result: GetAddrBranchResult = contract
            .read_state(context, "getAddrBranch", Some(args))
            .await?;
        if result.branch.branch_name.is_empty() {
            Ok(None)
        } else {
            Ok(Some(result.branch.commit_address))
        }
    }

    #[instrument(level = "debug", skip(context))]
    async fn get_commit_by_addr(
        context: &TonClient,
        address: &BlockchainContractAddress,
    ) -> Result<Option<GoshCommit>> {
        let commit = GoshCommit::load(context, address).await?;
        Ok(Some(commit))
    }
}
