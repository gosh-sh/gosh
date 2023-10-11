use std::cmp::Ordering;
use std::collections::HashMap;

use tokio::io;
use tokio::io::{AsyncBufReadExt, BufReader};

use crate::common::{get_new_args, write_output};
use crate::gosh_remote::GoshRemote;
use crate::ini::load_remote_versions_from_ini;
use version_compare::Version;

// TODO: create struct and store a stack of commands from git or previous remotes
#[derive(Debug, Default)]
pub struct Dispatcher {
    commands: Vec<(String, String)>, // Vector of commands for remotes in pair: (version, command)
    remotes_map: HashMap<String, Box<GoshRemote>>, // Mapping of GOSH remotes: version -> GoshRemote
    system_contracts: HashMap<String, String>, // Mapping of system contacts: version -> address
}

impl Dispatcher {
    pub async fn start(&mut self) -> anyhow::Result<()> {
        tracing::trace!("Start of dispatcher");
        let mut args = std::env::args().collect::<Vec<String>>();
        if args.len() < 3 {
            anyhow::bail!("Wrong number of arguments.");
        }

        self.init_remotes().await?;

        // zero arg is always current binary path, we don't need it
        args.remove(0);

        let highest = self.get_highest_repo_version(args.clone()).await?;
        if !self
            .remotes_map
            .keys()
            .collect::<Vec<&String>>()
            .contains(&&highest)
        {
            return Err(anyhow::format_err!(
                "No git-remote-gosh version capable to work with repo version {highest} was found."
            ));
        }
        get_new_args(&mut args, self.system_contracts.get(&highest).unwrap())?;
        self.start_messages_interchange(highest, args).await
    }

    async fn init_remotes(&mut self) -> anyhow::Result<()> {
        tracing::trace!("Dispatcher: init remotes");
        let paths_from_ini = load_remote_versions_from_ini()?;
        for helper_path in paths_from_ini {
            match GoshRemote::new(&helper_path).await {
                Ok(gosh_remote) => {
                    self.remotes_map
                        .insert(gosh_remote.version().to_string(), Box::new(gosh_remote));
                }
                Err(_) => {
                    eprintln!(
                        "Warning: binary {} from dispatcher ini is missing or not accessible.",
                        helper_path
                    );
                }
            };
        }
        tracing::trace!("Dispatcher remotes map: {:?}", self.remotes_map);
        if self.remotes_map.is_empty() {
            anyhow::bail!("No git-remote-gosh versions were found. Download git-remote-gosh binary and add path to it to ini file");
        }
        Ok(())
    }

    async fn get_highest_repo_version(&mut self, args: Vec<String>) -> anyhow::Result<String> {
        tracing::trace!("Obtaining highest repo version");
        for remote in self.remotes_map.values() {
            tracing::trace!("Run {:?}", remote);
            if let Ok(versions) = remote.get_repo_versions(args.clone()).await {
                tracing::trace!("Got versions: {:?}", versions);
                if !versions.is_empty() {
                    let mut parse = versions
                        .iter()
                        .map(|s| {
                            let mut iter = s.split(' ');
                            (
                                Version::from(iter.next().unwrap_or("Unknown")).unwrap(),
                                iter.next().unwrap_or("").to_string(),
                            )
                        })
                        .collect::<Vec<(Version, String)>>();
                    parse.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(Ordering::Equal));
                    for version in parse.clone() {
                        self.system_contracts
                            .insert(version.0.to_string(), version.1);
                    }

                    return Ok(parse.last().map(|val| val.0.to_string()).unwrap());
                }
            }
        }

        anyhow::bail!("Failed to query the highest repository version. Please check that your local GOSH config has valid network settings.");
    }

    async fn start_messages_interchange(
        &mut self,
        highest: String,
        mut args: Vec<String>,
    ) -> anyhow::Result<()> {
        tracing::trace!("Start dispatcher message interchange");
        // let mut map: HashMap<String, Vec<String>> = HashMap::new();
        // for (version, sha) in fetch_result {
        //     map.entry(version).or_insert(vec![]).push(sha);
        // }
        // let map = format!("{map:?}").replace(" ", "");
        // let out_str = format!("dispatcher fetch {name} {map}");
        let mut lines = BufReader::new(io::stdin()).lines();

        let mut process = self
            .remotes_map
            .get_mut(&highest)
            .ok_or(anyhow::format_err!(
                "There was no git-remote-gosh binary found for version: {highest}"
            ))?
            .clone();
        process.start(args.clone()).await?;

        while let Some(input_line) = lines.next_line().await? {
            self.commands.push((highest.clone(), input_line));
            loop {
                if self.commands.is_empty() {
                    break;
                }
                let (version, cmd) = self.commands.pop().unwrap();
                if version != process.version() {
                    process.try_wait().await?;
                    get_new_args(
                        &mut args,
                        self.system_contracts
                            .get(&version)
                            .ok_or(anyhow::format_err!(
                                "Failed to get system contract address for version {version}"
                            ))?,
                    )?;
                    process = self
                        .remotes_map
                        .get_mut(&version)
                        .ok_or(anyhow::format_err!(
                            "There was no git-remote-gosh binary found for version: {version}"
                        ))?
                        .clone();
                    process.start(args.clone()).await?;
                }
                process.write(&cmd).await?;
                let output = process.wait_output().await?;
                if !output.is_empty() && output[0].starts_with("dispatcher") {
                    self.process_remote_callback(&output[0])?;
                    continue;
                }
                write_output(&output).await?;
            }
        }
        process.try_wait().await?;
        Ok(())
    }

    fn process_remote_callback(&mut self, remote_callback: &str) -> anyhow::Result<()> {
        let mut parser = remote_callback.split(' ');
        // skip 1 part
        parser.next();
        let first = parser
            .next()
            .ok_or(anyhow::format_err!("Failed to parse remote answer"))?;
        if first == "fetch" {
            // new version of protocol
            //new
            // callback string = dispatcher fetch refs/heads/main {"1.0.0:["sha1","sha2"]}
            let fetch_ref = parser.next().unwrap();
            let map = parser.next().unwrap();
            let map: HashMap<String, Vec<String>> = serde_json::from_str(map)
                .map_err(|e| anyhow::format_err!("Failed to parse remote answer: {}", e))?;
            for (version, sha_vec) in map {
                for sha in sha_vec {
                    self.commands
                        .push((version.clone(), format!("fetch {sha} {fetch_ref}")));
                }
            }
        } else {
            // old
            // callback string = dispatcher 1.0.0 fetch eeb077143f2d278dcf1628a5cee69c4aa52d62af refs/heads/main
            let version = first.to_string();
            let cmd = format!(
                "{} {} {}",
                parser.next().unwrap(),
                parser.next().unwrap(),
                parser.next().unwrap()
            );
            self.commands.push((version, cmd));
        }
        Ok(())
    }
}
