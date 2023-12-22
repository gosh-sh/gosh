use super::{
    contract::ContractInfo, BlockchainContractAddress, CallResult, Everscale, SendMessageResult,
};
pub use crate::abi as gosh_abi;
use crate::blockchain::{default_callback, BlockchainService, GoshContract};
use async_trait::async_trait;
use std::{
    sync::Arc,
    time::{Duration, Instant},
};
use ton_client::{
    abi::{CallSet, ParamsOfEncodeMessage, ResultOfEncodeMessage, Signer},
    processing::{
        ParamsOfProcessMessage, ParamsOfSendMessage, ResultOfProcessMessage, ResultOfSendMessage,
    },
};
use tracing::Instrument;

#[async_trait]
pub(super) trait BlockchainCall {
    async fn call<C>(
        &self,
        contract: &C,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<CallResult>
    where
        C: ContractInfo + Sync;

    async fn send_message<C>(
        &self,
        contract: &C,
        function_name: &str,
        args: Option<serde_json::Value>,
        expected_address: Option<BlockchainContractAddress>,
    ) -> anyhow::Result<SendMessageResult>
    where
        C: ContractInfo + Sync;
}

#[async_trait]
impl BlockchainCall for Everscale {
    #[instrument(level = "info", skip_all)]
    async fn call<C>(
        &self,
        contract: &C,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> anyhow::Result<CallResult>
    where
        C: ContractInfo + Sync,
    {
        tracing::trace!(
            "blockchain call start contract.address: {:?}, function: {}, args: {:?}",
            contract.get_address().clone(),
            function_name,
            args
        );
        let call_set = match args {
            Some(value) => CallSet::some_with_function_and_input(function_name, value),
            None => CallSet::some_with_function(function_name),
        };
        let signer = match contract.get_keys() {
            Some(key_pair) => Signer::Keys {
                keys: key_pair.to_owned(),
            },
            None => Signer::None,
        };

        let message_encode_params = ParamsOfEncodeMessage {
            abi: contract.get_abi().to_owned(),
            address: Some(String::from(contract.get_address().clone())),
            call_set,
            signer,
            deploy_set: None,
            processing_try_index: None,
            signature_id: None,
        };

        let sdk_result = ton_client::processing::process_message(
            Arc::clone(self.client()),
            ParamsOfProcessMessage {
                send_events: true,
                message_encode_params,
            },
            default_callback,
        )
        .instrument(info_span!("blockchain_client::process_message").or_current())
        .await;
        if let Err(ref e) = sdk_result {
            tracing::trace!("process_message error: {:#?}", e);
        }
        let ResultOfProcessMessage {
            transaction, /* decoded, */
            ..
        } = sdk_result?;
        let call_result: CallResult = serde_json::from_value(transaction)?;

        tracing::trace!("trx id: {}", call_result.trx_id);

        Ok(call_result)
    }

    #[instrument(level = "info", skip_all)]
    async fn send_message<C>(
        &self,
        contract: &C,
        function_name: &str,
        args: Option<serde_json::Value>,
        expected_address: Option<BlockchainContractAddress>,
    ) -> anyhow::Result<SendMessageResult>
    where
        C: ContractInfo + Sync,
    {
        tracing::trace!(
            "blockchain call start: contract.address: {:?}, function: {}, args: {:?}, expected_address: {:?}",
            contract.get_address().clone(),
            function_name,
            args,
            expected_address,
        );
        let call_set = match args {
            Some(value) => CallSet::some_with_function_and_input(function_name, value),
            None => CallSet::some_with_function(function_name),
        };
        let signer = match contract.get_keys() {
            Some(key_pair) => Signer::Keys {
                keys: key_pair.to_owned(),
            },
            None => Signer::None,
        };

        let ResultOfEncodeMessage {
            message,
            message_id,
            address,
            ..
        } = ton_client::abi::encode_message(
            Arc::clone(self.client()),
            ParamsOfEncodeMessage {
                abi: contract.get_abi().to_owned(),
                address: Some(String::from(contract.get_address().clone())),
                call_set,
                signer,
                deploy_set: None,
                processing_try_index: None,
                signature_id: None,
            },
        )
        .await?;

        tracing::trace!(
            "sending message ({message_id}) to {}",
            contract.get_address()
        );
        let ResultOfSendMessage {
            shard_block_id,
            sending_endpoints,
        } = ton_client::processing::send_message(
            Arc::clone(self.client()),
            ParamsOfSendMessage {
                abi: None,
                message,
                send_events: true,
            },
            default_callback,
        )
        .instrument(info_span!("blockchain_client::send_message").or_current())
        .await
        .map_err(|e| anyhow::format_err!("send_message error: {e}"))?;

        if let Some(expected_address) = expected_address {
            let start = Instant::now();
            let timeout = Duration::from_secs(*crate::config::DEPLOY_CONTRACT_TIMEOUT);

            // we don't care what ABI the contract has
            let expected_contract = GoshContract::new(&expected_address, gosh_abi::TREE);
            loop {
                if expected_contract.is_active(self.client()).await? {
                    tracing::trace!("expected contract {} is active", expected_address);
                    break;
                }
                if start.elapsed() > timeout {
                    anyhow::bail!(
                        "Timeout exceeded: expected contract {expected_address} didn't appear within {}s",
                        timeout.as_secs(),
                    );
                }
                tokio::time::sleep(Duration::from_millis(300)).await;
            }
        }

        let call_result = SendMessageResult {
            shard_block_id,
            message_id,
            sending_endpoints,
        };
        Ok(call_result)
    }
}
