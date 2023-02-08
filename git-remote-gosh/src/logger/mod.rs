mod id_generator;
mod telemetry;
pub mod test_utils;

use cached::once_cell::sync::Lazy;
use std::{env, str::FromStr, sync::Arc};

use telemetry::OPENTELEMETRY_FILTER_LEVEL;
use tracing::metadata::LevelFilter;
use tracing_subscriber::fmt::format::FmtSpan;
use tracing_subscriber::{layer::SubscriberExt, reload, util::SubscriberInitExt, EnvFilter, Layer};

use crate::utilities::env::parse_env;

const GIT_HELPER_ENV_TRACE_VERBOSITY: &str = "GOSH_TRACE";

static GLOBAL_LOG_MANAGER: Lazy<LogService> = Lazy::new(LogService::new);

/// We have to create this weird combination because we need closure on
/// [`reload::Layer::new()`](tracing_subscriber::reload::Layer)'s [`Handle`](reload::Handle).
///
/// Due to the multi-layer tracing_subscriber registry, it has various types
/// that even grow with each layer: e.g. Layer1<...<Layer2<...<core registry>>>>
/// Also, it has very inconvenient unsized trait types inside.
struct LogService {
    pub set_console_verbosity: Arc<dyn Fn(LevelFilter) + Send + Sync + 'static>,
}

impl LogService {
    fn new() -> Self {
        // config console layer
        let (console_layer, console_layer_handle) = reload::Layer::new(
            tracing_subscriber::fmt::layer()
                .compact()
                .with_file(false)
                .with_target(false)
                .with_span_events(FmtSpan::NEW | FmtSpan::CLOSE)
                .with_thread_ids(true)
                .with_ansi(false)
                .with_writer(std::io::stderr)
                .with_filter(LevelFilter::ERROR),
        );

        let filter =
            EnvFilter::try_new("[{otel.name=gosh_reqwest}]=trace,git_remote_gosh=trace").unwrap();

        let layered_subscriber = tracing_subscriber::registry()
            .with(filter)
            .with(console_layer);

        // config otel layer
        // TODO: add #[cfg(feature=..)] support
        if telemetry::do_init_opentelemetry() {
            let level: u8 = parse_env(OPENTELEMETRY_FILTER_LEVEL).unwrap_or(5);
            let otel_layer = tracing_opentelemetry::layer()
                .with_location(true)
                .with_threads(true)
                .with_tracer(telemetry::opentelemetry_tracer())
                .with_filter(decode_verbosity(level));

            layered_subscriber.with(otel_layer).init();
        } else {
            layered_subscriber.init();
        }

        Self {
            set_console_verbosity: Arc::new(move |level_filter| {
                console_layer_handle
                    .modify(|layer| {
                        *layer.filter_mut() = level_filter;
                    })
                    .expect("can't change verbosity");
            }),
        }
    }
}

pub fn set_log_verbosity(verbosity: u8) {
    let mut verbosity_level = verbosity;
    if let Ok(trace_verbosity) = env::var(GIT_HELPER_ENV_TRACE_VERBOSITY) {
        if u8::from_str(&trace_verbosity).unwrap_or_default() > 0 {
            verbosity_level = 5;
        }
    }

    let level_filter = decode_verbosity(verbosity_level);

    (GLOBAL_LOG_MANAGER.set_console_verbosity)(level_filter);
}

fn decode_verbosity(level: u8) -> LevelFilter {
    match level {
        0 => LevelFilter::OFF,
        1 => LevelFilter::ERROR,
        2 => LevelFilter::WARN,
        3 => LevelFilter::INFO,
        4 => LevelFilter::DEBUG,
        _ => LevelFilter::TRACE,
    }
}
