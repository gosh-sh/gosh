use super::IpfsService;
use crate::ipfs::service::FileSave;
use crate::ipfs::IpfsError;
use async_trait::async_trait;
use std::path::Path;
use tokio_retry::Retry;

#[async_trait]
impl FileSave for IpfsService {
    #[instrument(level = "info", skip_all)]
    async fn save_blob(&self, blob: &[u8]) -> anyhow::Result<String> {
        tracing::debug!("Uploading blob to IPFS");

        let url = format!(
            "{}/api/v0/add?pin=true&quiet=true",
            self.ipfs_endpoint_address,
        );

        // TODO: add condition for expired cert error
        let res = Retry::spawn(self.retry_strategy(), || async {
            IpfsService::save_blob_retriable(&self.http_client, &url, blob)
                .await
                .map_err(|e| {
                    tracing::warn!("Attempt failed with {:#?}", e);
                    e
                })
        })
        .await;
        match res {
            Err(_) => {
                anyhow::bail!(IpfsError::SaveToIpfsError)
            }
            Ok(res) => Ok(res),
        }
    }

    #[instrument(level = "info", skip_all)]
    async fn save_file(&self, path: impl AsRef<Path> + Send + Sync) -> anyhow::Result<String> {
        tracing::trace!(
            "Uploading file to IPFS: {}",
            path.as_ref().to_string_lossy()
        );

        let url = format!(
            "{}/api/v0/add?pin=true&quiet=true",
            self.ipfs_endpoint_address
        );

        Retry::spawn(self.retry_strategy(), || async {
            IpfsService::save_file_retriable(&self.http_client, &url, &path)
                .await
                .map_err(|e| {
                    tracing::warn!("Attempt failed with {:#?}", e);
                    e
                })
        })
        .await
    }
}
