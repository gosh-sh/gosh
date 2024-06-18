use crate::{blockchain::EverClient, config::Config, utilities::env::parse_env_or};
use std::{env, sync::Arc, time::Duration};
use ton_client::{net::NetworkQueriesProtocol, ClientConfig, ClientContext};

// default timeout for all types of operation (e.g. message_processing, wait_for, query)
static DEFAULT_BLOCKCHAIN_TIMEOUT: Duration = Duration::from_secs(15 * 60);
static BLOCKCHAIN_TIMEOUT: &'static str = "GOSH_BLOCKCHAIN_TIMEOUT_SEC";
static MESSAGE_PROCESSING_TIMEOUT: &'static str = "GOSH_MESSAGE_PROCESSING_TIMEOUT_SEC";
static WAIT_FOR_TIMEOUT: &'static str = "GOSH_WAIT_FOR_TIMEOUT_SEC";
static QUERY_TIMEOUT: &'static str = "GOSH_QUERY_TIMEOUT_SEC";

#[instrument(level = "info", skip_all)]
pub fn create_client(config: &Config, network: &str) -> anyhow::Result<EverClient> {
    tracing::trace!("create_client: config={config:?}, network={network}");
    let endpoints = config
        .find_network_endpoints(network)
        .expect("Unknown network");
    let proto = env::var("GOSH_PROTO")
        .unwrap_or_else(|_| ".git".to_string())
        .to_lowercase();

    let blockchain_timeout = parse_env_or(BLOCKCHAIN_TIMEOUT, DEFAULT_BLOCKCHAIN_TIMEOUT)?;
    let message_processing_timeout = parse_env_or(MESSAGE_PROCESSING_TIMEOUT, blockchain_timeout)?;
    let wait_for_timeout = parse_env_or(WAIT_FOR_TIMEOUT, blockchain_timeout)?;
    let query_timeout = parse_env_or(QUERY_TIMEOUT, blockchain_timeout)?;

    let config = ClientConfig {
        network: ton_client::net::NetworkConfig {
            sending_endpoint_count: endpoints.len() as u8,
            endpoints: if endpoints.is_empty() {
                None
            } else {
                Some(endpoints)
            },
            queries_protocol: if proto.starts_with("http") {
                NetworkQueriesProtocol::HTTP
            } else {
                NetworkQueriesProtocol::WS
            },
            network_retries_count: 5,
            message_retries_count: 10,
            message_processing_timeout: message_processing_timeout.as_millis().try_into()?,
            wait_for_timeout: wait_for_timeout.as_millis().try_into()?,
            query_timeout: query_timeout.as_millis().try_into()?,
            ..Default::default()
        },
        ..Default::default()
    };
    let es_client = ClientContext::new(config)
        .map_err(|e| anyhow::anyhow!("failed to create EverSDK client: {}", e))?;

    Ok(Arc::new(es_client))
}
