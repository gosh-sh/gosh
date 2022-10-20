use log4rs::{
    append::console::{ConsoleAppender, Target},
    config::{Appender, Root},
    encode::pattern::PatternEncoder,
    init_config, Config, Handle,
};
use std::error::Error;
use std::str::FromStr;
use std::{env, fmt};

const GIT_HELPER_ENV_TRACE_VERBOSITY: &str = "GOSH_TRACE";

pub struct GitHelperLogger {
    handler: Handle,
    verbosity: log::LevelFilter,
}

impl fmt::Debug for GitHelperLogger {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("GitHelperLogger")
            .field("verbosity", &self.verbosity)
            .finish_non_exhaustive()
    }
}

impl GitHelperLogger {
    pub fn init() -> anyhow::Result<Self> {
        let verbosity_level = Self::calculate_log_level(0);
        let initial_config = Self::build_config(verbosity_level)?;

        let log_handler = init_config(initial_config)?;
        Ok(Self {
            handler: log_handler,
            verbosity: verbosity_level,
        })
    }

    pub fn set_verbosity(&mut self, verbosity_level: u8) -> anyhow::Result<()> {
        let verbosity_level = Self::calculate_log_level(verbosity_level);
        let new_config = Self::build_config(verbosity_level)?;
        self.handler.set_config(new_config);
        self.verbosity = verbosity_level;
        Ok(())
    }

    fn calculate_log_level(verbosity_level: u8) -> log::LevelFilter {
        if let Ok(verbosity) = env::var(GIT_HELPER_ENV_TRACE_VERBOSITY) {
            let verbosity = u8::from_str(&verbosity).unwrap_or_default();
            if verbosity > 0 {
                return log::LevelFilter::Trace;
            }
        }

        match verbosity_level {
            0 => log::LevelFilter::Off,
            1 => log::LevelFilter::Error,
            2 => log::LevelFilter::Warn,
            3 => log::LevelFilter::Info,
            _ => log::LevelFilter::Debug,
        }
    }

    fn build_config(log_level: log::LevelFilter) -> anyhow::Result<Config> {
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
            .build(Root::builder().appender("stderr").build(log_level))?)
    }
}
