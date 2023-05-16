#![allow(unused_variables)]

use std::env;

use serde_json::Value;
use std::sync::Arc;
use tokio::io::{self, AsyncBufReadExt, AsyncWriteExt, BufReader};

use crate::cache::proxy::CacheProxy;
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
use crate::blockchain::get_commit_address;

pub mod ever_client;
#[cfg(test)]
mod test_utils;

static CAPABILITIES_LIST: [&str; 4] = ["list", "push", "fetch", "option"];
static DISPATCHER_ENDL: &str = "endl";

#[derive(Clone)]
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
    local_repository: Arc<git_repository::Repository>,
    cache: Arc<CacheProxy>,
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

pub fn supported_contract_version() -> anyhow::Result<String> {
    Ok(env!("BUILD_SUPPORTED_VERSION").to_string())
}

impl<Blockchain, FileProvider> GitHelper<Blockchain, FileProvider>
where
    Blockchain: BlockchainService,
    FileProvider: FileStorage,
{
    pub fn local_repository(&self) -> &git_repository::Repository {
        &self.local_repository
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

    #[instrument(level = "info", skip_all)]
    async fn build(
        config: Config,
        url: &str,
        blockchain: Blockchain,
        file_provider: FileProvider,
    ) -> anyhow::Result<Self> {
        tracing::trace!("build: config={config:?}, url={url}");
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
        let local_repository = Arc::new(git_repository::open(&local_git_dir)?);
        tracing::info!("Opening repo at {}", local_git_dir);
        let mut cache = CacheProxy::new();
        let cache_str = config.use_cache();
        tracing::debug!("cache address: {:?}", cache_str);
        if let Some(cache_address) = cache_str {
            if cache_address.starts_with("memcache://") {
                let namespace = ":".to_owned() + &String::from(&repo_addr);
                let memcache =
                    crate::cache::memcached_impl::Memcached::new(&cache_address, &namespace)?;
                cache.set_memcache(memcache);
                tracing::debug!("using memcache service. namespace: {}", namespace);
            } else {
                anyhow::bail!("Unknown caching address specified: {}", cache_address);
            }
        }

        Ok(Self {
            config,
            file_provider,
            blockchain,
            remote,
            dao_addr: dao.address,
            repo_addr,
            local_repository,
            cache: Arc::new(cache),
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

    async fn get_repo_versions(&self, repo_addresses: bool) -> anyhow::Result<Vec<String>> {
        let cur_version = self
            .blockchain
            .repo_contract()
            .get_version(self.blockchain.client())
            .await?;

        let version_controller_address: GetAddrDaoResult = self
            .blockchain
            .root_contract()
            .run_static(self.blockchain.client(), "getCreator", None)
            .await?;

        let version_controller = GoshContract::new(
            version_controller_address.address,
            gosh_abi::VERSION_CONTROLLER,
        );

        let versions: serde_json::Value = version_controller
            .run_static(self.blockchain.client(), "getVersionAddrMap", None)
            .await?;

        let versions: Vec<(String, String)> = versions
            .as_object()
            .unwrap()
            .values()
            .next()
            .unwrap()
            .as_array()
            .unwrap()
            .iter()
            .map(|ver| {
                let map = ver.as_object().unwrap();
                (
                    map.get("Key").unwrap().as_str().unwrap().to_string(),
                    map.get("Value").unwrap().as_str().unwrap().to_string(),
                )
            })
            .collect();

        tracing::trace!("Available repo versions: {versions:?}");
        let mut available_versions = vec![];
        for version in versions {
            let address = BlockchainContractAddress::new(version.1.clone());
            let system_contract = GoshContract::new(address, gosh_abi::GOSH);
            let args = json!({"dao": self.remote.dao, "name": self.remote.repo});
            let repo_addr: GetAddrDaoResult = system_contract
                .run_static(self.blockchain.client(), "getAddrRepository", Some(args))
                .await?;
            let repo_contract = GoshContract::new(repo_addr.address.clone(), gosh_abi::REPO);
            let res: anyhow::Result<Value> = repo_contract
                .run_static(self.blockchain.client(), "getVersion", None)
                .await;
            if res.is_err() {
                continue;
            }
            if repo_addresses {
                available_versions.push(format!("{} {}", version.0, String::from(repo_addr.address)));
            } else {
                available_versions.push(format!("{} {}", version.0, version.1));
            }
        }
        available_versions.push("".to_string());
        Ok(available_versions)
    }

    async fn get_dao_tombstone(&self) -> anyhow::Result<Vec<String>> {
        let dao_address: GetAddrDaoResult = self
            .blockchain
            .root_contract()
            .run_static(
                self.blockchain.client(),
                "getAddrDao",
                Some(serde_json::json!({ "name": self.remote.dao })),
            )
            .await?;

        let dao_contract = GoshContract::new(dao_address.address, gosh_abi::DAO);

        let tombstone: GetTombstoneResult = dao_contract
            .run_static(self.blockchain.client(), "getTombstone", None)
            .await?;
        Ok(vec![format!("{}", tombstone.tombstone), "".to_string()])
    }

    #[instrument(level = "trace", skip_all)]
    async fn list(&self, for_push: bool) -> anyhow::Result<Vec<String>> {
        tracing::debug!("list: for_push={for_push}");
        let refs = list::get_refs(&self.blockchain.client(), &self.repo_addr).await?;
        let mut ref_list: Vec<String> = if refs.is_none() {
            Vec::new()
        } else {
            refs.unwrap()
        };
        if !for_push {
            let tags = list::get_tags(&self.blockchain.client(), &self.repo_addr).await?;
            match tags {
                None => (),
                Some(mut list) => ref_list.append(&mut list),
            };
            let head = get_head(&self.blockchain.client(), &self.repo_addr).await?;
            let refs_suffix = format!(" refs/heads/{}", head);
            if ref_list.iter().any(|e: &String| e.ends_with(&refs_suffix)) {
                ref_list.push(format!("@refs/heads/{} HEAD", head));
            } else if !ref_list.is_empty() {
                let mut splitted = ref_list[0].split(' ');
                ref_list.push(format!("@{} HEAD", splitted.nth(1).unwrap()));
            }
        }
        ref_list.push("".to_owned());
        tracing::debug!("list: {:?}", ref_list);
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

    pub async fn find_commit(&self, commit_id: &String) -> anyhow::Result<(String, BlockchainContractAddress)> {
        tracing::trace!("Find commit {commit_id}");
        let mut repo_versions = self.get_repo_versions(true).await?;
        repo_versions.pop();
        tracing::trace!("Repo versions {repo_versions:?}");
        for version in repo_versions {
            tracing::trace!("Check {version}");
            let mut iter = version.split(' ');
            let version: &str = iter.next().unwrap();
            let repo_address: &str = iter.next().unwrap();
            let repo_address = BlockchainContractAddress::new(repo_address.to_string());
            let mut repo_contract = GoshContract::new(&repo_address, gosh_abi::REPO);
            let commit_address = get_commit_address(
                self.blockchain.client(),
                &mut repo_contract,
                commit_id,
            ).await?;
            tracing::trace!("commit_address (sha={commit_id}) {commit_address}");
            let commit_contract = GoshContract::new(&commit_address, gosh_abi::COMMIT);
            let res: anyhow::Result<Value> = commit_contract
                .run_static(self.blockchain.client(), "getVersion", None)
                .await;
            if res.is_err() {
                continue;
            }
            return Ok((version.to_string(), commit_address));
        }
        anyhow::bail!("Failed to find commit with id {commit_id} in all repo versions.")
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

    tracing::trace!("Searching for a wallet at {}", &remote.network);
    blockchain_builder.wallet_config(config.find_network_user_wallet(&remote.network));

    Ok(blockchain_builder.build()?)
}

// Implement protocol defined here:
// https://github.com/git/git/blob/master/Documentation/gitremote-helpers.txt
#[instrument(level = "info", skip_all)]
pub async fn run(config: Config, url: &str, dispatcher_call: bool) -> anyhow::Result<()> {
    tracing::trace!("run: url={url}");
    let blockchain = build_blockchain(&config, url).await?;
    let file_provider = build_ipfs(config.ipfs_http_endpoint())?;

    let mut helper = GitHelper::build(config, url, blockchain, file_provider).await?;
    let mut lines = BufReader::new(io::stdin()).lines();
    let mut stdout = io::stdout();

    // Note: we assume git client will work correctly and will terminate this batch
    // with an empty line prior the next operation
    let mut is_batching_push_in_progress = false;
    let mut is_batching_fetch_in_progress = false;

    let mut batch_response: Vec<String> = Vec::new();
    while let Some(line) = lines.next_line().await? {
        if line.is_empty() {
            if is_batching_push_in_progress {
                is_batching_push_in_progress = false;
                for line in batch_response.clone() {
                    tracing::debug!("[batched] < {line}");
                    stdout.write_all(format!("{line}\n").as_bytes()).await?;
                }
                tracing::debug!("[batched] < {line}");
                stdout.write_all("\n".as_bytes()).await?;
                if dispatcher_call {
                    stdout
                        .write_all(format!("{DISPATCHER_ENDL}\n").as_bytes())
                        .await?;
                }
                continue;
            } else if is_batching_fetch_in_progress {
                is_batching_fetch_in_progress = false;
                tracing::debug!("[batched] < {line}");
                stdout.write_all("\n".as_bytes()).await?;
                if dispatcher_call {
                    stdout
                        .write_all(format!("{DISPATCHER_ENDL}\n").as_bytes())
                        .await?;
                }
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
                is_batching_push_in_progress = true;
                let push_result = helper.push(ref_arg).await?;
                batch_response.push(push_result);
                vec![]
            }
            (Some("fetch"), Some(sha), Some(name)) => {
                is_batching_fetch_in_progress = true;
                let fetch_result = helper.fetch(sha, name).await;
                if let Err(e) = fetch_result {
                    let error_str = e.to_string();
                    if error_str.contains("Was trying to call getCommit") {
                        tracing::trace!("Fetch error: {error_str}");
                        let sha = if error_str.contains("SHA=") {
                            error_str
                                .trim_start_matches(|c| c != '\"')
                                .trim_end_matches(|c| c != '\"')
                                .replace(['\"'],"")
                        } else {
                            sha.to_owned()
                        };
                        // let previous: Value = helper
                        //     .blockchain
                        //     .repo_contract()
                        //     .read_state(helper.blockchain.client(), "getPrevious", None)
                        //     .await?;
                        let version = helper.find_commit(&sha).await?.0;
                        let out_str = format!("dispatcher {version} fetch {sha} {name}");
                        stdout.write_all(format!("{out_str}\n").as_bytes()).await?;
                        return Ok(());
                    } else {
                        return Err(e);
                    }
                }
                if dispatcher_call {
                    stdout
                        .write_all(format!("{DISPATCHER_ENDL}\n").as_bytes())
                        .await?;
                }

                continue;
            }
            (Some("capabilities"), None, None) => helper.capabilities().await?,
            (Some("list"), None, None) => helper.list(false).await?,
            (Some("list"), Some("for-push"), None) => helper.list(true).await?,
            (Some("gosh_repo_version"), None, None) => helper.get_repo_version().await?,
            (Some("gosh_get_dao_tombstone"), None, None) => helper.get_dao_tombstone().await?,
            (Some("gosh_get_all_repo_versions"), None, None) => helper.get_repo_versions(false).await?,
            (Some("gosh_supported_contract_version"), None, None) => {
                let mut versions = vec![supported_contract_version()?];
                versions.push("".to_string());
                versions
            }
            (None, None, None) => return Ok(()),
            _ => Err(anyhow::anyhow!("unknown command"))?,
        };
        for line in response {
            tracing::debug!("[{msg}] < {line}");
            stdout.write_all(format!("{line}\n").as_bytes()).await?;
        }
        if dispatcher_call {
            stdout
                .write_all(format!("{DISPATCHER_ENDL}\n").as_bytes())
                .await?;
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
        let local_repository = Arc::new(repo);

        let cache = Arc::new(CacheProxy::new());

        GitHelper {
            config,
            file_provider,
            blockchain,
            remote,
            dao_addr,
            repo_addr,
            local_repository,
            cache,
        }
    }
}
