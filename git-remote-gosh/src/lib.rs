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

use std::env::args;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::layer::SubscriberExt;
use opentelemetry::global::shutdown_tracer_provider;
use opentelemetry::sdk::trace::Tracer;
use opentelemetry_otlp::WithExportConfig;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::Registry;

const OPENTELEMETRY_FLAG: &str = "GOSH_OPENTELEMETRY_ENABLED";
const OPENTELEMETRY_ENDPOINT_VAR: &str = "GOSH_OPENTELEMETRY_ENDPOINT";
const LOCAL_OPENTELEMETRY_ENDPOINT: &str = "http://0.0.0.0:4317";

#[instrument(level = "debug")]
pub async fn run() -> anyhow::Result<()> {
    let logger = if let Ok(_flag) = std::env::var(OPENTELEMETRY_FLAG) {
        let endpoint = std::env::var(OPENTELEMETRY_ENDPOINT_VAR)
            .unwrap_or(LOCAL_OPENTELEMETRY_ENDPOINT.to_string());

        let tracer = opentelemetry_otlp::new_pipeline()
            .tracing()
            .with_exporter(opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint(&endpoint))
            .install_batch(opentelemetry::runtime::Tokio)?;


        let telemetry: OpenTelemetryLayer<Registry, Tracer> = tracing_opentelemetry::layer()
            .with_location(true)
            .with_threads(true)
            .with_tracer(tracer);

        tracing_subscriber::registry()
            .with(telemetry)
            .try_init()?;
        None
    } else {
        Some(logger::GitHelperLogger::init()?)
    };
    {
        let root = span!(tracing::Level::TRACE, "git-remote-helper", "work_units" = "200");
        let _enter = root.enter();
        let config = config::Config::init()?;
        let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
        log::info!("git-remote-gosh v{version}");
        eprintln!("git-remote-gosh v{version}");
        let url = args().nth(2).ok_or(anyhow::anyhow!(
            "Wrong args for git-remote call\nRequired: <name> <url>"
        ))?;
        crate::git_helper::run(config, &url, logger).await?;
    }

    shutdown_tracer_provider();
    Ok(())
}
