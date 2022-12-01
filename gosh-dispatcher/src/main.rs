use anyhow::format_err;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

const REMOTE_NAME: &str = "git-remote-gosh_v";
const POSSIBLE_VERSIONS: [&'static str; 2] = ["1_0_0", "0_11_0"];

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
    eprintln!("Dispatcher git-remote-gosh v{version}");

    let mut args = std::env::args().collect::<Vec<String>>();
    args.remove(0);

    let mut proper_start_version = None;
    for ver in POSSIBLE_VERSIONS {
        let helper_path = format!("{}{}", REMOTE_NAME, ver);
        let helper = Command::new(&helper_path)
            .args(args.clone())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn();
        if helper.is_err() {
            continue;
        }
        let mut helper = helper.unwrap();
        let mut stdin = helper
            .stdin
            .take()
            .ok_or(format_err!("Failed to take stdin of child process"))?;
        let output = helper
            .stdout
            .take()
            .ok_or(format_err!("Failed to take stdout of child process"))?;
        stdin.write_all("repo_version\n\n".as_bytes()).await?;
        let mut lines = BufReader::new(output).lines();
        let mut returned_version = None;
        while let Some(line) = lines.next_line().await? {
            if line.is_empty() {
                break;
            }
            returned_version = Some(line.clone());
        }
        let exec_res = helper.wait().await;
        let exit_code = exec_res.unwrap().code().unwrap_or(-1);
        if (exit_code == 0)
            && returned_version.is_some()
            && returned_version.unwrap() == ver.replace("_", ".")
        {
            proper_start_version = Some(helper_path);
        }
    }
    if proper_start_version.is_none() {
        // 0_11_0 version doesn't support repo_version command, so choose to try it if no proper
        // helper was found
        proper_start_version = Some(format!("{}{}", REMOTE_NAME, "0_11_0"));
    }

    if let Some(helper_path) = proper_start_version {
        eprintln!("Run version: {helper_path}");
        let res = Command::new(&helper_path)
            .args(args.clone())
            .status()
            .await?;
        return match res.code() {
            Some(0) => Ok(()),
            Some(code) => Err(format_err!("Failed with code: {code}")),
            None => Err(format_err!("Failed")),
        };
    }
    Err(format_err!("Failed to find proper git-remote-gosh version"))
}
