use log::LevelFilter;
use log4rs::{
    append::{
        console::{ConsoleAppender, Target},
        file::FileAppender
    },
    config::{Appender, Logger, Root},
    encode::pattern::PatternEncoder,
    init_config, Config, Handle,
};
use std::error::Error;

pub fn init() -> Result<Handle, Box<dyn Error>> {
    let stderr_appender = Appender::builder().build(
        "stderr",
        Box::new(
            ConsoleAppender::builder()
                .encoder(Box::new(PatternEncoder::new("{l} - {m}\n")))
                .target(Target::Stderr)
                .build(),
        ),
    );
    // let stderr_logger = Logger::builder().appender("stderr").build("app::stderr", LevelFilter::Debug);

    let logfile_name = "logfile";
    // TODO: use system specific logs e.g. /var/log
    let filename = "log/output.log";

    let logfile_appender = Appender::builder().build(
        logfile_name,
        Box::new(
            FileAppender::builder()
                .encoder(Box::new(PatternEncoder::new("{l} - {m}\n")))
                .build(filename)?,
        ),
    );
    let logfile_logger = Logger::builder().appender(logfile_name).build("app::logfile", LevelFilter::Trace);

    // WARNING: do not add stdout logger because it will break gitremote-helper logic
    let config = Config::builder()
        .appender(stderr_appender)
        .appender(logfile_appender)
        .logger(logfile_logger)
        .build(
            Root::builder()
                // .appender(logfile_name)
                .appender("stderr")
                .build(LevelFilter::Debug),
        )?;

    let logger_handler = init_config(config)?;

    Ok(logger_handler)
}
