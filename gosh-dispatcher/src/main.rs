extern crate shellexpand;

use anyhow::format_err;
use std::cmp::Ordering;
use std::collections::HashMap;
use std::fs::File;
use std::io::{prelude::*, Read};
use std::path::Path;
use std::process::{ExitStatus, Stdio};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

use git_remote_gosh::logger::set_log_verbosity;
use tokio::task::JoinSet;
use tracing::Instrument;
use version_compare::Version;

#[cfg(target_family = "unix")]
pub const INI_LOCATION: &str = "~/.gosh/dispatcher.ini";

#[cfg(target_family = "windows")]
pub const INI_LOCATION: &str = "$HOME/.gosh/dispatcher.ini";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // TODO: return initial level to 1 after debug
    set_log_verbosity(5);

    let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
    eprintln!("Dispatcher git-remote-gosh v{version}");

    let possible_versions = load_remote_versions_from_ini()?;

    let mut args = std::env::args().collect::<Vec<String>>();
    // zero arg is always current binary path, we don't need it
    args.remove(0);

    let mut get_supported_versions: JoinSet<
        anyhow::Result<(tokio::io::Result<ExitStatus>, Vec<String>, String)>,
    > = JoinSet::new();

    for helper_path in possible_versions {
        let n_args = args.clone();
        get_supported_versions.spawn(
            async move {
                run_binary_with_command(helper_path, n_args, "supported_contract_versions").await
            }
            .instrument(tracing::debug_span!("tokio::spawn::get_supported_versions").or_current()),
        );
    }

    let mut existing_to_supported_map = HashMap::new();

    while let Some(finished_task) = get_supported_versions.join_next().await {
        let task_result =
            finished_task.map_err(|e| format_err!("Failed to finish async task: {e}"))?;
        if let Ok((_exec_res, versions, helper_path)) = task_result {
            if !versions.is_empty() {
                existing_to_supported_map.insert(helper_path.to_string(), versions);
            }
        }
    }

    tracing::trace!("existing: {existing_to_supported_map:?}");
    if existing_to_supported_map.is_empty() {
        return Err(format_err!("No git-remote-gosh versions were found. Download git-remote-gosh binary and add path to it to {INI_LOCATION}"));
    }

    let mut highest = None;
    for helper_path in existing_to_supported_map.keys() {
        tracing::trace!("Run version: {helper_path}");
        if let Ok((status, versions, _)) =
            run_binary_with_command(helper_path.to_owned(), args.clone(), "get_repo_versions").await
        {
            tracing::trace!("Get versions: {status:?} {versions:?}");
            if versions.len() == 0 {
                continue;
            }
            let mut parse = versions
                .iter()
                .map(|s| {
                    let mut iter = s.split(" ");
                    (
                        Version::from(iter.next().unwrap_or("")).unwrap(),
                        iter.next().unwrap_or("").to_string(),
                    )
                })
                .collect::<Vec<(Version, String)>>();
            parse.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(Ordering::Equal));
            tracing::trace!("Parse: {parse:?}");
            highest = Some(
                parse
                    .last()
                    .map(|val| (val.0.to_string(), val.1.clone()))
                    .unwrap()
                    .to_owned(),
            );
            break;
        }
    }

    tracing::trace!("Highest: {highest:?}");
    if highest.is_none() {
        return Err(format_err!(
            "Failed to query the highest repository version."
        ));
    }
    let (repo_version, system_contract_address) = highest.unwrap();

    let mut proper_remote_version = None;
    for version in existing_to_supported_map {
        if version.1.contains(&repo_version) {
            proper_remote_version = Some(version.0);
        }
    }
    if proper_remote_version.is_none() {
        return Err(format_err!("No git-remote-gosh version capable to work with repo version {repo_version} was found."));
    }
    let helper_path = proper_remote_version.unwrap();
    let old_system = args[1].split("://").collect::<Vec<&str>>()[1]
        .split("/")
        .collect::<Vec<&str>>()[0]
        .to_string();
    let new_repo_link = args[1]
        .clone()
        .replace(&old_system, &system_contract_address);
    tracing::trace!("New repo link: {new_repo_link}");
    args[1] = new_repo_link;

    let res = Command::new(&helper_path)
        .args(args.clone())
        .status()
        .await?;
    match res.code() {
        Some(0) => Ok(()),
        Some(code) => Err(format_err!("Failed with code: {code}")),
        None => Err(format_err!("Failed")),
    }
}

async fn run_binary_with_command(
    helper_path: String,
    args: Vec<String>,
    command: &str,
) -> anyhow::Result<(tokio::io::Result<ExitStatus>, Vec<String>, String)> {
    let mut helper = Command::new(&helper_path)
        .args(args.clone())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()?;
    let mut stdin = helper
        .stdin
        .take()
        .ok_or(format_err!("Failed to take stdin of child process"))?;
    let output = helper
        .stdout
        .take()
        .ok_or(format_err!("Failed to take stdout of child process"))?;
    stdin.write_all(format!("{command}\n\n").as_bytes()).await?;
    let mut lines = BufReader::new(output).lines();
    let mut result = Vec::new();
    while let Some(line) = lines.next_line().await? {
        if line.is_empty() {
            break;
        }
        result.push(line);
    }
    tracing::trace!("Binary call result: {result:?}");
    Ok((helper.wait().await, result, helper_path))
}

fn load_remote_versions_from_ini() -> anyhow::Result<Vec<String>> {
    let path_str = std::env::var("GOSH_INI_PATH").unwrap_or_else(|_| INI_LOCATION.to_string());
    let path_str = shellexpand::tilde(&path_str).into_owned();
    let path = Path::new(&path_str);
    let file = File::open(path)
        .map_err(|e| format_err!("Failed to read dispatcher ini file {}: {}", INI_LOCATION, e))?;
    let buf = std::io::BufReader::new(file);
    let res = buf
        .lines()
        .map(|l| l.expect("Failed to parse ini string."))
        .filter(|line| !line.is_empty() && !line.starts_with("#"))
        .collect();
    tracing::trace!("git-remote-gosh versions from ini: {res:?}");
    Ok(res)
}
