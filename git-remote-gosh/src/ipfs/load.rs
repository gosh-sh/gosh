use super::IpfsService;
use tokio_retry::Retry;
use async_trait::async_trait;
use crate::ipfs::service::FileLoad;

#[async_trait]
impl FileLoad for IpfsService {
    async fn load(&self, cid: &str) -> anyhow::Result<Vec<u8>> {
        let url = format!("{}/ipfs/{cid}", self.ipfs_endpoint_address);

        Retry::spawn(self.retry_strategy(), || {
            IpfsService::load_retriable(&self.http_client, &url)
        })
            .await
    }
}