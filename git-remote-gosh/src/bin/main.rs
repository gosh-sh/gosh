use git_remote_gosh::run;
use std::process::ExitCode;

#[tokio::main(flavor = "multi_thread", worker_threads = 200)]
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
