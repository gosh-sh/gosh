use async_trait::async_trait;
use reqwest::multipart;
use reqwest_tracing::TracingMiddleware;
use serde::Deserialize;
use std::{error::Error, marker::Send, marker::Sync, path::Path, time::Duration};
use tokio::fs::File;
use tokio_retry::{strategy::ExponentialBackoff, Retry};

type HttpClient = reqwest_middleware::ClientWithMiddleware;

static MAX_RETRIES: usize = 20;
static MAX_RETRY_DURATION: Duration = Duration::from_secs(30);

#[derive(Debug, Deserialize)]
struct SaveRes {
    #[serde(alias = "Hash")]
    hash: String,
}

#[derive(Debug)]
pub struct IpfsService {
    pub ipfs_endpoint_address: String,
    pub http_client: HttpClient,
}

pub trait IpfsInfo {
    fn get_ipfs_endpoint(&self) -> String;
    fn get_http_client(&self) -> HttpClient;
}

#[async_trait]
pub trait IpfsSave {
    async fn save_blob(&self, blob: &[u8]) -> anyhow::Result<String>;
    async fn save_file(&self, path: impl AsRef<Path> + Send + Sync) -> anyhow::Result<String>;
}

#[async_trait]
pub trait IpfsLoad {
    async fn load(&self, cid: &str) -> anyhow::Result<Vec<u8>>;
}

impl IpfsService {
    /// Creates a new [`IpfsService`].
    /// # Panics
    ///
    /// This method panics if a TLS backend cannot be initialized, or the resolver
    /// cannot load the system configuration.
    ///
    /// Use [`IpfsService::build()`] if you wish to handle the failure as an `Error`
    /// instead of panicking.
    pub fn new(ipfs_endpoint_address: &str) -> Self {
        Self {
            ipfs_endpoint_address: ipfs_endpoint_address.to_owned(),
            http_client: reqwest_middleware::ClientBuilder::new(reqwest::Client::new()).build(),
        }
    }

    ///
    pub fn build(ipfs_endpoint_address: &str) -> anyhow::Result<Self> {
        let reqwest_client = reqwest::Client::builder().build()?;

        Ok(Self {
            ipfs_endpoint_address: ipfs_endpoint_address.to_owned(),
            // WARNING:
            // reqwest_retry doesn't work with streaming data
            http_client: reqwest_middleware::ClientBuilder::new(reqwest_client)
                // Trace HTTP requests. See the tracing crate to make use of these traces.
                .with(TracingMiddleware::default())
                // .with(RetryTransientMiddleware::new_with_policy(
                //     ExponentialBackoff::builder()
                //         .retry_bounds(Duration::from_secs(1), Duration::from_secs(60))
                //         .build_with_max_retries(10),
                // ))
                .build(),
        })
    }

    fn retry_strategy(&self) -> impl Iterator<Item = Duration> {
        // TODO: parametrize the retry strategy via builder and take from self
        ExponentialBackoff::from_millis(100)
            .factor(3)
            .max_delay(MAX_RETRY_DURATION)
            .map(|d| {
                log::info!("Retry in {d:?} ...");
                d
            })
            .take(MAX_RETRIES)
    }

    async fn save_body<U, B>(cli: &HttpClient, url: U, body: B) -> anyhow::Result<String>
    where
        U: reqwest::IntoUrl,
        B: Into<reqwest::Body>,
    {
        let part = multipart::Part::stream(body);
        let form = multipart::Form::new().part("file", part);
        let response = cli.post(url).multipart(form).send().await?;
        let response_body = response.json::<SaveRes>().await?;
        Ok(response_body.hash)
    }

    async fn save_blob_retriable(
        cli: &HttpClient,
        url: &str,
        blob: &[u8],
    ) -> anyhow::Result<String> {
        // TODO: to_owned is not really necessary since reqwest doesn't modify body
        // so may be there's more clever way to not to copy blob
        IpfsService::save_body(cli, url, blob.to_owned()).await
    }

    async fn save_file_retriable(
        cli: &HttpClient,
        url: &str,
        path: impl AsRef<Path>,
    ) -> anyhow::Result<String> {
        // in case of file upload usually you want to store metadata, but:
        // 1) reqwest async has no support for file
        // 2) we actually don't need it since we don't want to store metadata for a file in IPFS
        let file = File::open(path).await?;
        let body = reqwest::Body::from(file);
        IpfsService::save_body(cli, url, body).await
    }

    async fn load_retriable(cli: &HttpClient, url: &str) -> anyhow::Result<Vec<u8>> {
        log::info!("loading from: {}", url);
        let response = cli.get(url).send().await?;
        log::info!("Got response: {:?}", response);
        let response_body = response.bytes().await?;
        Ok(Vec::from(&response_body[..]))
    }
}

#[async_trait]
impl IpfsSave for IpfsService {
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

#[async_trait]
impl IpfsLoad for IpfsService {
    async fn load(&self, cid: &str) -> anyhow::Result<Vec<u8>> {
        let url = format!("{}/ipfs/{cid}", self.ipfs_endpoint_address);

        Retry::spawn(self.retry_strategy(), || {
            IpfsService::load_retriable(&self.http_client, &url)
        })
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ser_test() {
        let s = r#"{"Hash": "1"}"#;
        assert!(serde_json::from_str::<SaveRes>(s).is_ok());
    }
}
