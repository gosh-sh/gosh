#![allow(unused_variables)]
use std::env;

use tokio::io::{self, AsyncBufReadExt, AsyncWriteExt, BufReader};

use crate::abi as gosh_abi;
use crate::blockchain::user_wallet::user_wallet_config;
use crate::blockchain::{
    create_client, get_head, get_repo_address, BlockchainService, GoshContract, TonClient, Tree,
};
use crate::blockchain::{BlockchainContractAddress, EverscaleBuilder};
use crate::config::Config;
use crate::ipfs::IpfsService;
use crate::logger::GitHelperLogger as Logger;
use crate::utilities::Remote;

#[cfg(test)]
mod test_utils;

static CAPABILITIES_LIST: [&str; 4] = ["list", "push", "fetch", "option"];

pub struct GitHelper<Blockchain = crate::blockchain::Everscale> {
    pub config: Config,
    #[deprecated(note = "use self.blockchain.client()")]
    pub ever_client: TonClient,
    pub ipfs_client: IpfsService,
    pub blockchain: Blockchain,
    pub remote: Remote,
    pub dao_addr: BlockchainContractAddress,
    pub repo_addr: BlockchainContractAddress,
    local_git_repository: git_repository::Repository,
    logger: Logger,
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

impl<Blockchain> GitHelper<Blockchain>
where
    Blockchain: BlockchainService,
{
    pub fn local_repository(&mut self) -> &mut git_repository::Repository {
        &mut self.local_git_repository
    }

    pub async fn calculate_tree_address(
        &mut self,
        tree_id: git_hash::ObjectId,
    ) -> anyhow::Result<BlockchainContractAddress> {
        let mut repo_contract = self.blockchain.repo_contract().clone();
        Tree::calculate_address(
            &self.blockchain.client().clone(),
            &mut repo_contract,
            &tree_id.to_string(),
        )
        .await
    }

    pub fn new_es_client(&self) -> anyhow::Result<TonClient> {
        Ok(create_client(&self.config, &self.remote.network)?)
    }

    #[instrument(level = "debug", skip(blockchain))]
    async fn build(
        config: Config,
        url: &str,
        logger: Logger,
        blockchain: Blockchain,
        ipfs: IpfsService,
    ) -> anyhow::Result<Self> {
        // TODO: remove duplicate logic
        let remote = Remote::new(url, &config)?;
        let ever_client = create_client(&config, &remote.network)?;

        let mut gosh_root_contract = GoshContract::new(&remote.gosh, gosh_abi::GOSH);

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
        log::info!("Opening repo at {}", local_git_dir);

        Ok(Self {
            config,
            ever_client,
            ipfs_client: ipfs,
            blockchain,
            remote,
            dao_addr: dao.address,
            repo_addr,
            local_git_repository,
            logger,
        })
    }

    async fn capabilities(&self) -> anyhow::Result<Vec<String>> {
        let mut caps = CAPABILITIES_LIST.map(&String::from).to_vec();
        caps.push("".to_owned());
        Ok(caps)
    }

    #[instrument(level = "debug", skip(self))]
    async fn list(&self, for_push: bool) -> anyhow::Result<Vec<String>> {
        let refs = list::get_refs(&self.ever_client, &self.repo_addr).await?;
        let mut ref_list: Vec<String> = refs.unwrap();
        if !for_push {
            let head = get_head(&self.ever_client, &self.repo_addr).await?;
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

    async fn option(&mut self, name: &str, value: &str) -> anyhow::Result<Vec<String>> {
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
pub async fn run(config: Config, url: &str, logger: Logger) -> anyhow::Result<()> {
    // concrete implementation for Ever in this case
    let mut blockchain_builder = EverscaleBuilder::default();
    let remote = Remote::new(url, &config)?;
    let ever_client = create_client(&config, &remote.network)?;
    blockchain_builder.ever_client(ever_client.clone());
    let mut gosh_root_contract = GoshContract::new(&remote.gosh, gosh_abi::GOSH);

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

    let ipfs = IpfsService::build(config.ipfs_http_endpoint())?;
    let local_git_dir = env::var("GIT_DIR")?;
    let local_git_repository = git_repository::open(&local_git_dir)?;
    log::info!("Opening repo at {}", local_git_dir);

    blockchain_builder.wallet_config(user_wallet_config(&config, &remote.network));

    let blockchain = blockchain_builder.build()?;

    let mut helper = GitHelper::build(config, url, logger, blockchain, ipfs).await?;
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
            _ => Err(anyhow::anyhow!("unknown command"))?,
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

    use crate::{
        blockchain::{create_client, BlockchainService},
        config::tests::load_from,
        logger::GitHelperLogger,
    };

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
        let logger = GitHelperLogger::init().unwrap();

        let remote = Remote::new(url, &config).unwrap();

        let es_client = create_client(&config, &remote.network).unwrap();

        let gosh_root_contract = GoshContract::new(&remote.gosh, gosh_abi::GOSH);

        let dao_addr = BlockchainContractAddress::new("123");
        let repo_addr = BlockchainContractAddress::new("123");
        let repo_contract = GoshContract::new(&repo_addr, gosh_abi::REPO);
        let ipfs_client = IpfsService::build(config.ipfs_http_endpoint()).unwrap();
        // let local_git_dir = env::var("GIT_DIR").unwrap();

        GitHelper {
            config,
            ever_client: es_client,
            ipfs_client,
            blockchain,
            remote,
            dao_addr,
            repo_addr,
            logger,
            local_git_repository: repo,
        }
    }
}
