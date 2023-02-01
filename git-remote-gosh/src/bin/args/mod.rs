use std::process::exit;
use clap::{Arg, Command};
use git_remote_gosh::git_helper::supported_contract_versions;

pub fn prepare_and_parse_args() -> anyhow::Result<String> {
    let matches = Command::new("git-remote-gosh")
        .about("GOSH network helper for git")
        .version(option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION")))
        .arg(Arg::new("name"))
        .arg(Arg::new("url"))
        .subcommand(
            Command::new("supported_contract_versions")
                .about("Get list of supported contract versions"))
        .get_matches();

    match matches.subcommand() {
        Some(("supported_contract_versions", _)) => {
            println!("Supported contract versions: {:?}", supported_contract_versions());
            exit(0);
        },
        _ => {
            matches.get_one::<String>("url").map(|s| s.to_string())
                .ok_or(anyhow::anyhow!(
                    "Wrong args for git-remote call\nRequired: <name> <url>"
                ))
        }
    }
}
