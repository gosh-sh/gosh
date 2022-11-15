#[allow(unused_imports)]
#[macro_use]
extern crate serde;

#[allow(unused_imports)]
#[macro_use]
extern crate serde_json;

extern crate base64;
extern crate base64_serde;

#[macro_use]
extern crate derive_builder;

extern crate git_hash;
extern crate git_object;

#[macro_use]
extern crate data_contract_macro_derive;

#[macro_use]
extern crate tracing;

extern crate diffy;
extern crate lru;

pub mod abi;
pub mod blockchain;
pub mod config;
pub(crate) mod git_helper;
pub mod ipfs;
pub(crate) mod logger;
pub mod utilities;

use logger::set_log_verbosity;
use opentelemetry::global::shutdown_tracer_provider;
use std::env::args;
use tracing::log;

#[instrument(level = "debug")]
pub async fn run() -> anyhow::Result<()> {
    set_log_verbosity(1);

    {
        let root = span!(tracing::Level::TRACE, "git-remote-helper");
        let _enter = root.enter();
        let config = config::Config::init()?;
        let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
        log::info!("git-remote-gosh v{version}");
        eprintln!("git-remote-gosh v{version}");
        let url = args().nth(2).ok_or(anyhow::anyhow!(
            "Wrong args for git-remote call\nRequired: <name> <url>"
        ))?;
        crate::git_helper::run(config, &url).await?;
    }

    shutdown_tracer_provider();
    Ok(())
}
