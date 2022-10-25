use async_trait::async_trait;
use serde::Deserialize;
use std::fmt::Debug;

use crate::blockchain::{run_local, run_static};

use super::{GoshContract, TonClient};

pub trait ContractInfo: Debug {
    fn get_abi(&self) -> &ton_client::abi::Abi;
    fn get_address(&self) -> &super::BlockchainContractAddress;
    fn get_keys(&self) -> &Option<ton_client::crypto::KeyPair>;
}

impl ContractInfo for GoshContract {
    fn get_abi(&self) -> &ton_client::abi::Abi {
        &self.abi
    }
    fn get_address(&self) -> &super::BlockchainContractAddress {
        &self.address
    }
    fn get_keys(&self) -> &Option<ton_client::crypto::KeyPair> {
        &self.keys
    }
}

#[async_trait]
pub trait ContractRead: Debug {
    async fn read_state<T>(
        &self,
        client: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        for<'de> T: Deserialize<'de>;
}

#[async_trait]
impl ContractRead for GoshContract {
    async fn read_state<T>(
        &self,
        client: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        for<'de> T: Deserialize<'de>,
    {
        let result = run_local(client, self, function_name, args).await?;
        log::trace!("run_local result: {:?}", result);
        Ok(serde_json::from_value::<T>(result).map_err(|e| anyhow::Error::from(e))?)
    }
}

#[async_trait]
pub trait ContractStatic: Debug {
    async fn static_method<T>(
        &mut self,
        client: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        for<'de> T: Deserialize<'de>;
}

#[async_trait]
impl ContractStatic for GoshContract {
    async fn static_method<T>(
        &mut self,
        client: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        for<'de> T: Deserialize<'de>,
    {
        let result = run_static(client, self, function_name, args).await?;
        log::trace!("run_statuc result: {:?}", result);
        Ok(serde_json::from_value::<T>(result).map_err(|e| anyhow::Error::from(e))?)
    }
}

#[async_trait]
pub trait ContractMutate: Debug {
    async fn mutate_stte<T>(
        &mut self,
        client: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        for<'de> T: Deserialize<'de>,
    {
        todo!()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        blockchain::{create_client, GetAddrBranchResult, BlockchainContractAddress},
        config::Config,
    };
    use std::sync::Arc;

    #[derive(Clone, Debug)]
    struct TestDummyContract {}

    #[async_trait]
    impl ContractRead for TestDummyContract {
        async fn read_state<T>(
            &self,
            context: &TonClient,
            function_name: &str,
            args: Option<serde_json::Value>,
        ) -> anyhow::Result<T>
        where
            T: for<'de> Deserialize<'de>,
        {
            let v: serde_json::Value = json!({
                "value0": {
                    "branchname": "branch_name",
                    "commitaddr": "0:0000000000000000000000000000000000000000000000000000000000000000",
                    "commitversion": "commit_version"
                }
            });
            serde_json::from_value::<T>(v)
            .map_err(|e| anyhow::Error::from(e))
        }
    }

    #[tokio::test]
    async fn test_dummy_contract() {
        let contract = TestDummyContract {};
        let client = Arc::new(create_client(&Config::default(), "localhost").unwrap());
        let result: GetAddrBranchResult = contract
            .read_state(&client, "getAddrBranch", None)
            .await
            .unwrap();

        assert_eq!(result.branch.branch_name, "branch_name");
        assert_eq!(result.branch.commit_address, BlockchainContractAddress::new("0:0000000000000000000000000000000000000000000000000000000000000000"));
        assert_eq!(result.branch.version, "commit_version");
    }
}
