use clap::{Arg, Command};
use git_remote_gosh::anyhow;
use git_remote_gosh::git_helper::supported_contract_version;
use git_remote_gosh::logger::set_log_verbosity;
use opentelemetry::global::shutdown_tracer_provider;
use std::process::ExitCode;
use std::time::Duration;
use tokio::time::sleep;

fn shutdown(result: anyhow::Result<()>) -> ExitCode {
    let exit_code = match result {
        Ok(_) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e}");
            tracing::debug!("{e:?}");
            ExitCode::FAILURE
        }
    };
    shutdown_tracer_provider();
    return exit_code;
}

#[tokio::main(flavor = "multi_thread", worker_threads = 20)]
async fn main() -> ExitCode {
    set_log_verbosity(1);
    let mut result = Ok(());
    let mut ctrl_c = false;
    tokio::select! {
        res = main_internal() => { result = res; },
        _ = tokio::signal::ctrl_c() => {
            ctrl_c = true;
        },
    };
    if ctrl_c {
        sleep(Duration::from_secs(1)).await;
    }
    shutdown(result)
}

async fn main_internal() -> anyhow::Result<()> {
    let root = tracing::span!(tracing::Level::INFO, "git-remote-helper");
    let _enter = root.enter();
    let config = git_remote_gosh::config::Config::init()?;
    let supported_contract_version = supported_contract_version();
    let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
    tracing::info!(
        "git-remote-gosh v{version} (GOSH v{})",
        supported_contract_version
    );
    eprintln!(
        "git-remote-gosh v{version} (GOSH v{})",
        supported_contract_version
    );
    let matches = Command::new("git-remote-gosh")
        .about("GOSH network helper for git")
        .arg(Arg::new("name"))
        .arg(Arg::new("url"))
        .arg(
            Arg::new("dispatcher")
                .long("dispatcher")
                .action(clap::ArgAction::SetTrue)
                .hide(true),
        )
        .arg(
            Arg::new("version")
                .long("version")
                .action(clap::ArgAction::SetTrue),
        )
        .subcommand(
            Command::new("supported_contract_version")
                .about("Get list of supported contract version"),
        )
        .get_matches();

    match matches.subcommand() {
        Some(("supported_contract_version", _)) => {
            println!(
                "Supported contract version: \"{}\"",
                supported_contract_version
            );
        }
        _ => {
            if matches.get_flag("version") {
                return Ok(());
            }
            let url = matches
                .get_one::<String>("url")
                .map(|s| s.to_string())
                .ok_or(anyhow::anyhow!(
                    "Wrong args for git-remote call\nRequired: <name> <url>"
                ))?;
            let dispatcher_call = matches.get_flag("dispatcher");
            git_remote_gosh::git_helper::run(config, &url, dispatcher_call).await?;
        }
    }
    Ok(())
}
