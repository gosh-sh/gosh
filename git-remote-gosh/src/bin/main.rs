use clap::{Arg, Command};
use git_remote_gosh::anyhow;
use git_remote_gosh::git_helper::supported_contract_versions;
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
    let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
    tracing::info!("git-remote-gosh v{version}");
    eprintln!("git-remote-gosh v{version}");
    let matches = Command::new("git-remote-gosh")
        .about("GOSH network helper for git")
        .version(option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION")))
        .arg(Arg::new("name"))
        .arg(Arg::new("url"))
        .subcommand(
            Command::new("supported_contract_versions")
                .about("Get list of supported contract versions"),
        )
        .get_matches();

    match matches.subcommand() {
        Some(("supported_contract_versions", _)) => {
            println!(
                "Supported contract versions: {:?}",
                supported_contract_versions()
            );
        }
        _ => {
            let url = matches
                .get_one::<String>("url")
                .map(|s| s.to_string())
                .ok_or(anyhow::anyhow!(
                    "Wrong args for git-remote call\nRequired: <name> <url>"
                ))?;
            git_remote_gosh::git_helper::run(config, &url).await?;
        }
    }
    Ok(())
}
