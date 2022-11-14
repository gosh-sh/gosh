use cached::once_cell::sync::Lazy;
use opentelemetry::sdk::Resource;
use opentelemetry::KeyValue;

use std::sync::Arc;
use tracing::metadata::LevelFilter;



use tracing_subscriber::reload::Handle;
use tracing_subscriber::{prelude::*, reload, Registry};

use crate::logger::id_generator::FixedIdGenerator;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

const OPENTELEMETRY_FLAG: &str = "GOSH_OPENTELEMETRY";
const OPENTELEMETRY_SERVICE_NAME: &str = "git-remote-helper";
const OPENTELEMETRY_FILTER_LEVEL: &str = "GOSH_OPENTELEMETRY_FILTER_LEVEL";

static TRACING_HANDLE: Lazy<Arc<Handle<LevelFilter, Registry>>> =
    Lazy::new(|| Arc::new(init_tracing()));

pub fn set_log_verbosity(verbosity_level: u8) {
    TRACING_HANDLE
        .modify(|filter| {
            *filter = match verbosity_level {
                0 => LevelFilter::OFF,
                1 => LevelFilter::ERROR,
                2 => LevelFilter::WARN,
                3 => LevelFilter::INFO,
                4 => LevelFilter::DEBUG,
                _ => LevelFilter::TRACE,
            };
        })
        .expect("unable to set verbosity level");
}

pub fn do_init_opentelemetry() -> bool {
    std::env::var(OPENTELEMETRY_FLAG).is_ok()
}

// fn get_log_level() -> String {
//     let level = match std::env::var(OPENTELEMETRY_FILTER_LEVEL) {
//         Ok(level) => u8::from_str(&level).unwrap_or(5),
//         _ => 5,
//     };
//     match level {
//         0 => "OFF",
//         1 => "ERROR",
//         2 => "WARN",
//         3 => "INFO",
//         4 => "DEBUG",
//         _ => "TRACE",
//     }
//     .to_string()
// }

fn init_tracing() -> Handle<LevelFilter, Registry> {
    // NOTE: for some reason it should always be initialized with TRACE level
    let (reloadable_filter, reload_handle) = reload::Layer::new(LevelFilter::TRACE);

    let fmt_layer = tracing_subscriber::fmt::layer()
        .compact()
        .with_thread_ids(true)
        .with_writer(std::io::stderr);

    let layered_sub = tracing_subscriber::registry()
        .with(reloadable_filter)
        .with(fmt_layer);

    // TODO: add #[cfg(feature=..)] support
    if do_init_opentelemetry() {
        let otel_tracer = opentelemetry_otlp::new_pipeline()
            .tracing()
            .with_exporter(opentelemetry_otlp::new_exporter().tonic())
            .with_trace_config(
                opentelemetry::sdk::trace::config()
                    .with_resource(Resource::new(vec![KeyValue::new(
                        opentelemetry_semantic_conventions::resource::SERVICE_NAME,
                        OPENTELEMETRY_SERVICE_NAME,
                    )]))
                    .with_id_generator(FixedIdGenerator::new()),
            )
            .install_batch(opentelemetry::runtime::Tokio)
            .expect("can't install open telemetry");

        let otel_layer = tracing_opentelemetry::layer()
            .with_location(true)
            .with_threads(true)
            .with_tracer(otel_tracer);

        layered_sub.with(otel_layer).init();
    } else {
        layered_sub.init();
    }

    reload_handle
}
