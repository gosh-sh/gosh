use std::process::ExitCode;
use git_remote_gosh::logger::set_log_verbosity;
use opentelemetry::global::shutdown_tracer_provider;
use std::env::args;
use git_remote_gosh::anyhow;

fn shutdown(result: anyhow::Result<()>) -> ExitCode {
    let exit_code = match result {
        Ok(_) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("Error: {e}");
            tracing::error!("{e:?}");
            ExitCode::FAILURE
        }
    };
    shutdown_tracer_provider();
    return exit_code;
}

#[tokio::main(flavor = "multi_thread", worker_threads = 200)]
async fn main() -> ExitCode {
    set_log_verbosity(1);

    let result = {
        let root = tracing::span!(tracing::Level::TRACE, "git-remote-helper");
        let _enter = root.enter();
        let config = match git_remote_gosh::config::Config::init() {
            Ok(r) => r,
            Err(e) => {
                return shutdown(Err(e));
            }
        };
        let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
        tracing::info!("git-remote-gosh v{version}");
        eprintln!("git-remote-gosh v{version}");
        let url = {
            let url_result = args().nth(2).ok_or(anyhow::anyhow!(
                "Wrong args for git-remote call\nRequired: <name> <url>"
            ));
            match url_result {
                Ok(r) => r,
                Err(e) => {
                    return shutdown(Err(e));
                }
            }
        };
        git_remote_gosh::git_helper::run(config, &url).await
    };

    return shutdown(result);
}
