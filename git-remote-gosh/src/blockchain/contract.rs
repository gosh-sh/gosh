use super::{BlockchainContractAddress, GetVersionResult, TonClient};
use crate::blockchain::{run_local, run_static};
use async_trait::async_trait;
use serde::{de, Deserialize};
use std::fmt::Debug;
use ton_client::{abi::Abi, crypto::KeyPair};

pub trait ContractInfo: Debug {
    fn get_abi(&self) -> &ton_client::abi::Abi;
    fn get_address(&self) -> &super::BlockchainContractAddress;
    fn get_keys(&self) -> &Option<ton_client::crypto::KeyPair>;
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

#[derive(Clone)]
pub struct GoshContract {
    pub address: BlockchainContractAddress,
    pub pretty_name: String,
    pub abi: Abi,
    pub keys: Option<KeyPair>,
    pub boc_ref: Option<String>,
}

impl std::fmt::Debug for GoshContract {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let struct_name = format!("GoshContract<{}>", self.pretty_name);
        f.debug_struct(&struct_name)
            .field("address", &self.address)
            .finish_non_exhaustive()
    }
}

impl GoshContract {
    pub fn new<T>(address: T, (pretty_name, abi): (&str, &str)) -> Self
    where
        T: Into<BlockchainContractAddress>,
    {
        GoshContract {
            pretty_name: pretty_name.to_owned(),
            address: address.into(),
            abi: Abi::Json(abi.to_string()),
            keys: None,
            boc_ref: None,
        }
    }

    pub fn new_with_keys<T>(address: T, (pretty_name, abi): (&str, &str), keys: KeyPair) -> Self
    where
        T: Into<BlockchainContractAddress>,
    {
        GoshContract {
            pretty_name: pretty_name.to_owned(),
            address: address.into(),
            abi: Abi::Json(abi.to_string()),
            keys: Some(keys),
            boc_ref: None,
        }
    }

    #[instrument(level = "debug", skip(context))]
    pub async fn run_local<T>(
        &self,
        context: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        T: de::DeserializeOwned,
    {
        let result = run_local(context, self, function_name, args).await?;
        log::trace!("run_local result: {:?}", result);
        Ok(serde_json::from_value::<T>(result)?)
    }

    #[instrument(level = "debug", skip(context))]
    pub async fn run_static<T>(
        &mut self,
        context: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        T: de::DeserializeOwned,
    {
        let result = run_static(context, self, function_name, args).await?;
        log::trace!("run_statuc result: {:?}", result);
        Ok(serde_json::from_value::<T>(result)?)
    }

    pub async fn get_version(&self, context: &TonClient) -> anyhow::Result<String> {
        let result: GetVersionResult = self.run_local(context, "getVersion", None).await?;
        Ok(result.version)
    }
}

impl ContractInfo for GoshContract {
    fn get_abi(&self) -> &ton_client::abi::Abi {
        &self.abi
    }
    fn get_address(&self) -> &BlockchainContractAddress {
        &self.address
    }
    fn get_keys(&self) -> &Option<ton_client::crypto::KeyPair> {
        &self.keys
    }
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
                    "commitaddr": format!("0:{:64}", 0),
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
        assert_eq!(
            result.branch.commit_address,
            BlockchainContractAddress::new(format!("0:{:64}", 0))
        );
        assert_eq!(result.branch.version, "commit_version");
    }
}
