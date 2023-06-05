pub mod constants;

use crate::common::write_output_as_bytes;
use crate::grpc::constants::GRPC_URL;
use gosh_builder_grpc_api::proto::git_remote_gosh_client::GitRemoteGoshClient;
use gosh_builder_grpc_api::proto::{CommandRequest, GetArchiveRequest, SpawnRequest};
use tar::Archive;
use tokio::io;
use tokio::io::{AsyncBufReadExt, BufReader};
use zstd::Decoder;

// TODO: impl as trait

pub async fn grpc_mode() -> anyhow::Result<()> {
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
        write_output_as_bytes(&res.get_ref().body).await?;
    }
    Ok(())
}
