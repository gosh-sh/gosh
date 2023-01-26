use git_remote_gosh::anyhow;
use git_remote_gosh::logger::set_log_verbosity;
use opentelemetry::global::shutdown_tracer_provider;
use std::env::args;
use std::process::{exit, ExitCode};
use std::time::Duration;
use tokio::time::sleep;
use git_remote_gosh::git_helper::supported_contract_versions;

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
    if let Some(first_arg) = args().nth(1) {
        if first_arg == "supported_contract_versions" {
            println!("Supported contract versions: {:?}", supported_contract_versions());
            exit(0);
        }

    }
    let url = args().nth(2).ok_or(anyhow::anyhow!(
        "Wrong args for git-remote call\nRequired: <name> <url>"
    ))?;
    git_remote_gosh::git_helper::run(config, &url).await?;
    Ok(())
}
