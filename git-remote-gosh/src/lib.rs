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
// pub(crate) mod logger;
pub mod utilities;

use std::env::args;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::layer::SubscriberExt;
use opentelemetry::global::shutdown_tracer_provider;
use opentelemetry_otlp::WithExportConfig;

const GOSH_OPENTELEMETRY_ENDPOINT_VER: &str = "GOSH_OPENTELEMETRY_ENDPOINT";
const LOCAL_OPENTELEMTRY_ENDPOINT: &str = "http://0.0.0.0:4317";

#[instrument(level = "debug")]
pub async fn run() -> anyhow::Result<()> {
    let endpoint  = std::env::var(GOSH_OPENTELEMETRY_ENDPOINT_VER)
        .unwrap_or(LOCAL_OPENTELEMTRY_ENDPOINT.to_string());


    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(opentelemetry_otlp::new_exporter()
            .tonic()
            .with_endpoint(&endpoint))
        .install_batch(opentelemetry::runtime::Tokio)?;

    let telemetry = tracing_opentelemetry::layer()
        .with_location(true)
        .with_threads(true)
        .with_tracer(tracer);

    tracing_subscriber::registry()
        .with(telemetry)
        .try_init()?;
    {
        let root = span!(tracing::Level::TRACE, "git-remote-helper", "work_units" = "200");
        let _enter = root.enter();
        // let logger = logger::GitHelperLogger::init()?;
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
