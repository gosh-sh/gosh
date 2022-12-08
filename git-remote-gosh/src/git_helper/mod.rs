#![allow(unused_variables)]

use std::collections::HashMap;
use std::env;

use std::sync::Arc;
use serde_json::Value;
use tokio::io::{self, AsyncBufReadExt, AsyncWriteExt, BufReader};
use ton_client::abi::{decode_account_data, ParamsOfDecodeAccountData};
use ton_client::net::{ParamsOfQueryCollection, query_collection};
use crate::{
    abi as gosh_abi,
    blockchain::{
        contract::GoshContract, get_head, get_repo_address, BlockchainContractAddress,
        BlockchainService, EverClient, EverscaleBuilder, Tree,
    },
    config::Config,
    git_helper::ever_client::create_client,
    ipfs::{build_ipfs, service::FileStorage},
    logger::set_log_verbosity,
    utilities::Remote,
};

pub mod ever_client;
#[cfg(test)]
mod test_utils;

static CAPABILITIES_LIST: [&str; 4] = ["list", "push", "fetch", "option"];

pub struct GitHelper<
    Blockchain = crate::blockchain::Everscale,
    FileProvider = crate::ipfs::IpfsService,
> {
    pub config: Config,
    pub file_provider: FileProvider,
    pub blockchain: Blockchain,
    pub remote: Remote,
    pub dao_addr: BlockchainContractAddress,
    pub repo_addr: BlockchainContractAddress,
    local_git_repository: git_repository::Repository,
}

#[derive(Deserialize, Debug)]
struct GetAddrDaoResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetTombstoneResult {
    #[serde(rename = "value0")]
    pub tombstone: bool,
}

// Note: this module implements fetch method on GitHelper
mod fetch;

// Note: this module implements push method on GitHelper
mod push;

mod list;

mod fmt;

impl<Blockchain, FileProvider> GitHelper<Blockchain, FileProvider>
where
    Blockchain: BlockchainService,
    FileProvider: FileStorage,
{
    pub fn local_repository(&self) -> &git_repository::Repository {
        &self.local_git_repository
    }

    pub fn local_repository_mut(&mut self) -> &mut git_repository::Repository {
        &mut self.local_git_repository
    }

    pub async fn calculate_tree_address(
        &mut self,
        tree_id: git_hash::ObjectId,
    ) -> anyhow::Result<BlockchainContractAddress> {
        let mut repo_contract = self.blockchain.repo_contract().clone();
        Tree::calculate_address(
            &Arc::clone(self.blockchain.client()),
            &mut repo_contract,
            &tree_id.to_string(),
        )
        .await
    }

    #[instrument(level = "debug", skip(blockchain))]
    async fn build(
        config: Config,
        url: &str,
        blockchain: Blockchain,
        file_provider: FileProvider,
    ) -> anyhow::Result<Self> {
        // TODO: remove duplicate logic
        let remote = Remote::new(url, &config)?;
        let ever_client = create_client(&config, &remote.network)?;

        let gosh_root_contract = GoshContract::new(&remote.gosh, gosh_abi::GOSH);

        let dao: GetAddrDaoResult = gosh_root_contract
            .run_static(
                &ever_client,
                "getAddrDao",
                Some(serde_json::json!({ "name": remote.dao })),
            )
            .await?;

        let repo_addr =
            get_repo_address(&ever_client, &remote.gosh, &remote.dao, &remote.repo).await?;
        let repo_contract = GoshContract::new(&repo_addr, gosh_abi::REPO);

        let local_git_dir = env::var("GIT_DIR")?;
        let local_git_repository = git_repository::open(&local_git_dir)?;
        tracing::info!("Opening repo at {}", local_git_dir);

        Ok(Self {
            config,
            file_provider,
            blockchain,
            remote,
            dao_addr: dao.address,
            repo_addr,
            local_git_repository,
        })
    }

    async fn capabilities(&self) -> anyhow::Result<Vec<String>> {
        let mut caps = CAPABILITIES_LIST.map(&String::from).to_vec();
        caps.push("".to_owned());
        Ok(caps)
    }

    async fn get_repo_version(&self) -> anyhow::Result<Vec<String>> {
        let version = self
            .blockchain
            .repo_contract()
            .get_version(self.blockchain.client())
            .await?;
        Ok(vec![version, "".to_string()])
    }

    async fn get_version_controller_address(&self) -> anyhow::Result<Vec<String>> {
        let system_contract_address = &self
            .blockchain
            .root_contract()
            .address;
        let system_contract_abi = &self
            .blockchain
            .root_contract()
            .abi;

        let filter = Some(serde_json::json!({
            "id": { "eq": system_contract_address }
        }));
        let query = query_collection(
            Arc::clone(self.blockchain.client()),
            ParamsOfQueryCollection {
                collection: "accounts".to_owned(),
                filter,
                result: "data".to_owned(),
                limit: Some(1),
                order: None,
            },
        )
            .await
            .map(|r| r.result)?;

        let data = query[0]["data"].as_str().unwrap_or("").to_string();
        let decode_res = decode_account_data(
            Arc::clone(self.blockchain.client()),
            ParamsOfDecodeAccountData {
                abi: system_contract_abi.to_owned(),
                data,
                ..Default::default()
            }
        ).await?;

        let version_controller_address = decode_res.data["_versionController"].as_str().unwrap_or("").to_string();
        let address = BlockchainContractAddress::new(version_controller_address.clone());
        let version_controller = GoshContract::new(address, gosh_abi::VERSION_CONTROLLER);
        let versions: serde_json::Value = version_controller.run_static(self.blockchain.client(), "getVersions", None).await?;
        // eprintln!("{versions:?}");
        // Object {"value0": Object {"0xb9ea58b67d186f6bc1d043eb2abfde3eda294a649974ef2fdad0510acb40ffad": Object {"Key": String("1.0.1"), "Value": String(
        // serde_json::Map<String, serde_json::Map<String, serde_json::Map<String, String>>>;
        let map = versions.as_object().unwrap()
            .values().next().unwrap()
            .as_object().unwrap()
            .values().next().unwrap()
            .as_object().unwrap().get("Key").unwrap().as_str().unwrap();
        let mut available_versions = vec![];
        if let Some(versions) = versions.as_object() {
            if let Some(versions) = versions.values().next() {
                if let Some(versions) = versions.as_object() {
                    for version in versions.values() {
                        if let Some(single_version) = version.as_object() {
                            if let Some(version) = single_version.get("Key") {
                                available_versions.push(version.as_str().unwrap_or("Undefined").to_string());
                            }
                        }
                    }
                }
            }
        }
        // eprintln!("Available: {available_versions:?}");
        let mut available_system_addresses = HashMap::new();
        for version in available_versions {
            let args = json!({"version": version});
            let res: GetAddrDaoResult = version_controller.run_static(self.blockchain.client(), "getSystemContractAddr", Some(args)).await?;
            let sys_address = res.address.clone();
            let system_contract = GoshContract::new(res.address, gosh_abi::GOSH);
            let args = json!({"dao": self.remote.dao, "name": self.remote.repo});
            let res: GetAddrDaoResult = system_contract.run_static(self.blockchain.client(), "getAddrRepository", Some(args)).await?;

            let repo_contract = GoshContract::new(res.address, gosh_abi::DAO);
            let res: anyhow::Result<Value> = repo_contract.run_static(self.blockchain.client(), "getVersion", None).await;
            if res.is_ok() {
                available_system_addresses.insert(version, sys_address);
            }
        }
        let mut res = available_system_addresses.keys().map(|k| k.to_owned()).collect::<Vec<String>>().join(" ");
        Ok(vec![res, "".to_string()])
    }

    async fn get_dao_tombstone(&self) -> anyhow::Result<Vec<String>> {
        let dao_address: GetAddrDaoResult = self
            .blockchain
            .root_contract()
            .run_static(self.blockchain.client(), "getAddrDao", Some(serde_json::json!({ "name": self.remote.dao })))
            .await?;

        let dao_contract = GoshContract::new(dao_address.address, gosh_abi::DAO);

        let tombstone: GetTombstoneResult = dao_contract.run_static(self.blockchain.client(), "getTombstone", None).await?;
        Ok(vec![format!("{}", tombstone.tombstone), "".to_string()])
    }

    #[instrument(level = "debug", skip(self))]
    async fn list(&self, for_push: bool) -> anyhow::Result<Vec<String>> {
        let refs = list::get_refs(&self.blockchain.client(), &self.repo_addr).await?;
        let mut ref_list: Vec<String> = refs.unwrap();
        if !for_push {
            let head = get_head(&self.blockchain.client(), &self.repo_addr).await?;
            let refs_suffix = format!(" refs/heads/{}", head);
            if ref_list.iter().any(|e: &String| e.ends_with(&refs_suffix)) {
                ref_list.push(format!("@refs/heads/{} HEAD", head));
            } else if !ref_list.is_empty() {
                let mut splitted = ref_list[0].split(' ');
                ref_list.push(format!("@{} HEAD", splitted.nth(1).unwrap()));
            }
        }
        tracing::trace!("list: {:?}", ref_list);
        ref_list.push("".to_owned());
        Ok(ref_list)
    }

    async fn option(&mut self, name: &str, value: &str) -> anyhow::Result<Vec<String>> {
        if name == "verbosity" {
            self.set_verbosity(value.parse()?);
            return Ok(vec!["ok".to_string()]);
        }
        Ok(vec!["unsupported".to_string()])
    }

    fn set_verbosity(&mut self, verbosity: u8) {
        set_log_verbosity(verbosity)
    }
}

async fn build_blockchain(
    config: &Config,
    url: &str,
) -> anyhow::Result<crate::blockchain::Everscale> {
    // concrete implementation for Ever in this case
    let mut blockchain_builder = EverscaleBuilder::default();
    let remote = Remote::new(url, &config)?;
    let ever_client = create_client(&config, &remote.network)?;
    blockchain_builder.ever_client(Arc::clone(&ever_client));

    let gosh_root_contract = GoshContract::new(&remote.gosh, gosh_abi::GOSH);
    let dao: GetAddrDaoResult = gosh_root_contract
        .run_static(
            &ever_client,
            "getAddrDao",
            Some(serde_json::json!({ "name": remote.dao })),
        )
        .await?;
    blockchain_builder.root_contract(gosh_root_contract);

    let repo_addr = get_repo_address(&ever_client, &remote.gosh, &remote.dao, &remote.repo).await?;
    let repo_contract = GoshContract::new(&repo_addr, gosh_abi::REPO);
    blockchain_builder.repo_contract(repo_contract);

    let local_git_dir = env::var("GIT_DIR")?;
    let local_git_repository = git_repository::open(&local_git_dir)?;
    tracing::info!("Opening repo at {}", local_git_dir);

    tracing::debug!("Searching for a wallet at {}", &remote.network);
    blockchain_builder.wallet_config(config.find_network_user_wallet(&remote.network));

    Ok(blockchain_builder.build()?)
}

// Implement protocol defined here:
// https://github.com/git/git/blob/master/Documentation/gitremote-helpers.txt
#[instrument(level = "debug", skip(config))]
pub async fn run(config: Config, url: &str) -> anyhow::Result<()> {
    let blockchain = build_blockchain(&config, url).await?;
    let file_provider = build_ipfs(config.ipfs_http_endpoint())?;

    let mut helper = GitHelper::build(config, url, blockchain, file_provider).await?;
    let mut lines = BufReader::new(io::stdin()).lines();
    let mut stdout = io::stdout();

    // Note: we assume git client will work correctly and will terminate this batch
    // with an empty line prior the next operation
    let mut is_batching_operation_in_progress = false;

    let mut batch_response: Vec<String> = Vec::new();
    while let Some(line) = lines.next_line().await? {
        if line.is_empty() {
            if is_batching_operation_in_progress {
                is_batching_operation_in_progress = false;
                for line in batch_response.clone() {
                    tracing::debug!("[batched] < {line}");
                    stdout.write_all(format!("{line}\n").as_bytes()).await?;
                }
                tracing::debug!("[batched] < {line}");
                stdout.write_all("\n".as_bytes()).await?;
                continue;
            } else {
                return Ok(());
            }
        }

        let mut iter = line.split_ascii_whitespace();
        let cmd = iter.next();
        let arg1 = iter.next();
        let arg2 = iter.next();
        let msg = line.clone();
        tracing::debug!("Line: {line}");
        tracing::debug!(
            "> {} {} {}",
            cmd.unwrap(),
            arg1.unwrap_or(""),
            arg2.unwrap_or("")
        );

        let response = match (cmd, arg1, arg2) {
            (Some("option"), Some(arg1), Some(arg2)) => helper.option(arg1, arg2).await?,
            (Some("push"), Some(ref_arg), None) => {
                is_batching_operation_in_progress = true;
                let push_result = helper.push(ref_arg).await?;
                batch_response.push(push_result);
                vec![]
            }
            (Some("fetch"), Some(sha), Some(name)) => {
                is_batching_operation_in_progress = true;
                helper.fetch(sha, name).await?;
                vec![]
            }
            (Some("capabilities"), None, None) => helper.capabilities().await?,
            (Some("list"), None, None) => helper.list(false).await?,
            (Some("list"), Some("for-push"), None) => helper.list(true).await?,
            (Some("repo_version"), None, None) => helper.get_repo_version().await?,
            (Some("get_dao_tombstone"), None, None) => helper.get_dao_tombstone().await?,
            (Some("get_version_controller_address"), None, None) => helper.get_version_controller_address().await?,
            (None, None, None) => return Ok(()),
            _ => Err(anyhow::anyhow!("unknown command"))?,
        };
        for line in response {
            tracing::debug!("[{msg}] < {line}");
            stdout.write_all(format!("{line}\n").as_bytes()).await?;
        }
    }
    Ok(())
}

#[cfg(test)]
pub mod tests {
    use git_repository::Repository;

    use crate::{blockchain::BlockchainService, config::tests::load_from};

    use super::*;

    pub fn setup_test_helper<B>(
        value: serde_json::Value,
        url: &str,
        repo: Repository,
        blockchain: B,
    ) -> GitHelper<B>
    where
        B: BlockchainService,
    {
        let config = load_from(&value.to_string());

        let remote = Remote::new(url, &config).unwrap();

        let gosh_root_contract = GoshContract::new(&remote.gosh, gosh_abi::GOSH);

        let dao_addr = BlockchainContractAddress::new("123");
        let repo_addr = BlockchainContractAddress::new("123");
        let repo_contract = GoshContract::new(&repo_addr, gosh_abi::REPO);
        let file_provider = build_ipfs(config.ipfs_http_endpoint()).unwrap();
        // let local_git_dir = env::var("GIT_DIR").unwrap();

        GitHelper {
            config,
            file_provider,
            blockchain,
            remote,
            dao_addr,
            repo_addr,
            local_git_repository: repo,
        }
    }
}
