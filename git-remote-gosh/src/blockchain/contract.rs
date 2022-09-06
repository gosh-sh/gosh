use super::{GoshContract, TonClient};
use async_trait::async_trait;
use serde::{de, Deserialize};

// type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
type Result<T> = std::result::Result<T, String>;

#[async_trait]
trait Contract {
    async fn read_state<T>(
        &self,
        client: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> Result<T>
    where
        // for<'de> T: Deserialize<'de>;
        T: for<'de> Deserialize<'de> + Clone;

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
impl Contract for GoshContract {
    async fn read_state<T>(
        &self,
        context: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> Result<T>
    where
        T: for<'de> Deserialize<'de> + Clone,
    {
        let result = crate::blockchain::run_local(context, self, function_name, args)
            .await
            .map_err(|e| e.to_string())?;
        log::trace!("run_local result: {:?}", result);
        Ok(serde_json::from_value::<T>(result).map_err(|e| e.to_string())?)
    }

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

    struct TestDummyContract {}

    #[async_trait]
    impl Contract for TestDummyContract {
        async fn read_state<T>(
            &self,
            context: &TonClient,
            function_name: &str,
            args: Option<serde_json::Value>,
        ) -> Result<T>
        where
            T: for<'de> Deserialize<'de> + Clone,
        {
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
        let contract = TestDummyContract {};
        let client = Arc::new(create_client(&Config::default(), "localhost").unwrap());
        let result: crate::blockchain::GetAddrBranchResult = contract
            .read_state(&client, "getAddrBranch", None)
            .await
            .unwrap();

        assert_eq!(result.branch.branch_name, "branch_key");
    }
}
