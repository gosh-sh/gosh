use cached::once_cell::sync::Lazy;
use std::{collections::HashMap, vec::Vec};

pub const PRIMARY_NETWORK: &str = "network.gosh.sh";
pub const IPFS_HTTP_ENDPOINT: &str = "https://ipfs.network.gosh.sh";

#[cfg(target_family = "unix")]
pub const CONFIG_LOCATION: &str = "~/.gosh/config.json";

#[cfg(target_family = "windows")]
pub const CONFIG_LOCATION: &str = "~\\.gosh\\config.json";

pub static NETWORK_ENDPOINTS: Lazy<HashMap<String, Vec<String>>> = Lazy::new(|| {
    HashMap::from([
        (
            "network.gosh.sh".to_owned(),
            vec![
                "https://bhs01.network.gosh.sh".to_owned(),
                "https://eri01.network.gosh.sh".to_owned(),
                "https://gra01.network.gosh.sh".to_owned(),
            ],
        ),
        (
            "net.ton.dev".to_owned(),
            vec![
                "https://eri01.net.everos.dev".to_owned(),
                "https://rbx01.net.everos.dev".to_owned(),
                "https://gra01.net.everos.dev".to_owned(),
            ],
        ),
        ("vps23.ton.dev".to_owned(), vec!["vps23.ton.dev".to_owned()]),
        (
            "localhost".to_owned(),
            vec![
                "http://127.0.0.1/".to_owned(),
                "http://localhost/".to_owned(),
                "http://0.0.0.0/".to_owned(),
            ],
        ),
    ])
});
