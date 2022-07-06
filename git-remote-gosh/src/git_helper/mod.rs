#![allow(unused_variables)]
use std::env;
use std::error::Error;

use tokio::io::{self, AsyncBufReadExt, AsyncWriteExt, BufReader};
use ton_client::crypto::KeyPair;

use crate::blockchain::{
    create_client,
    get_head,
    get_repo_address,
    // set_head,
    TonClient,
};
use crate::config::Config;
use crate::git::get_refs;
use crate::ipfs::IpfsService;
use crate::logger;
use crate::util::Remote;
use git_repository;

static CAPABILITIES_LIST: [&str; 4] = ["list", "push", "fetch", "option"];

struct GitHelper {
    config: Config,
    es_client: TonClient,
    ipfs_client: IpfsService,
    remote: Remote,
    repo_addr: String,
    verbosity: u8,
    logger: log4rs::Handle,
    local_git_repository: git_repository::Repository,
}

// Note: this module implements fetch method on GitHelper
mod fetch;

// Note: this module implements push method on GitHelper
mod push;

impl GitHelper {
    fn local_repository(&mut self) -> &mut git_repository::Repository {
        return &mut self.local_git_repository;
    }

    async fn build(
        config: Config,
        url: &str,
        logger: log4rs::Handle,
    ) -> Result<Self, Box<dyn Error>> {
        let remote = Remote::new(url, &config)?;
        let es_client = create_client(&config, &remote.network)?;
        let repo_addr =
            get_repo_address(&es_client, &remote.gosh, &remote.dao, &remote.repo).await?;
        let ipfs_client = IpfsService::build(config.ipfs_http_endpoint())?;
        let local_git_dir = env::var("GIT_DIR")?;
        let local_git_repository = git_repository::open(&local_git_dir)?;
        log::info!("Opening repo at {}", local_git_dir);
        Ok(Self {
            config,
            es_client,
            ipfs_client,
            remote,
            repo_addr,
            verbosity: 0,
            logger,
            local_git_repository,
        })
    }

    async fn capabilities(&self) -> Result<Vec<String>, Box<dyn Error>> {
        let mut caps = CAPABILITIES_LIST.map(&String::from).to_vec();
        caps.push("".to_owned());
        Ok(caps)
    }

    async fn list(&self, for_push: bool) -> Result<Vec<String>, Box<dyn Error>> {
        let refs = get_refs(&self.es_client, self.repo_addr.as_str()).await?;
        let mut ref_list: Vec<String> = refs.unwrap();
        if !for_push {
            let head = get_head(&self.es_client, self.repo_addr.as_str()).await?;
            let refs_suffix = format!(" refs/heads/{}", head);
            if ref_list.iter().any(|e: &String| e.ends_with(&refs_suffix)) {
                ref_list.push(format!("@refs/heads/{} HEAD", head).to_owned());
            }
        }
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

    // async fn push(&self, _ref_arg: &str) -> Result<Vec<String>, Box<dyn Error>> {
    //     Ok(vec!["push".to_owned()])
    // }

    fn set_verbosity(&mut self, verbosity: u8) {
        // TODO: maybe connect verbosity to logging?
        self.verbosity = verbosity;
    }
}

// Implement protocol defined here:
// https://github.com/git/git/blob/master/Documentation/gitremote-helpers.txt
pub async fn run(config: Config, url: &str, logger: log4rs::Handle) -> Result<(), Box<dyn Error>> {
    let mut helper = GitHelper::build(config, url, logger).await?;
    let mut lines = BufReader::new(io::stdin()).lines();
    let mut stdout = io::stdout();
    while let Some(line) = lines.next_line().await? {
        if line.is_empty() {
            return Ok(());
        }

        let mut iter = line.split_ascii_whitespace();
        let cmd = iter.next();
        let arg1 = iter.next();
        let arg2 = iter.next();

        log::debug!("Line: {line}");
        log::debug!("> {cmd:?} {arg1:?} {arg2:?}");

        let response = match (cmd, arg1, arg2) {
            (Some("option"), Some(arg1), Some(arg2)) => helper.option(arg1, arg2).await?,
            (Some("push"), Some(ref_arg), None) => helper.push(ref_arg).await?,
            (Some("fetch"), Some(sha), Some(name)) => helper.fetch(sha, name).await?,
            (Some("capabilities"), None, None) => helper.capabilities().await?,
            (Some("list"), None, None) => helper.list(false).await?,
            (Some("list"), Some("for-push"), None) => helper.list(true).await?,
            (None, None, None) => return Ok(()),
            _ => Err("unknown command")?,
        };
        for line in response {
            log::debug!("< {line}");
            stdout.write_all(format!("{line}\n").as_bytes()).await?;
        }
    }
    Ok(())
}
