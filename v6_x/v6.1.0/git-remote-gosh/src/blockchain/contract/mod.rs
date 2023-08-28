pub mod wait_contracts_deployed;

use super::{BlockchainContractAddress, EverClient, GetVersionResult};
use crate::blockchain::{get_account_data, run_local, run_static};
use async_trait::async_trait;
use serde::{de, Deserialize};
use std::fmt::Debug;

use ton_client::{abi::Abi, crypto::KeyPair};

// enum AccountType {
//     Uninit,
//     Active,
//     Frozen,
//     NonExistent,
// }

#[derive(Deserialize, Debug)]
pub struct ContractStatus {
    #[serde(rename = "acc_type")]
    status: u32,
    #[serde(with = "ton_sdk::json_helper::uint")]
    balance: u64,
}

pub trait ContractInfo: Debug {
    fn get_abi(&self) -> &ton_client::abi::Abi;
    fn get_address(&self) -> &super::BlockchainContractAddress;
    fn get_keys(&self) -> &Option<ton_client::crypto::KeyPair>;
}

pub trait MirroredContractsPool: Debug {
    type Output;
    fn take_one(&self) -> Self::Output;
}

#[async_trait]
pub trait ContractStatic: Debug {
    async fn static_method<T>(
        &mut self,
        client: &EverClient,
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
        client: &EverClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        for<'de> T: Deserialize<'de>;

    async fn load_account(&self, client: &EverClient) -> anyhow::Result<Option<ContractStatus>>;
}

#[async_trait]
pub trait ContractMutate: Debug {
    async fn mutate_state<T>(
        &mut self,
        client: &EverClient,
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
        client: &EverClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        for<'de> T: Deserialize<'de>,
    {
        let result = run_static(client, self, function_name, args).await?;
        tracing::trace!("run_static result: {:?}", result);
        Ok(serde_json::from_value::<T>(result).map_err(|e| anyhow::Error::from(e))?)
    }
}

#[derive(Clone)]
pub struct GoshContract {
    pub address: BlockchainContractAddress,
    pub pretty_name: String,
    pub abi: Abi,
    pub keys: Option<KeyPair>,
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
        }
    }

    #[instrument(level = "info", skip_all)]
    pub async fn run_static<T>(
        &self,
        context: &EverClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        T: de::DeserializeOwned,
    {
        let result = run_static(context, self, function_name, args).await?;
        tracing::trace!("run_static result: {:?}", result);
        Ok(serde_json::from_value::<T>(result)?)
    }

    #[instrument(level = "info", skip_all)]
    pub async fn run_local<T>(
        &self,
        context: &EverClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        T: de::DeserializeOwned,
    {
        let result = run_local(context, self, function_name, args).await?;
        tracing::trace!("run_local result: {:?}", result);
        Ok(serde_json::from_value::<T>(result)?)
    }

    pub async fn get_version(&self, context: &EverClient) -> anyhow::Result<String> {
        let result: GetVersionResult = self.read_state(context, "getVersion", None).await?;
        tracing::trace!("get_version result: {:?}", result);
        Ok(result.version)
    }

    pub async fn is_active(&self, context: &EverClient) -> anyhow::Result<bool> {
        let res = match self.load_account(context).await? {
            None => Ok(false),
            Some(v) => Ok(v.status == 1),
        };
        tracing::trace!("Check account {} is active: {:?}", self.address, res);
        res
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
    #[instrument(level = "info", skip_all)]
    async fn read_state<T>(
        &self,
        client: &EverClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        for<'de> T: Deserialize<'de>,
    {
        let result = run_local(client, self, function_name, args).await?;
        // TODO: this log can be very long, but the value is JSON and can't be shorten. Consider logging it after deserializing.
        // tracing::trace!("run_local result: {:?}", result);
        Ok(serde_json::from_value::<T>(result).map_err(|e| anyhow::Error::from(e))?)
    }

    async fn load_account(&self, client: &EverClient) -> anyhow::Result<Option<ContractStatus>> {
        let result = get_account_data(client, self).await?;

        if result.is_null() {
            Ok(None)
        } else {
            let result: ContractStatus =
                serde_json::from_value(result).map_err(|e| anyhow::Error::from(e))?;
            Ok(Some(result))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        blockchain::{BlockchainContractAddress, GetAddrBranchResult},
        config::Config,
        git_helper::ever_client::create_client,
    };
    use std::sync::Arc;

    #[derive(Clone, Debug)]
    struct TestDummyContract {}

    #[async_trait]
    impl ContractRead for TestDummyContract {
        async fn read_state<T>(
            &self,
            context: &EverClient,
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
            serde_json::from_value::<T>(v).map_err(|e| anyhow::Error::from(e))
        }

        async fn load_account(
            &self,
            context: &EverClient,
        ) -> anyhow::Result<Option<ContractStatus>> {
            let contract_status = ContractStatus {
                status: 1,
                balance: 10000000000,
            };

            Ok(Some(contract_status))
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

        let ContractStatus { status, balance } =
            contract.load_account(&client).await.unwrap().unwrap();

        assert_eq!(status, 1);
        assert_eq!(balance, 10000000000);
    }
}
