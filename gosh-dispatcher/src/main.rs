use std::process::{Stdio};
use anyhow::format_err;
use tokio::io::{BufReader, AsyncBufReadExt, AsyncWriteExt};
use tokio::process::Command;

const REMOTE_NAME: &str = "git-remote-gosh_v";
const POSSIBLE_VERSIONS: [&'static str; 3] = ["1_0_0", "0_11_0", "0_10_0"];

#[tokio::main]
async fn main() -> anyhow::Result<()>{
    let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
    eprintln!("Dispatcher git-remote-gosh v{version}");

    let mut existing_helpers = Vec::new();
    for ver in POSSIBLE_VERSIONS {
        let helper = format!("{}{}", REMOTE_NAME, ver);
        let res = Command::new(&helper)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status().await;
        eprintln!("{helper} {res:?}");
        if res.is_ok() {
            existing_helpers.push(helper);
        }
    }

    eprintln!("EXISTING: {:?}", existing_helpers);

    let mut args = std::env::args().collect::<Vec<String>>();
    args.remove(0);

    let mut proper_start_version = None;

    for helper_path in existing_helpers {
        let mut helper = Command::new(&helper_path)
            .args(args.clone())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()?;
        let mut stdin = helper.stdin.take().ok_or(format_err!("Failed to take stdin of child process"))?;
        let output = helper.stdout.take().ok_or(format_err!("Failed to take stdout of child process"))?;
        stdin.write_all("repo_version\n\n".as_bytes()).await?;
        let mut lines = BufReader::new(output).lines();
        let mut returned_version = None;
        while let Some(line) = lines.next_line().await? {
            if line.is_empty() {
                break;
            }
            returned_version = Some(line.clone());
            eprintln!("{helper_path}: {line}");
        }
        let exec_res = helper.wait().await;
        eprintln!("{helper_path}: {:?}", exec_res);
        let exit_code = exec_res.unwrap().code().unwrap_or(-1);
        let cur_version = helper_path[REMOTE_NAME.len()..].to_string().replace("_", ".");
        if (exit_code == 0) && returned_version.is_some()  && returned_version.unwrap() == cur_version {
            proper_start_version = Some(helper_path);
        }

    }

    if let Some(helper_path) = proper_start_version {
        eprintln!("Run version: {helper_path}");
        let res = Command::new(&helper_path)
            .args(args.clone())
            .status().await?;
        eprintln!("RESULT: {res}");
    }

    Ok(())
}
