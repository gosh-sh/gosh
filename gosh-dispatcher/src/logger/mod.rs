use std::str::FromStr;
use tracing::level_filters::LevelFilter;
use tracing_subscriber::fmt;
use tracing_subscriber::fmt::format::FmtSpan;

const GIT_HELPER_ENV_TRACE_VERBOSITY: &str = "GOSH_TRACE";

pub fn set_up_logger() {
    if let Ok(trace_verbosity) = std::env::var(GIT_HELPER_ENV_TRACE_VERBOSITY) {
        if u8::from_str(&trace_verbosity).unwrap_or_default() > 0 {
            let builder = fmt()
                .with_file(false)
                .with_target(false)
                .with_ansi(false)
                .with_writer(std::io::stderr)
                .with_max_level(LevelFilter::TRACE)
                .with_span_events(FmtSpan::NEW | FmtSpan::CLOSE);
            let my_subscriber = builder.finish();

            tracing::subscriber::set_global_default(my_subscriber)
                .expect("setting tracing default failed");
        }
    }
}
