use lazy_static::*;
use std::collections::HashMap;
use std::vec::Vec;

pub const PRIMARY_NETWORK: &str = "network.gosh.sh";
pub const IPFS_HTTP_ENDPOINT: &str = "https://ipfs.network.gosh.sh";

#[cfg(target_family = "unix")]
pub const CONFIG_LOCATION: &str = "~/.gosh/config.json";

#[cfg(target_family = "windows")]
pub const CONFIG_LOCATION: &str = "$HOME/.gosh/config.json";

lazy_static! {
    pub static ref NETWORK_ENDPOINTS: HashMap<String, Vec<String>> = HashMap::from([
        (
            "network.gosh.sh".to_string(),
            vec!["https://network.gosh.sh".to_string()]
        ),
        (
            "net.ton.dev".to_string(),
            vec![
                "https://eri01.net.everos.dev".to_string(),
                "https://rbx01.net.everos.dev".to_string(),
                "https://gra01.net.everos.dev".to_string(),
            ]
        ),
        (
            "vps23.ton.dev".to_string(),
            vec!["vps23.ton.dev".to_string()]
        ),
        (
            "localhost".to_string(),
            vec![
                "http://127.0.0.1/".to_string(),
                "http://localhost/".to_string(),
                "http://0.0.0.0/".to_string(),
            ]
        )
    ]);
}
