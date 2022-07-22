use core::time::Duration;
use std::process::ExitCode;

use git_remote_gosh::run;

#[tokio::main]
async fn main() -> ExitCode {
    try_vscode_debugger();

    match run().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("Error: {e}");
            log::error!("{e:?}");
            ExitCode::FAILURE
        }
    }
}

/// Example:
/// ```bash
/// VSCODE_BIN=code git clone gosh://someting/something
/// ```
/// git clone -> git-remote-<proto> -> vscode attach pid
fn try_vscode_debugger() {
    if let Ok(vscode_bin) = std::env::var("VSCODE_BIN") {
        let url = format!(
            "vscode://vadimcn.vscode-lldb/launch/config?{{'request':'attach','pid':{}}}",
            std::process::id()
        );
        std::process::Command::new(vscode_bin)
            .arg("--open-url")
            .arg(url)
            .output()
            .unwrap();
        std::thread::sleep(Duration::from_secs(2));
    }
}
