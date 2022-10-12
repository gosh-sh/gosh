#![allow(unused_variables)]
use std::env;
use std::error::Error;

use tokio::io::{self, AsyncBufReadExt, AsyncWriteExt, BufReader};

use crate::abi as gosh_abi;
use crate::blockchain::BlockchainContractAddress;
use crate::blockchain::{
    create_client,
    get_head,
    get_repo_address,
    GoshContract,
    // set_head,
    TonClient,
    Tree,
};
use crate::config::Config;
use crate::ipfs::IpfsService;
use crate::logger::GitHelperLogger as Logger;
use crate::utilities::Remote;

#[cfg(test)]
mod test_utils;

static CAPABILITIES_LIST: [&str; 4] = ["list", "push", "fetch", "option"];

pub struct GitHelper {
    pub config: Config,
    pub es_client: TonClient,
    pub ipfs_client: IpfsService,
    pub remote: Remote,
    pub dao_addr: BlockchainContractAddress,
    pub repo_addr: BlockchainContractAddress,
    local_git_repository: git_repository::Repository,
    logger: Logger,
    gosh_root_contract: GoshContract,
    pub repo_contract: GoshContract,
}

#[derive(Deserialize, Debug)]
struct GetAddrDaoResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

// Note: this module implements fetch method on GitHelper
mod fetch;

// Note: this module implements push method on GitHelper
mod push;

mod list;

mod fmt;

impl GitHelper {
    pub fn local_repository(&mut self) -> &mut git_repository::Repository {
        &mut self.local_git_repository
    }

    pub async fn calculate_tree_address(
        &mut self,
        tree_id: git_hash::ObjectId,
    ) -> Result<BlockchainContractAddress, Box<dyn Error>> {
        Tree::calculate_address(
            &self.es_client,
            &mut self.repo_contract,
            &tree_id.to_string(),
        )
        .await
    }

    pub fn new_es_client(&self) -> Result<TonClient, Box<dyn Error>> {
        Ok(create_client(&self.config, &self.remote.network)?)
    }

    #[instrument(level = "debug")]
    async fn build(config: Config, url: &str, logger: Logger) -> Result<Self, Box<dyn Error>> {
        let remote = Remote::new(url, &config)?;
        let es_client = create_client(&config, &remote.network)?;

        let mut gosh_root_contract = GoshContract::new(&remote.gosh, gosh_abi::GOSH);

        let dao: GetAddrDaoResult = gosh_root_contract
            .run_static(
                &es_client,
                "getAddrDao",
                Some(serde_json::json!({ "name": remote.dao })),
            )
            .await?;

        let repo_addr =
            get_repo_address(&es_client, &remote.gosh, &remote.dao, &remote.repo).await?;
        let repo_contract = GoshContract::new(&repo_addr, gosh_abi::REPO);
        let ipfs_client = IpfsService::build(config.ipfs_http_endpoint())?;
        let local_git_dir = env::var("GIT_DIR")?;
        let local_git_repository = git_repository::open(&local_git_dir)?;
        log::info!("Opening repo at {}", local_git_dir);
        Ok(Self {
            config,
            es_client,
            ipfs_client,
            remote,
            dao_addr: dao.address,
            repo_addr,
            local_git_repository,
            logger,
            gosh_root_contract,
            repo_contract,
        })
    }

    async fn capabilities(&self) -> Result<Vec<String>, Box<dyn Error>> {
        let mut caps = CAPABILITIES_LIST.map(&String::from).to_vec();
        caps.push("".to_owned());
        Ok(caps)
    }

    #[instrument(level = "debug", skip(self))]
    async fn list(&self, for_push: bool) -> Result<Vec<String>, Box<dyn Error>> {
        let refs = list::get_refs(&self.es_client, &self.repo_addr).await?;
        let mut ref_list: Vec<String> = refs.unwrap();
        if !for_push {
            let head = get_head(&self.es_client, &self.repo_addr).await?;
            let refs_suffix = format!(" refs/heads/{}", head);
            if ref_list.iter().any(|e: &String| e.ends_with(&refs_suffix)) {
                ref_list.push(format!("@refs/heads/{} HEAD", head));
            } else if !ref_list.is_empty() {
                let mut splitted = ref_list[0].split(' ');
                ref_list.push(format!("@{} HEAD", splitted.nth(1).unwrap()));
            }
        }
        log::trace!("list: {:?}", ref_list);
        ref_list.push("".to_owned());
        Ok(ref_list)
    }

    async fn option(&mut self, name: &str, value: &str) -> Result<Vec<String>, Box<dyn Error>> {
        if name == "verbosity" {
            self.set_verbosity(value.parse()?);
            return Ok(vec!["ok".to_string()]);
        }
        Ok(vec!["unsupported".to_string()])
    }

    fn set_verbosity(&mut self, verbosity: u8) {
        self.logger.set_verbosity(verbosity).ok();
    }
}

// Implement protocol defined here:
// https://github.com/git/git/blob/master/Documentation/gitremote-helpers.txt
#[instrument(level = "debug")]
pub async fn run(config: Config, url: &str, logger: Logger) -> Result<(), Box<dyn Error>> {
    let mut helper = GitHelper::build(config, url, logger).await?;
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
                    log::debug!("[batched] < {line}");
                    stdout.write_all(format!("{line}\n").as_bytes()).await?;
                }
                log::debug!("[batched] < {line}");
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
        log::debug!("Line: {line}");
        log::debug!(
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
            (None, None, None) => return Ok(()),
            _ => Err("unknown command")?,
        };
        for line in response {
            log::debug!("[{msg}] < {line}");
            stdout.write_all(format!("{line}\n").as_bytes()).await?;
        }
    }
    Ok(())
}

#[cfg(test)]
pub mod tests {
    use git_repository::Repository;

    use crate::{blockchain::create_client, config::tests::load_from, logger::GitHelperLogger};

    use super::*;

    pub fn setup_test_helper(value: serde_json::Value, url: &str, repo: Repository) -> GitHelper {
        let config = load_from(&value.to_string());
        let logger = GitHelperLogger::init().unwrap();

        let remote = Remote::new(url, &config).unwrap();

        let es_client = create_client(&config, &remote.network).unwrap();

        let mut gosh_root_contract = GoshContract::new(&remote.gosh, gosh_abi::GOSH);

        let dao_addr = BlockchainContractAddress::new("123");
        let repo_addr = BlockchainContractAddress::new("123");
        let repo_contract = GoshContract::new(&repo_addr, gosh_abi::REPO);
        let ipfs_client = IpfsService::build(config.ipfs_http_endpoint()).unwrap();
        // let local_git_dir = env::var("GIT_DIR").unwrap();

        GitHelper {
            config,
            es_client,
            ipfs_client,
            remote,
            dao_addr,
            repo_addr,
            logger,
            gosh_root_contract,
            repo_contract,
            local_git_repository: repo,
        }
    }
}
