use super::{
    contract::ContractRead, BlockchainContractAddress, GetAddrBranchResult, GetBoolResult,
    GoshContract, TonClient,
};
use crate::abi as gosh_abi;
use async_trait::async_trait;
use std::fmt::Debug;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Debug)]
pub struct Blockchain;

#[async_trait]
pub trait BlockchainService: Debug {
    async fn is_branch_protected(
        context: &TonClient,
        repo_addr: &BlockchainContractAddress,
        branch_name: &str,
    ) -> Result<bool>;

    async fn remote_rev_parse(
        context: &TonClient,
        repository_address: &BlockchainContractAddress,
        rev: &str,
    ) -> Result<Option<(BlockchainContractAddress, String)>> {
        Ok(Some((BlockchainContractAddress::new("test"), "".to_owned())))
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
    ) -> Result<Option<(BlockchainContractAddress, String)>> {
        let contract = GoshContract::new(repository_address, gosh_abi::REPO);
        let args = serde_json::json!({ "name": rev });
        let result: GetAddrBranchResult = contract
            .read_state(context, "getAddrBranch", Some(args))
            .await?;
        if result.branch.branch_name.is_empty() {
            Ok(None)
        } else {
            Ok(Some((result.branch.commit_address, result.branch.version)))
        }
    }
}
