use super::{
    contract::ContractInfo, BlockchainContractAddress, CallResult, Everscale, SendMessageResult,
};
pub use crate::abi as gosh_abi;
use crate::blockchain::{default_callback, BlockchainService, GoshContract};
use async_trait::async_trait;
use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
    sync::Arc,
    time::{Duration, Instant},
};
use ton_client::{
    abi::{CallSet, ParamsOfEncodeMessage, ResultOfEncodeMessage, Signer, FunctionHeader},
    processing::{
        MessageSendingParams, ParamsOfProcessMessage, ParamsOfSendMessage,
        ResultOfProcessMessage, ResultOfSendMessage, ParamsOfSendMessages,
    },
};
use tracing::Instrument;

#[async_trait]
pub trait BlockchainCall {
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

    async fn send_messages(
        &self,
        messages: &Vec<(String, Option<BlockchainContractAddress>)>,
        wait_until: u32,
    ) -> anyhow::Result<String>;

    async fn construct_boc<C>(
        &self,
        contract: &C,
        function_name: &str,
        args: Option<serde_json::Value>,
        expire: Option<u32>,
    ) -> anyhow::Result<(String, String)>
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

        let (message_id, message) =
            self.construct_boc(contract, function_name, args, None).await?;

        tracing::trace!("sending message ({message_id}) to {}", contract.get_address());
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
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }

        let call_result = SendMessageResult {
            shard_block_id,
            message_id,
            sending_endpoints,
        };
        Ok(call_result)
    }

    async fn send_messages(
        &self,
        messages: &Vec<(String, Option<BlockchainContractAddress>)>,
        wait_until: u32,
    ) -> anyhow::Result<String> {
        let messages_num = messages.len();
        let mut hasher = DefaultHasher::new();
        Hash::hash_slice(messages, &mut hasher);
        let qkey = format!("{:x}", hasher.finish());
        let messages: Vec<MessageSendingParams> = messages
            .iter()
            .map(|(boc, addr)| MessageSendingParams {
                boc: boc.to_string(),
                wait_until,
                user_data: if let Some(addr) = addr {
                    Some(serde_json::json!({"expected_address": addr}))
                } else {
                    None
                },
            })
            .collect();

        let params = ParamsOfSendMessages {
            messages,
            monitor_queue: Some(qkey.to_string())
        };
        ton_client::processing::send_messages(self.client().clone(), params).await?;
        tracing::trace!("sent {} messages", messages_num);
        Ok(qkey)
    }

    #[instrument(level = "info", skip_all)]
    async fn construct_boc<C>(
        &self,
        contract: &C,
        function_name: &str,
        args: Option<serde_json::Value>,
        expire: Option<u32>,
    ) -> anyhow::Result<(String, String)>
    where
        C: ContractInfo + Sync,
    {
        tracing::trace!(
            "message BOC constructing: contract.address: {:?}, function: {}, args: {:?}",
            contract.get_address().clone(),
            function_name,
            args,
        );
        let call_set = match args {
            Some(value) => Some(CallSet {
                function_name: function_name.into(),
                header: Some(FunctionHeader {
                    expire,
                    ..Default::default()
                }),
                input: Some(value)
            }),
            None => CallSet::some_with_function(function_name),
        };
        let signer = match contract.get_keys() {
            Some(key_pair) => Signer::Keys {
                keys: key_pair.to_owned(),
            },
            None => Signer::None,
        };

        let ResultOfEncodeMessage {
            message_id,
            message,
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

        Ok((message_id, message))
    }
}
