extern crate shellexpand;
use std::{
    collections::HashMap,
    env,
    error::Error,
    fmt,
    io::{BufReader, Read},
    path::Path,
};

mod defaults;

#[derive(Clone, serde::Deserialize, serde::Serialize)]
pub struct UserWalletConfig {
    pub address: String,
    pub pubkey: String,
    pub secret: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct NetworkConfig {
    #[serde(rename = "user-wallet")]
    user_wallet: Option<UserWalletConfig>,
    // Note corresponding test:
    // ensure_added_network_does_not_drop_defaults
    endpoints: Vec<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
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
            .field("address", &self.address)
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
        return &self.ipfs_http_endpoint;
    }

    pub fn primary_network(&self) -> &str {
        return &self.primary_network;
    }

    fn load<TReader: Read + Sized>(config_reader: TReader) -> Result<Self, Box<dyn Error>> {
        let config: Config = serde_json::from_reader(config_reader)?;
        return Ok(config);
    }

    pub fn init() -> Result<Self, Box<dyn Error>> {
        let config_path =
            env::var("GOSH_CONFIG_PATH").unwrap_or(defaults::CONFIG_LOCATION.to_string());
        let config_path = shellexpand::tilde(&config_path).into_owned();
        let config_path = Path::new(&config_path);
        if !config_path.exists() {
            return Ok(Self::default());
        }
        let config_file = std::fs::File::open(config_path)?;
        let config_reader = BufReader::new(config_file);
        return Self::load(config_reader);
    }

    #[instrument(level = "debug")]
    pub fn find_network_endpoints(&self, network: &str) -> Option<Vec<String>> {
        return self
            .networks
            .get(network)
            .map(|network_config| network_config.endpoints.clone());
    }

    pub fn find_network_user_wallet(&self, network: &str) -> Option<UserWalletConfig> {
        return self
            .networks
            .get(network)
            .map(|network_config| network_config.user_wallet.as_ref())
            .flatten()
            .cloned();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn load_from(s: &str) -> Config {
        return Config::load(s.as_bytes()).unwrap();
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
    #[ignore] // Bug: TODO: fix
    fn ensure_added_network_does_not_drop_defaults() {
        let config = load_from(
            r#"
            {
                "networks": {
                    "something-added": ["foo"]
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
