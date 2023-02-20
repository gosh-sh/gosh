extern crate shellexpand;

use anyhow::format_err;
use std::cmp::Ordering;
use std::collections::HashMap;
use std::fs::File;
use std::io::prelude::*;
use std::path::Path;
use std::process::{ExitStatus, Stdio};
use tokio::io::{self, AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

use tracing::level_filters::LevelFilter;
use version_compare::Version;

use tracing_subscriber::fmt;
use tracing_subscriber::fmt::format::FmtSpan;

use std::str::FromStr;

#[cfg(target_family = "unix")]
pub const INI_LOCATION: &str = "~/.gosh/dispatcher.ini";

#[cfg(target_family = "windows")]
pub const INI_LOCATION: &str = "$HOME/.gosh/dispatcher.ini";

const GIT_HELPER_ENV_TRACE_VERBOSITY: &str = "GOSH_TRACE";
static DISPATCHER_ENDL: &str = "endl";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    set_up_logger();
    let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
    eprintln!("Dispatcher git-remote-gosh v{version}");

    let possible_versions = load_remote_versions_from_ini()?;
    let mut existing_to_supported_map = HashMap::new();
    for helper_path in possible_versions {
        if let Ok(version) = get_supported_version(&helper_path).await {
            existing_to_supported_map.insert(helper_path.clone(), version);
        }
    }
    tracing::trace!("existing: {existing_to_supported_map:?}");
    if existing_to_supported_map.is_empty() {
        return Err(format_err!("No git-remote-gosh versions were found. Download git-remote-gosh binary and add path to it to ini file"));
    }

    let mut args = std::env::args().collect::<Vec<String>>();
    // zero arg is always current binary path, we don't need it
    args.remove(0);

    let mut highest = None;
    let mut system_contracts = HashMap::new();
    for helper_path in existing_to_supported_map.keys() {
        tracing::trace!("Run version: {helper_path}");
        if let Ok((status, versions, _)) = run_binary_with_command(
            helper_path.to_owned(),
            args.clone(),
            "gosh_get_all_repo_versions",
        )
        .await
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
            for version in parse.clone() {
                system_contracts.insert(version.0.to_string(), version.1);
            }
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
    tracing::trace!("system contracts: {system_contracts:?}");
    tracing::trace!("Highest repository version: {highest:?}");
    if highest.is_none() {
        return Err(format_err!(
            "Failed to query the highest repository version."
        ));
    }
    let (repo_version, system_contract_address) = highest.unwrap();

    let mut proper_remote_version = None;
    for version in &existing_to_supported_map {
        if *version.1 == repo_version {
            proper_remote_version = Some(version.0.to_string());
        }
    }
    if proper_remote_version.is_none() {
        return Err(format_err!("No git-remote-gosh version capable to work with repo version {repo_version} was found."));
    }
    let helper_path = proper_remote_version.unwrap();
    tracing::trace!("Proper remote version : {helper_path:?}");
    get_new_args(&mut args, &system_contract_address)?;
    let mut main_helper = Command::new(&helper_path)
        .args(args.clone())
        .arg("--dispatcher")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()?;

    let mut lines = BufReader::new(io::stdin()).lines();
    let mut dispatcher_cmd = None;
    tracing::trace!("Start dispatcher message interchange");
    while let Some(input_line) = lines.next_line().await? {
        write_to_helper(&mut main_helper, &input_line).await?;
        tracing::trace!("waiting for output");
        let mut output = vec![];
        if let Some(out) = main_helper.stdout.as_mut() {
            let reader = BufReader::new(out);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if line.contains(DISPATCHER_ENDL) {
                    break;
                }
                if line.starts_with("dispatcher") {
                    output.clear();
                    dispatcher_cmd = Some(line);
                    break;
                }
                output.push(line.clone());
            }
        } else {
            panic!("Failed to take stdout");
        }
        tracing::trace!("Output: {output:?}");
        for line in output {
            io::stdout()
                .write_all(format!("{line}\n").as_bytes())
                .await
                .unwrap();
            io::stdout().flush().await?;
        }
        if let Some(line) = dispatcher_cmd {
            dispatcher_cmd = None;
            let _main_res = main_helper.wait().await;
            main_helper =
                call_helper_after_fail(line, &existing_to_supported_map, &args, &system_contracts)
                    .await?;
        }
        if let Ok(Some(code)) = main_helper.try_wait() {
            tracing::trace!("Loop finished with: {code:?}");
            if let Some(code) = code.code() {
                if code != 0 {
                    return Err(format_err!("Remote status error: {code}"));
                }
            }
            break;
        }
    }
    Ok(())
}

async fn run_binary_with_command(
    helper_path: String,
    args: Vec<String>,
    command: &str,
) -> anyhow::Result<(io::Result<ExitStatus>, Vec<String>, String)> {
    let mut helper = Command::new(&helper_path)
        .args(args.clone())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
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
    stdin.flush().await?;
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
    tracing::trace!("dispatcher ini path: {path_str}");
    let path = Path::new(&path_str);
    let file = File::open(path)
        .map_err(|e| format_err!("Failed to read dispatcher ini file {}: {}", path_str, e))?;
    let buf = std::io::BufReader::new(file);
    let res = buf
        .lines()
        .map(|l| l.expect("Failed to parse ini string."))
        .filter(|line| !line.is_empty() && !line.starts_with("#"))
        .collect();
    tracing::trace!("git-remote-gosh versions from ini: {res:?}");
    Ok(res)
}

fn set_up_logger() {
    if let Ok(trace_verbosity) = std::env::var(GIT_HELPER_ENV_TRACE_VERBOSITY) {
        if u8::from_str(&trace_verbosity).unwrap_or_default() > 0 {
            let builder = fmt()
                .with_file(false)
                .with_target(false)
                .with_ansi(false)
                .with_writer(std::io::stderr)
                .with_max_level(LevelFilter::TRACE)
                .with_span_events(FmtSpan::NEW | FmtSpan::CLOSE);
            let my_subscriber = builder.finish();

            tracing::subscriber::set_global_default(my_subscriber)
                .expect("setting tracing default failed");
        }
    }
}

async fn get_supported_version(binary_path: &str) -> anyhow::Result<String> {
    let out = Command::new(binary_path)
        .arg("supported_contract_version")
        .output()
        .await?;
    String::from_utf8_lossy(&out.stdout)
        .split('\"')
        .collect::<Vec<&str>>()
        .get(1)
        .map(|s| s.to_string())
        .ok_or(format_err!("Failed to get supported version"))
}

async fn call_helper_after_fail(
    remote_callback: String,
    existing_to_supported_map: &HashMap<String, String>,
    args: &Vec<String>,
    system_contracts: &HashMap<String, String>,
) -> anyhow::Result<Child> {
    // callback string = dispatcher 1.0.0 fetch eeb077143f2d278dcf1628a5cee69c4aa52d62af refs/heads/main
    tracing::trace!("call_helper_after_fail {remote_callback}");
    let mut args = args.to_owned();
    let mut parser = remote_callback.split(' ');
    // skip 1 part
    parser.next();
    let version = parser.next().unwrap().to_string();
    let cmd = format!(
        "{} {} {}",
        parser.next().unwrap(),
        parser.next().unwrap(),
        parser.next().unwrap()
    );

    tracing::trace!("version: {version}");
    let mut proper_helper = None;
    for (helper, helper_version) in existing_to_supported_map {
        if *helper_version == version {
            proper_helper = Some(helper);
        }
    }
    tracing::trace!("proper_helper: {proper_helper:?}");
    let proper_helper = proper_helper.ok_or(format_err!(
        "Helper with supported version {version} was not found."
    ))?;
    let new_system_contract = system_contracts.get(&version).ok_or(format_err!(
        "Failed to get system contract address for version {version}"
    ))?;

    get_new_args(&mut args, &new_system_contract)?;
    tracing::trace!("new args: {args:?}");

    let mut previous_helper = Command::new(proper_helper)
        .args(args.clone())
        .arg("--dispatcher")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()?;

    write_to_helper(&mut previous_helper, &cmd).await?;

    let mut output = vec![];
    if let Some(out) = previous_helper.stdout.as_mut() {
        let reader = BufReader::new(out);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.contains(DISPATCHER_ENDL) {
                break;
            }
            output.push(line.clone());
        }
    } else {
        panic!("Failed to take stdout");
    }
    tracing::trace!("Output: {output:?}");
    for line in output {
        io::stdout().write_all(line.as_bytes()).await.unwrap();
        io::stdout().write_all("\n".as_bytes()).await.unwrap();
        io::stdout().flush().await.unwrap();
    }

    Ok(previous_helper)
}

fn get_new_args(args: &mut Vec<String>, system_contract_address: &String) -> anyhow::Result<()> {
    let old_system = args[1]
        .split("://")
        .collect::<Vec<&str>>()
        .get(1)
        .ok_or(format_err!("Wrong amount of args"))?
        .split("/")
        .collect::<Vec<&str>>()
        .get(0)
        .ok_or(format_err!("Wrong remote url format"))?
        .to_string();
    let new_repo_link = args[1]
        .clone()
        .replace(&old_system, system_contract_address);
    tracing::trace!("New repo link: {new_repo_link}");
    args[1] = new_repo_link;
    Ok(())
}

async fn write_to_helper(helper: &mut Child, input_line: &String) -> anyhow::Result<()> {
    tracing::trace!("send input: {input_line}");
    if let Some(stdin) = helper.stdin.as_mut() {
        stdin
            .write_all(format!("{input_line}\n").as_bytes())
            .await?;
        stdin.flush().await?;
    } else {
        panic!("Failed to take stdin");
    }
    Ok(())
}
