use super::{contract::ContractInfo, CallResult, Everscale};
use crate::blockchain::{default_callback, BlockchainService};
use async_trait::async_trait;
use std::sync::Arc;
use ton_client::{
    abi::{CallSet, ParamsOfEncodeMessage, Signer},
    processing::{ParamsOfProcessMessage, ResultOfProcessMessage},
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
        tracing::trace!("blockchain call start");
        tracing::trace!(
            "contract.address: {:?}, function: {}, args: {:?}",
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
}
