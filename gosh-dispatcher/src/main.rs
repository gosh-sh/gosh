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

    eprintln!("Args: {args:?}");

    let mut proper_start_version = None;
    let mut returned_version = None;
    let mut existing_versions = vec![];
    for ver in POSSIBLE_VERSIONS {
        let helper_path = format!("{}{}", REMOTE_NAME, ver);
        let (exec_res, version) = run_binary_with_command(&helper_path, args.clone(), "repo_version").await?;
        let version = version[0].clone();
        if !version.is_empty() {
            returned_version = Some(version);
        }
        if exec_res.is_err() {
            continue;
        }
        existing_versions.push(ver.to_string());
        let exit_code = exec_res.unwrap().code().unwrap_or(-1);
        if (exit_code == 0)
            && returned_version.is_some()
            && returned_version.clone().unwrap() == ver.replace("_", ".")
        {
            proper_start_version = Some(helper_path);
            break;
        }
    }
    eprintln!("existing: {existing_versions:?}");
    if proper_start_version.is_none() {
        if let Some(version) = returned_version {
            eprintln!("Specified repo has such version: {version}\nPls obtain corresponding version {REMOTE_NAME} to work with it.");
            return Err(format_err!("Failed to find proper git-remote-gosh version"));
        }
        // 0_11_0 version doesn't support repo_version command, so choose to try it if no proper
        // helper was found
        proper_start_version = Some(format!("{}{}", REMOTE_NAME, "0_11_0"));
    }

    if let Some(helper_path) = proper_start_version.clone() {
        eprintln!("Run version: {helper_path}");
        eprintln!("Check for tombstone");
        let (status, tombstone) = run_binary_with_command(&helper_path, args.clone(), "get_dao_tombstone").await?;
        if status.is_ok() && tombstone[0] == "true" {
            let (status, versions) = run_binary_with_command(&helper_path, args.clone(), "get_version_controller_address").await?;
            eprintln!("{status:?} {versions:?}");
            // "1.0.2 <0:7e6bcee1e9ccd4db5e1d7adca6352deefa12183e4c227148d29c67517d806c49>"
            let mut chosen_version = String::new();
            if versions.len() == 0 {
                return Err(format_err!("Repository is tombstoned, and no new versions of the repository were found. Please deploy the repository with version greater than {}.", returned_version.unwrap()));
            } else if versions.len() == 1 {
                chosen_version = versions[0].clone();
            } else {
                let mut versions = versions.iter()
                    .map(|s| {
                        let mut iter = s.split(" ");
                        (iter.next().unwrap_or(""), iter.next().unwrap_or(""))
                    }).collect::<Vec<(&str, &str)>>();
                versions.sort_by(|a, b| a.0.cmp(b.0));
                chosen_version = format!("{} {}", versions.last().unwrap().0, versions.last().unwrap().1);
            }
            let parse = chosen_version.split(" ").collect::<Vec<&str>>().iter().map(|s| s.to_string()).collect::<Vec<String>>();
            let (new_version, system_address) = (parse[0].clone(), parse[1].clone());
            let new_version = new_version.replace(".", "_");
            if existing_versions.contains(&new_version) {
                proper_start_version = Some(format!("{}{}", REMOTE_NAME, new_version));
                eprintln!("New remote version: {:?}", proper_start_version);
            } else {
                return Err(format_err!("Repository is tombstoned, new version {new_version} is available, but corresponding git-remote-version was not found."));
            }
            let system_address = system_address.replace("<", "").replace(">", "");
            // "gosh://0:5c3efa6829cc695c9d514fb4ba7ee4f66b1fec0a5ca6c8ae9471fa79b6ae000d/rogaikopyta/repo"
            let old_system = args[1].split("://").collect::<Vec<&str>>()[1].split("/").collect::<Vec<&str>>()[0].to_string();
            let new_repo_link = args[1].clone().replace(&old_system, &system_address);
            eprintln!("New repo link: {new_repo_link}");
            args[1] = new_repo_link;

            // TODO: need to change url `git remote set-url origin`
            // return Err(format_err!("Repository is tombstoned, you need to get the remote link to the new version of repository."));
        }
    }
    if let Some(helper_path) = proper_start_version {
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

async fn run_binary_with_command(helper_path: &str, args: Vec<String>, command: &str) -> anyhow::Result<(tokio::io::Result<ExitStatus>, Vec<String>)> {
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
    let mut result = Vec::new();
    while let Some(line) = lines.next_line().await? {
        if line.is_empty() {
            break;
        }
        result.push(line);
    }
    eprintln!("{command}: {result:?}");

    Ok((helper.wait().await, result))
}
