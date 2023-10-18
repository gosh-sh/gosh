use clap::{Arg, Command};

use crate::dispatcher::Dispatcher;
use crate::ini::{get_ini_path, load_remote_versions_from_ini};
use crate::logger::set_up_logger;

mod common;
mod dispatcher;
mod gosh_remote;
mod ini;
mod logger;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    set_up_logger();
    let matches = Command::new("gosh-dispatcher")
        .about("Dispatcher of git-remote-gosh binaries")
        .arg(Arg::new("name"))
        .arg(Arg::new("url"))
        .arg(
            Arg::new("version")
                .long("version")
                .action(clap::ArgAction::SetTrue),
        )
        .subcommand(Command::new("dispatcher_ini").about(
            "Get path to the current dispatcher ini file and list of supported remote versions",
        ))
        .get_matches();

    let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
    eprintln!("GOSH dispatcher v{version}");

    match matches.subcommand() {
        Some(("dispatcher_ini", _)) => {
            let ini_path = get_ini_path()?;
            println!("GOSH dispatcher ini path: {}", ini_path);
            let possible_versions = load_remote_versions_from_ini()?;
            println!("Remote versions:\n{:#?}", possible_versions);
        }
        _ => {
            if matches.get_flag("version") {
                return Ok(());
            }
            let mut dispatcher = Dispatcher::default();
            dispatcher.start().await?;
        }
    }
    Ok(())
}
