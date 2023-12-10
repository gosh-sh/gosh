use super::IpfsService;
use async_trait::async_trait;
use std::fmt::Debug;
use std::path::Path;

#[async_trait]
pub trait FileLoad {
    async fn load(&self, cid: &str) -> anyhow::Result<Vec<u8>>;
}

#[async_trait]
pub trait FileSave {
    async fn save_blob(&self, blob: &[u8]) -> anyhow::Result<String>;
    async fn save_file(&self, path: impl AsRef<Path> + Send + Sync) -> anyhow::Result<String>;
}

#[async_trait]
pub trait FileStorage: Debug + FileSave + FileLoad {}

impl FileStorage for IpfsService {}
