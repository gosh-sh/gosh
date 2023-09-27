use std::fmt;

use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

static GET_REPO_VERSIONS_COMMAND: &str = "gosh_get_all_repo_versions";
static REMOTE_DISPATCHER_OPTION: &str = "--dispatcher";
static DISPATCHER_ENDL: &str = "endl";

pub struct GoshRemote {
    path: String,
    process: Option<Child>,
    version: String,
}

impl fmt::Debug for GoshRemote {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let process = match self.process {
            Some(_) => "Some(_)",
            None => "None",
        }
        .to_string();
        f.debug_struct("GoshRemote")
            .field("path", &self.path)
            .field("version", &self.version)
            .field("process", &process)
            .finish()
    }
}

impl Clone for GoshRemote {
    fn clone(&self) -> Self {
        GoshRemote {
            path: self.path.clone(),
            process: None,
            version: self.version.clone(),
        }
    }
}

impl GoshRemote {
    pub async fn new(path: &str) -> anyhow::Result<Self> {
        let out = Command::new(path)
            .arg("supported_contract_version")
            .output()
            .await?;
        let supported_version = String::from_utf8_lossy(&out.stdout)
            .split('\"')
            .collect::<Vec<&str>>()
            .get(1)
            .map(|s| s.to_string())
            .ok_or(anyhow::format_err!("Failed to get supported version"))?;
        Ok(Self {
            path: path.to_string(),
            process: None,
            version: supported_version,
        })
    }

    pub fn version(&self) -> &str {
        &self.version
    }

    pub async fn write(&mut self, input: &str) -> anyhow::Result<()> {
        tracing::trace!("Write to remote: {} <- {}", self.path, input);
        match self.process.as_mut() {
            Some(process) => {
                tracing::trace!("send input: {input}");
                if let Some(stdin) = process.stdin.as_mut() {
                    stdin.write_all(format!("{input}\n").as_bytes()).await?;
                    stdin.flush().await?;
                } else {
                    panic!("Failed to take stdin");
                }
                Ok(())
            }
            None => {
                anyhow::bail!("git-remote-gosh process is not running");
            }
        }
    }

    pub async fn get_repo_versions(&self, args: Vec<String>) -> anyhow::Result<Vec<String>> {
        tracing::trace!("git-remote-gosh get repo version");
        let mut process = Command::new(&self.path)
            .args(args.clone())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
        let mut stdin = process
            .stdin
            .take()
            .ok_or(anyhow::format_err!("Failed to take stdin of child process"))?;
        let output = process.stdout.take().ok_or(anyhow::format_err!(
            "Failed to take stdout of child process"
        ))?;
        stdin
            .write_all(format!("{}\n\n", GET_REPO_VERSIONS_COMMAND).as_bytes())
            .await?;
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
        let status = process.wait().await?;
        let exit_code = status
            .code()
            .ok_or(anyhow::format_err!("Failed to get child process exit code"))?;
        if exit_code != 0 {
            anyhow::bail!("Child process returned an error: {exit_code}");
        }
        Ok(result)
    }

    pub async fn start(&mut self, args: Vec<String>) -> anyhow::Result<()> {
        tracing::trace!("Start remote: {}", self.path);
        self.process = Some(
            Command::new(&self.path)
                .args(args)
                .arg(REMOTE_DISPATCHER_OPTION)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .spawn()?,
        );
        Ok(())
    }

    pub async fn try_wait(&mut self) -> anyhow::Result<()> {
        tracing::trace!("Stop remote: {}", self.path);
        match &mut self.process {
            Some(remote) => {
                let code = remote.try_wait()?;
                tracing::trace!("Remote exited with code: {code:?}");
                if let Some(Some(exit_code)) = code.map(|code| code.code()) {
                    if exit_code != 0 {
                        std::process::exit(exit_code);
                    }
                }
                Ok(())
            }
            None => Ok(()),
        }
    }

    pub async fn wait_output(&mut self) -> anyhow::Result<Vec<String>> {
        tracing::trace!("Waiting for output: {}", self.path);
        let mut output = vec![];
        let out = self
            .process
            .as_mut()
            .and_then(|helper| helper.stdout.as_mut())
            .ok_or(anyhow::format_err!(
                "Failed to get child process out stream"
            ))?;
        let reader = BufReader::new(out);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            tracing::trace!("caught output line: {line}");
            if line == DISPATCHER_ENDL {
                break;
            }
            if line.starts_with("dispatcher") {
                output.clear();
                output.push(line);
                break;
            }
            output.push(line.clone());
        }
        self.try_wait().await?;
        Ok(output)
    }
}
