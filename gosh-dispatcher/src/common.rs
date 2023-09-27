use tokio::io;
use tokio::io::AsyncWriteExt;

pub async fn write_output(output: &Vec<String>) -> anyhow::Result<()> {
    if !output.is_empty() {
        tracing::trace!("Output lines buffer: {output:?}");
        let mut buffer = vec![];
        for line in output {
            tracing::trace!("append to buffer: '{line}'");
            buffer.append(&mut format!("{line}\n").as_bytes().to_vec());
        }
        io::stdout().write_all(&buffer).await?;
        io::stdout().flush().await?;
    }
    Ok(())
}

pub fn get_new_args(args: &mut [String], system_contract_address: &str) -> anyhow::Result<()> {
    let old_system = args[1]
        .split("://")
        .collect::<Vec<&str>>()
        .get(1)
        .ok_or(anyhow::format_err!("Wrong amount of args"))?
        .split('/')
        .collect::<Vec<&str>>()
        .first()
        .ok_or(anyhow::format_err!("Wrong remote url format"))?
        .to_string();
    let new_repo_link = args[1]
        .clone()
        .replace(&old_system, system_contract_address);
    tracing::trace!("New repo link: {new_repo_link}");
    args[1] = new_repo_link;
    Ok(())
}
