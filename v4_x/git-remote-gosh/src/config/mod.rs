extern crate shellexpand;
use std::{
    collections::HashMap,
    env, fmt,
    io::{BufReader, Read},
    path::Path,
};

mod defaults;

pub const IPFS_CONTENT_THRESHOLD: usize = 63 * 1024; // 63kb (1kb buffer)
const SET_COMMIT_TIMEOUT: u64 = 60; // in secs
pub const DEPLOY_CONTRACT_TIMEOUT: &u64 = &180; // in secs

const USE_CACHE_ENV_VARIABLE_NAME: &str = "GOSH_USE_CACHE";

fn default_timeout() -> u64 {
    SET_COMMIT_TIMEOUT
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
pub struct UserWalletConfig {
    pub pubkey: String,
    pub secret: String,
    pub profile: String,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct NetworkConfig {
    #[serde(rename = "user-wallet")]
    user_wallet: Option<UserWalletConfig>,
    // Note corresponding test:
    // ensure_added_network_does_not_drop_defaults
    #[serde(default = "std::vec::Vec::<String>::new")]
    endpoints: Vec<String>,
    #[serde(default = "default_timeout")]
    timeout: u64,
}

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(default)]
pub struct Config {
    #[serde(rename = "ipfs")]
    ipfs_http_endpoint: String,

    #[serde(rename = "primary-network")]
    primary_network: String,

    #[serde(rename = "networks")]
    networks: HashMap<String, NetworkConfig>,
}

impl fmt::Debug for UserWalletConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("UserWalletConfig")
            .field("pubkey", &self.pubkey)
            .finish_non_exhaustive()
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            ipfs_http_endpoint: defaults::IPFS_HTTP_ENDPOINT.to_string(),
            networks: defaults::NETWORK_ENDPOINTS
                .iter()
                .map(|(network, endpoints)| {
                    let network_config = NetworkConfig {
                        user_wallet: None,
                        endpoints: endpoints.to_vec(),
                        timeout: default_timeout(),
                    };
                    (network.to_owned(), network_config)
                })
                .collect(),
            primary_network: defaults::PRIMARY_NETWORK.to_string(),
        }
    }
}

impl Config {
    pub fn ipfs_http_endpoint(&self) -> &str {
        &self.ipfs_http_endpoint
    }

    pub fn primary_network(&self) -> &str {
        &self.primary_network
    }

    fn load<TReader: Read + Sized>(config_reader: TReader) -> anyhow::Result<Self> {
        let config: Config = serde_json::from_reader(config_reader)
            .map_err(|e| anyhow::format_err!("Failed to parse GOSH config: {e}"))?;
        Ok(config)
    }

    pub fn init() -> anyhow::Result<Self> {
        let config_path =
            env::var("GOSH_CONFIG_PATH").unwrap_or_else(|_| defaults::CONFIG_LOCATION.to_string());
        let config_path = shellexpand::tilde(&config_path).into_owned();
        let config_path = Path::new(&config_path);
        if !config_path.exists() {
            return Ok(Self::default());
        }
        let config_file = std::fs::File::open(config_path)?;
        let config_reader = BufReader::new(config_file);
        Self::load(config_reader)
    }

    pub fn use_cache(&self) -> Option<String> {
        env::var(USE_CACHE_ENV_VARIABLE_NAME).ok()
    }

    pub fn get_primary_network_timeout(&self) -> u64 {
        match self.networks.get(&self.primary_network) {
            Some(net_config) => net_config.timeout,
            _ => default_timeout(),
        }
    }

    #[instrument(level = "info", skip_all)]
    pub fn find_network_endpoints(&self, network: &str) -> Option<Vec<String>> {
        tracing::trace!("find_network_endpoints: network={network}");
        let network_config = self.networks.get(network);
        match network_config {
            None => defaults::NETWORK_ENDPOINTS
                .get(network)
                .and_then(|endpoints| Some(endpoints.clone())),
            Some(network_config) => {
                if network_config.endpoints.len() == 0 {
                    defaults::NETWORK_ENDPOINTS
                        .get(network)
                        .and_then(|endpoints| Some(endpoints.clone()))
                } else {
                    Some(network_config.endpoints.clone())
                }
            }
        }
    }

    pub fn find_network_user_wallet(&self, network: &str) -> Option<UserWalletConfig> {
        tracing::debug!("Networks: {:?}", self.networks);
        self.networks
            .get(network)
            .and_then(|network_config| network_config.user_wallet.as_ref())
            .cloned()
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    pub fn load_from(s: &str) -> Config {
        Config::load(s.as_bytes()).unwrap()
    }

    #[test]
    fn ensure_ipfs_endpoint_is_taken_from_config() {
        let config = load_from(
            r#"
            {
                "ipfs": "foo.endpoint"
            }
        "#,
        );
        assert_eq!(config.ipfs_http_endpoint, "foo.endpoint");
    }

    #[test]
    fn ensure_wallet_config_reads() {
        let config = load_from(
            r#"
            {
                "primary-network": "foo",
                "networks": {
                    "foo": {
                        "user-wallet": {
                            "pubkey": "bar",
                            "secret": "baz",
                            "profile": "foo"
                        }
                    }
                }
            }
        "#,
        );
        let wallet_config = config
            .find_network_user_wallet("foo")
            .expect("It must be there");
        assert_eq!(wallet_config.pubkey, "bar");
        assert_eq!(wallet_config.secret, "baz");
        assert_eq!(wallet_config.profile, "foo");
    }

    #[test]
    fn ensure_wallet_config_present_does_not_drop_default_endpoints() {
        let config = load_from(
            r#"
            {
                "networks": {
                    "network.gosh.sh": {
                        "user-wallet": {
                            "pubkey": "foo",
                            "secret": "bar",
                            "profile": "foo"
                        }
                    }
                }
            }
        "#,
        );
        assert!(config.find_network_endpoints("network.gosh.sh").is_some());
        assert_eq!(
            config.find_network_endpoints("network.gosh.sh"),
            defaults::NETWORK_ENDPOINTS
                .get("network.gosh.sh")
                .map(|e| e.clone())
        );
    }

    #[test]
    fn ensure_network_endpoints_resolve_to_configured_value() {
        let config = load_from(
            r#"
            {
                "networks": {
                    "foo": {
                        "endpoints": ["endpoint 1"]
                    },
                    "bar": {
                        "endpoints": [ "endpoint 2a", "endpoint 2b" ]
                    }
                }
            }
        "#,
        );
        assert_eq!(
            config.find_network_endpoints("foo"),
            Some(vec!["endpoint 1".to_string()])
        );
        assert_eq!(
            config.find_network_endpoints("bar"),
            Some(vec!["endpoint 2a".to_string(), "endpoint 2b".to_string()])
        );
    }

    #[test]
    fn ensure_added_network_does_not_drop_defaults() {
        let config = load_from(
            r#"
            {
                "networks": {
                    "something-added": {
                        "endpoints": ["foo"]
                    }
                }
            }
        "#,
        );
        for key in defaults::NETWORK_ENDPOINTS.keys() {
            let endpoints = config.find_network_endpoints(key);
            let default_values = defaults::NETWORK_ENDPOINTS.get(key).cloned();
            assert_eq!(endpoints, default_values);
        }
    }
}
