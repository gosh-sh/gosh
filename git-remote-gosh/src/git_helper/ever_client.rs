use crate::{blockchain::TonClient, config::Config};
use std::{env, sync::Arc};
use ton_client::{net::NetworkQueriesProtocol, ClientConfig, ClientContext};

#[instrument(level = "debug")]
pub fn create_client(config: &Config, network: &str) -> anyhow::Result<TonClient> {
    let endpoints = config
        .find_network_endpoints(network)
        .expect("Unknown network");
    let proto = env::var("GOSH_PROTO")
        .unwrap_or_else(|_| ".git".to_string())
        .to_lowercase();

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
            message_processing_timeout: 220000000,
            wait_for_timeout: 220000000,
            query_timeout: 220000000,
            ..Default::default()
        },
        ..Default::default()
    };
    let es_client = ClientContext::new(config)
        .map_err(|e| anyhow::anyhow!("failed to create EverSDK client: {}", e))?;

    Ok(Arc::new(es_client))
}
