use super::IpfsService;
use crate::ipfs::service::FileSave;
use async_trait::async_trait;
use tokio_retry::Retry;
use std::path::Path;

#[async_trait]
impl FileSave for IpfsService {
    async fn save_blob(&self, blob: &[u8]) -> anyhow::Result<String> {
        log::debug!("Uploading blob to IPFS");

        let url = format!(
            "{}/api/v0/add?pin=true&quiet=true",
            self.ipfs_endpoint_address,
        );

        Retry::spawn(self.retry_strategy(), || {
            IpfsService::save_blob_retriable(&self.http_client, &url, blob)
        })
            .await
    }

    async fn save_file(&self, path: impl AsRef<Path> + Send + Sync) -> anyhow::Result<String> {
        log::debug!(
            "Uploading file to IPFS: {}",
            path.as_ref().to_string_lossy()
        );

        let url = format!(
            "{}/api/v0/add?pin=true&quiet=true",
            self.ipfs_endpoint_address
        );

        Retry::spawn(self.retry_strategy(), || {
            IpfsService::save_file_retriable(&self.http_client, &url, &path)
        })
            .await
    }
}
