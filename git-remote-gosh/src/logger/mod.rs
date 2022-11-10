pub mod telemetry;

use cached::once_cell::sync::Lazy;
use log::LevelFilter;
use log4rs::{
    append::console::{ConsoleAppender, Target},
    config::{Appender, Root},
    encode::pattern::PatternEncoder,
    init_config, Config, Handle,
};
use std::{env, fmt, str::FromStr, sync::Arc};

const GIT_HELPER_ENV_TRACE_VERBOSITY: &str = "GOSH_TRACE";

static LOG_HANDLER: Lazy<Arc<Handle>> = Lazy::new(|| {
    // make empty log4rs handler
    let root = Root::builder().build(LevelFilter::Off);
    let config = Config::builder().build(root).unwrap();
    let handler = init_config(config).unwrap();
    Arc::new(handler)
});

pub fn global_log_handler() -> Arc<Handle> {
    LOG_HANDLER.clone()
}

pub struct GitHelperLogger {
    verbosity_level: log::LevelFilter,
}

impl fmt::Debug for GitHelperLogger {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("GitHelperLogger")
            .field("verbosity", &self.verbosity_level)
            .finish_non_exhaustive()
    }
}

impl GitHelperLogger {
    pub fn init() -> anyhow::Result<Self> {
        let verbosity_level = Self::calculate_log_level(0);
        let initial_config = Self::build_config(verbosity_level)?;

        global_log_handler().set_config(initial_config);

        Ok(Self { verbosity_level })
    }

    pub fn set_verbosity(&mut self, verbosity: u8) -> anyhow::Result<()> {
        let verbosity_level = Self::calculate_log_level(verbosity);
        let new_config = Self::build_config(verbosity_level)?;
        global_log_handler().set_config(new_config);
        self.verbosity_level = verbosity_level;
        Ok(())
    }

    fn calculate_log_level(verbosity: u8) -> log::LevelFilter {
        // TODO: fix ambiguity with arg verbosity and implicit use of env
        if let Ok(trace_verbosity) = env::var(GIT_HELPER_ENV_TRACE_VERBOSITY) {
            if u8::from_str(&trace_verbosity).unwrap_or_default() > 0 {
                return log::LevelFilter::Trace;
            }
        }

        match verbosity {
            0 => log::LevelFilter::Off,
            1 => log::LevelFilter::Error,
            2 => log::LevelFilter::Warn,
            3 => log::LevelFilter::Info,
            _ => log::LevelFilter::Debug,
        }
    }

    fn build_config(verbosity_level: log::LevelFilter) -> anyhow::Result<Config> {
        // WARNING: Do not add stdout logger!
        // because it will break gitremote-helper logic
        let stderr_appender = Appender::builder().build(
            "stderr",
            Box::new(
                ConsoleAppender::builder()
                    .encoder(Box::new(PatternEncoder::new("{l} - {m}\n")))
                    .target(Target::Stderr)
                    .build(),
            ),
        );
        Ok(Config::builder()
            .appender(stderr_appender)
            .build(Root::builder().appender("stderr").build(verbosity_level))?)
    }
}
