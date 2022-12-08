use anyhow::format_err;
use std::process::{ExitStatus, Stdio};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

const REMOTE_NAME: &str = "git-remote-gosh_v";
const POSSIBLE_VERSIONS: [&'static str; 4] = ["1_0_2", "1_0_1", "1_0_0", "0_11_0"];

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
    eprintln!("Dispatcher git-remote-gosh v{version}");

    let mut args = std::env::args().collect::<Vec<String>>();
    args.remove(0);

    let mut proper_start_version = None;
    let mut returned_version = None;
    for ver in POSSIBLE_VERSIONS {
        let helper_path = format!("{}{}", REMOTE_NAME, ver);
        let (exec_res, version) = run_binary_with_command(&helper_path, args.clone(), "repo_version").await?;
        if !version.is_empty() {
            returned_version = Some(version);
        }

        let exit_code = exec_res.unwrap().code().unwrap_or(-1);
        if (exit_code == 0)
            && returned_version.is_some()
            && returned_version.clone().unwrap() == ver.replace("_", ".")
        {
            proper_start_version = Some(helper_path);
            break;
        }
    }
    if proper_start_version.is_none() {
        if let Some(version) = returned_version {
            eprintln!("Specified repo has such version: {version}\nPls obtain corresponding version {REMOTE_NAME} to work with it.");
            return Err(format_err!("Failed to find proper git-remote-gosh version"));
        }
        // 0_11_0 version doesn't support repo_version command, so choose to try it if no proper
        // helper was found
        proper_start_version = Some(format!("{}{}", REMOTE_NAME, "0_11_0"));
    }

    if let Some(helper_path) = proper_start_version {
        eprintln!("Run version: {helper_path}");
        eprintln!("Check for tombstone");
        let (status, tombstone) = run_binary_with_command(&helper_path, args.clone(), "get_dao_tombstone").await?;
        if status.is_ok() && tombstone == "true" {
            let (status, vc) = run_binary_with_command(&helper_path, args.clone(), "get_version_controller_address").await?;
            eprintln!("{status:?} {vc}");
            return Err(format_err!("Repository is tombstoned, you need to get the remote link to the new version of repository."));
        }
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

async fn run_binary_with_command(helper_path: &str, args: Vec<String>, command: &str) -> anyhow::Result<(tokio::io::Result<ExitStatus>, String)> {
    // eprintln!("run {helper_path} with {args:?} and command {command}");
    let mut helper = Command::new(helper_path)
        .args(args.clone())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        // .stderr(Stdio::null())
        .spawn()?;
    let mut stdin = helper
        .stdin
        .take()
        .ok_or(format_err!("Failed to take stdin of child process"))?;
    let output = helper
        .stdout
        .take()
        .ok_or(format_err!("Failed to take stdout of child process"))?;
    // eprintln!("pass command");
    stdin.write_all(format!("{command}\n\n").as_bytes()).await?;
    let mut lines = BufReader::new(output).lines();
    let mut result = String::new();
    while let Some(line) = lines.next_line().await? {
        if line.is_empty() {
            break;
        }
        result = line;
        eprintln!("{command}: {result}");
    }

    Ok((helper.wait().await, result))
}
