use super::{BlockchainContractAddress, GetBoolResult, GoshContract, TonClient};
use crate::abi as gosh_abi;
use async_trait::async_trait;
use std::fmt::Debug;

#[derive(Debug)]
pub struct Blockchain;

#[async_trait]
pub trait BlockchainService: Debug {
    async fn is_branch_protected(
        context: &TonClient,
        repo_addr: &BlockchainContractAddress,
        branch_name: &str,
    ) -> Result<bool, Box<dyn std::error::Error>>;
}

#[async_trait]
impl BlockchainService for Blockchain {
    async fn is_branch_protected(
        context: &TonClient,
        repo_addr: &BlockchainContractAddress,
        branch_name: &str,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        let contract = GoshContract::new(repo_addr, gosh_abi::REPO);

        let params = serde_json::json!({ "branch": branch_name });
        let result: GetBoolResult = contract
            .run_local(context, "isBranchProtected", Some(params))
            .await?;
        Ok(result.is_ok)
    }
}
