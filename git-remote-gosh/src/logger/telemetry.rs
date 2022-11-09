use opentelemetry::sdk::Resource;
use opentelemetry::KeyValue;
use opentelemetry_otlp::WithExportConfig;
use std::str::FromStr;

use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::EnvFilter;

const OPENTELEMETRY_FLAG: &str = "GOSH_OPENTELEMETRY_ENABLED";
const OPENTELEMETRY_ENDPOINT_VAR: &str = "GOSH_OPENTELEMETRY_ENDPOINT";
const LOCAL_OPENTELEMETRY_ENDPOINT: &str = "http://0.0.0.0:4317";
const OPENTELEMETRY_SERVICE_NAME: &str = "git-remote-helper";
const OPENTELEMETRY_FILTER_LEVEL: &str = "GOSH_OPENTELEMETRY_FILTER_LEVEL";

pub fn do_init_opentelemetry() -> bool {
    std::env::var(OPENTELEMETRY_FLAG).is_ok()
}

fn get_log_level() -> String {
    let level = match std::env::var(OPENTELEMETRY_FILTER_LEVEL) {
        Ok(level) => u8::from_str(&level).unwrap_or(5),
        _ => 5,
    };
    match level {
        0 => "OFF",
        1 => "ERROR",
        2 => "WARN",
        3 => "INFO",
        4 => "DEBUG",
        _ => "TRACE",
    }
    .to_string()
}

pub fn init_opentelemetry_tracing() -> anyhow::Result<()> {
    let endpoint = std::env::var(OPENTELEMETRY_ENDPOINT_VAR)
        .unwrap_or(LOCAL_OPENTELEMETRY_ENDPOINT.to_string());

    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint(&endpoint),
        )
        .with_trace_config(
            opentelemetry::sdk::trace::config().with_resource(Resource::new(vec![KeyValue::new(
                opentelemetry_semantic_conventions::resource::SERVICE_NAME,
                OPENTELEMETRY_SERVICE_NAME,
            )])),
        )
        .install_batch(opentelemetry::runtime::Tokio)?;

    let telemetry = tracing_opentelemetry::layer()
        .with_location(true)
        .with_threads(true)
        .with_tracer(tracer);

    let env_filter = EnvFilter::new(get_log_level());

    tracing_subscriber::registry()
        .with(env_filter)
        .with(telemetry)
        .try_init()?;

    Ok(())
}
