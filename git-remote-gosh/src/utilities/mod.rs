pub mod env;
use crate::{blockchain::BlockchainContractAddress, config::Config};

#[derive(Debug, Clone)]
pub struct Remote {
    pub scheme: String,
    pub network: String,
    pub account: String,
    pub dao: String,
    pub repo: String,
    pub gosh: BlockchainContractAddress,
}

impl Remote {
    pub fn new(url: &str, config: &Config) -> anyhow::Result<Self> {
        deconstruct_remote(url, config)
    }
}

fn deconstruct_remote(input: &str, config: &Config) -> anyhow::Result<Remote> {
    let malformed_err = format!(
        "The following URL is malformed:\n\t{input}\nThe URL must be in the following format: gosh::<network>://<system_account>/<DAO_name>/<repository_name>"
    );

    let mut splitted_url = input.split("://");
    let head = splitted_url.next().unwrap();
    let tail = splitted_url.next().unwrap_or("");

    if head.is_empty() || tail.is_empty() {
        anyhow::bail!(malformed_err);
    }

    let mut splitted_head = head.split("::");
    let mut scheme = splitted_head.next().unwrap();
    if scheme.is_empty() {
        anyhow::bail!(malformed_err);
    }

    let mut network = splitted_head.next().unwrap_or("");
    if network.is_empty() && scheme != "gosh" {
        network = scheme;
        scheme = "gosh";
    }

    let mut splitted_tail = tail.split('@');
    let mut account = splitted_tail.next().unwrap();
    let mut path = splitted_tail.next().unwrap_or("");
    if path.is_empty() {
        path = account;
        account = "default";
    }

    let mut splitted_path = path.splitn(3, '/');
    let gosh = splitted_path.next().unwrap_or("");
    let dao = splitted_path.next().unwrap_or("");
    let repo = splitted_path.next().unwrap_or("");

    if gosh.is_empty() || dao.is_empty() || repo.is_empty() {
        anyhow::bail!(malformed_err);
    }

    if network.is_empty() {
        network = config.primary_network();
    }

    Ok(Remote {
        scheme: scheme.to_string(),
        network: network.to_string(),
        account: account.to_string(),
        dao: dao.to_string(),
        repo: repo.to_string(),
        gosh: BlockchainContractAddress::new(gosh),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_url_with_network_parses_correctly() {
        // <SCHEME>::<NETWORK>://<ACCOUNT>@<GOSH>/<DAO>/<REPO>
        let remote = Remote::new("gosh::network.gosh.sh://0:078d7efa815982bb5622065e7658f89b29ce8a24bce90e5ca0906cdfd2cc6358/gosh/binary-experiments", &Config::default()).unwrap();
        assert_eq!(remote.scheme, "gosh");
        assert_eq!(remote.network, "network.gosh.sh");
        assert_eq!(remote.account, "default");
        assert_eq!(remote.dao, "gosh");
        assert_eq!(remote.repo, "binary-experiments");
        assert_eq!(
            remote.gosh,
            BlockchainContractAddress::new(
                "0:078d7efa815982bb5622065e7658f89b29ce8a24bce90e5ca0906cdfd2cc6358"
            )
        );
    }

    #[test]
    fn ensure_url_without_network_parses_correctly() {
        let remote = Remote::new("gosh://0:078d7efa815982bb5622065e7658f89b29ce8a24bce90e5ca0906cdfd2cc6358/gosh/binary-experiments", &Config::default()).unwrap();
        assert_eq!(remote.scheme, "gosh");
        assert_eq!(remote.network, "network.gosh.sh");
        assert_eq!(remote.account, "default");
        assert_eq!(remote.dao, "gosh");
        assert_eq!(remote.repo, "binary-experiments");
        assert_eq!(
            remote.gosh,
            BlockchainContractAddress::new(
                "0:078d7efa815982bb5622065e7658f89b29ce8a24bce90e5ca0906cdfd2cc6358"
            )
        );
    }
}
