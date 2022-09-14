use std::fmt::Debug;

use super::{GoshContract, TonClient};
use async_trait::async_trait;
use serde::{de, Deserialize};

// type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
type Result<T> = std::result::Result<T, String>;

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
pub trait ContractRead {
    async fn read_state<T>(
        &self,
        client: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> Result<T>
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
    ) -> Result<T>
    where
        for<'de> T: Deserialize<'de>,
    {
        let result = crate::blockchain::run_local(client, self, function_name, args)
            .await
            .map_err(|e| e.to_string())?;
        log::trace!("run_local result: {:?}", result);
        Ok(serde_json::from_value::<T>(result).map_err(|e| e.to_string())?)
    }
}

#[async_trait]
pub trait Contract<T>
where
    T: de::DeserializeOwned,
{
    async fn read_state(
        &self,
        client: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> Result<T>;

    // async fn run_local(
    //     &self,
    //     client: &TonClient,
    //     function_name: &str,
    //     args: Option<serde_json::Value>,
    // ) -> Result<T>;

    // async fn static_method<T>(
    //     &mut self,
    //     context: &TonClient,
    //     function_name: &str,
    //     args: Option<serde_json::Value>,
    // ) -> Result<T>
    // where
    //     T: de::DeserializeOwned + for<'de> Deserialize<'de>;

    // async fn mutate_state();
}

#[async_trait]
impl<T> Contract<T> for GoshContract
where
    T: de::DeserializeOwned,
{
    async fn read_state(
        &self,
        context: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> Result<T> {
        let result = crate::blockchain::run_local(context, self, function_name, args)
            .await
            .map_err(|e| e.to_string())?;
        log::trace!("run_local result: {:?}", result);
        Ok(serde_json::from_value::<T>(result).map_err(|e| e.to_string())?)
    }

    // async fn run_local(
    //     &self,
    //     client: &TonClient,
    //     function_name: &str,
    //     args: Option<serde_json::Value>,
    // ) -> Result<T> {
    //     self.read_state(client, function_name, args).await
    // }

    // async fn static_method<T>(
    //     &mut self,
    //     context: &TonClient,
    //     function_name: &str,
    //     args: Option<serde_json::Value>,
    // ) -> Result<T>
    // where
    //     T: de::DeserializeOwned,
    // {
    //     let result = crate::blockchain::run_static(context, self, function_name, args).await?;
    //     log::trace!("run_statuc result: {:?}", result);
    //     Ok(serde_json::from_value::<T>(result)?)
    // }

    // async fn mutate_state() {
    //     todo!()
    // }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{blockchain::create_client, config::Config};
    use std::sync::Arc;

    #[derive(Clone)]
    struct TestDummyContract {}

    #[async_trait]
    impl<T> Contract<T> for TestDummyContract
    where
        T: de::DeserializeOwned,
    {
        async fn read_state(
            &self,
            context: &TonClient,
            function_name: &str,
            args: Option<serde_json::Value>,
        ) -> Result<T> {
            serde_json::from_value::<T>(json!({
                "value0": {
                    "key": "branch_key",
                    "value": "branch_value",
                }
            }))
            .map_err(|e| e.to_string())
        }
    }

    #[tokio::test]
    async fn test1() {
        let contract = Box::new(TestDummyContract {})
            as Box<dyn Contract<crate::blockchain::GetAddrBranchResult>>;
        let client = Arc::new(create_client(&Config::default(), "localhost").unwrap());
        let result = contract
            .read_state(&client, "getAddrBranch", None)
            .await
            .unwrap();

        assert_eq!(result.branch.branch_name, "branch_key");
    }
}
