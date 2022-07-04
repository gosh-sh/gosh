use git_remote_gosh::run;
use std::process::ExitCode;

#[tokio::main]
async fn main() -> ExitCode {
    match run().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("Error: {e}");
            log::error!("{e:?}");
            ExitCode::FAILURE
        }
    }
}
