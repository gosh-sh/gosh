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

use clap::Arg;
use std::str::FromStr;
use gosh_builder_grpc_api::proto::{
    git_remote_gosh_client::GitRemoteGoshClient, CommandRequest, GetArchiveRequest, SpawnRequest,
};
use tar::Archive;
use zstd::Decoder;

#[cfg(target_family = "unix")]
const INI_LOCATION: &str = "~/.gosh/dispatcher.ini";

#[cfg(target_family = "windows")]
const INI_LOCATION: &str = "$HOME/.gosh/dispatcher.ini";

const SHIPPING_INI_PATH: &str = "dispatcher.ini";

const GIT_HELPER_ENV_TRACE_VERBOSITY: &str = "GOSH_TRACE";
static DISPATCHER_ENDL: &str = "endl";

const GOSH_GRPC_ENABLE: &str = "GOSH_GRPC_ENABLE";
const GOSH_GRPC_CONTAINER: &str = "GOSH_GRPC_CONTAINER";
const GRPC_URL: &str = "http://localhost:8000";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let matches = clap::Command::new("gosh-dispatcher")
        .about("Dispatcher of git-remote-gosh versions")
        .arg(Arg::new("name"))
        .arg(Arg::new("url"))
        .arg(
            Arg::new("version")
                .long("version")
                .action(clap::ArgAction::SetTrue),
        )
        .subcommand(clap::Command::new("dispatcher_ini").about(
            "Get path to the current dispatcher ini file and list of supported remote versions",
        ))
        .get_matches();

    let version = option_env!("GOSH_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"));
    eprintln!("GOSH dispatcher v{version}");

    match matches.subcommand() {
        Some(("dispatcher_ini", _)) => {
            let ini_path = get_ini_path()?;
            println!("GOSH dispatcher ini path: {}", ini_path);
            let possible_versions = load_remote_versions_from_ini()?;
            println!("Remote versions:\n{:#?}", possible_versions);
        }
        _ => {
            if matches.get_flag("version") {
                return Ok(());
            }
            return dispatcher_main().await;
        }
    }
    Ok(())
}

async fn dispatcher_main() -> anyhow::Result<()> {
    set_up_logger();
    if let Ok(_) = std::env::var(GOSH_GRPC_ENABLE) {
        return grpc_mode().await;
    }
    let mut args = std::env::args().collect::<Vec<String>>();
    if args.len() < 3 {
        anyhow::bail!("Wrong number of arguments.");
    }
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
                        Version::from(iter.next().unwrap_or("Unknown")).unwrap(),
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
                tracing::trace!("caught output line: {line}");
                if line == DISPATCHER_ENDL {
                    if std::env::var(GOSH_GRPC_CONTAINER).is_ok() {
                        output.push(line.clone());
                    }
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
        tracing::trace!("Output lines buffer: {output:?}");
        let mut buffer = vec![];
        for line in output {
            tracing::trace!("append to buffer: '{line}'");
            buffer.append(&mut format!("{line}\n").as_bytes().to_vec());
        }
        write_output(&buffer).await?;
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

fn get_ini_path() -> anyhow::Result<String> {
    let path_str = std::env::var("GOSH_INI_PATH").unwrap_or_else(|_| {
        if Path::new(&shellexpand::tilde(INI_LOCATION).to_string()).exists() {
            INI_LOCATION.to_string()
        } else {
            SHIPPING_INI_PATH.to_string()
        }
    });
    let path_str = shellexpand::tilde(&path_str).into_owned();
    let path = Path::new(&path_str);
    if path.is_absolute() {
        Ok(path_str)
    } else {
        let mut abs_path = std::env::current_exe()?;
        abs_path.pop();
        abs_path.push(path);
        Ok(abs_path.to_str().expect("Failed to build dispatcher path").to_owned())
    }
}

fn load_remote_versions_from_ini() -> anyhow::Result<Vec<String>> {
    let path_str = get_ini_path()?;
    let path = Path::new(&path_str).to_owned();
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

    // TODO: return helper and catch output in out cycle
    let mut output = vec![];
    if let Some(out) = previous_helper.stdout.as_mut() {
        let reader = BufReader::new(out);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            tracing::trace!("Caught out line: {line}");
            if line == DISPATCHER_ENDL {
                if std::env::var(GOSH_GRPC_CONTAINER).is_ok() {
                    output.push(line.clone());
                }
                break;
            }
            output.push(line.clone());
        }
    } else {
        panic!("Failed to take stdout");
    }
    tracing::trace!("Output: {output:?}");
    let mut buffer = vec![];
    for line in output {
        tracing::trace!("append to buffer: '{line}'");
        buffer.append(&mut format!("{line}\n").as_bytes().to_vec());
    }
    write_output(&buffer).await?;
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

async fn write_output(buffer: &Vec<u8>) -> anyhow::Result<()> {
    tracing::trace!(
        "send output: '{buffer:?}' {}",
        String::from_utf8_lossy(buffer)
    );
    io::stdout().write_all(buffer).await?;
    io::stdout().flush().await?;
    Ok(())
}

async fn grpc_mode() -> anyhow::Result<()> {
    // In this mode dispatcher is run inside a container and should call not git-remote-gosh
    // binaries, but send messages to the server via grpc.
    // Dispatcher resend all git commands to grpc server and sends answer to git.
    // After all commands been processed git send an empty line and after getting it
    // dispatcher calls server to send the compressed repo, receives it, unpacks and
    // finishes execution.

    let mut args = std::env::args().collect::<Vec<String>>();
    tracing::trace!("Start grpc client, url: {}", GRPC_URL);
    let mut client = GitRemoteGoshClient::connect(GRPC_URL).await?;
    let session_id = uuid::Uuid::new_v4().to_string();
    tracing::trace!("grpc session id: {}", session_id);

    //   call client start
    args.remove(0);
    client
        .spawn(SpawnRequest {
            id: session_id.clone(),
            args,
        })
        .await?;

    let mut lines = BufReader::new(io::stdin()).lines();
    tracing::trace!("Start dispatcher message interchange via grpc");
    while let Some(input_line) = lines.next_line().await? {
        tracing::trace!("send input: {}", input_line);
        if input_line.is_empty() {
            // get tarball from server
            tracing::trace!("fetch finished, get tarball from server");
            let res = client
                .get_archive(GetArchiveRequest {
                    id: session_id.clone(),
                })
                .await?;
            tracing::trace!("decode tarball");
            let tar = Decoder::new(&res.get_ref().body[..])?;
            let mut archive = Archive::new(tar);
            tracing::trace!("unpack tarball");
            let local_git_dir = std::env::var("GIT_DIR")?;
            archive.unpack(&local_git_dir)?;
        }
        let input_line = format!("{input_line}\n");
        let res = client
            .command(CommandRequest {
                id: session_id.clone(),
                body: input_line.as_bytes().to_vec(),
            })
            .await?;
        write_output(&res.get_ref().body).await?;
    }
    Ok(())
}
