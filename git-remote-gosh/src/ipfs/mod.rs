use futures::stream;
use reqwest::multipart;
use reqwest_tracing::TracingMiddleware;
use serde::Deserialize;
use std::{error::Error, path::Path, time::Duration};
use tokio::fs::File;
use tokio_retry::{strategy::ExponentialBackoff, Retry};

type Result<T> = std::result::Result<T, Box<dyn Error>>;
type Client = reqwest_middleware::ClientWithMiddleware;

static MAX_RETRIES: usize = 10;
static MAX_RETRY_DURATION: Duration = Duration::from_secs(10);

#[derive(Debug, Deserialize)]
struct SaveRes {
    #[serde(alias = "Hash")]
    hash: String,
}

#[derive(Debug)]
pub struct IpfsService {
    pub ipfs_endpoint_address: String,
    pub cli: Client,
}

fn default_retry_strategy() -> ExponentialBackoff {
    ExponentialBackoff::from_millis(100)
        .factor(3)
        .max_delay(MAX_RETRY_DURATION)
}

async fn save_retriable(cli: &Client, url: &str, path: impl AsRef<Path>) -> Result<String> {
    // 1) reqwest async has no support for file
    // 2) we actually don't need it since we don't want to store metadata for a file in IPFS
    let file = File::open(path).await?;
    let body = reqwest::Body::from(file);
    ipfs_save(cli, url, body).await
}

async fn save_blob_retriable(cli: &Client, url: &str, blob: &[u8]) -> Result<String> {
    ipfs_save(cli, url, blob.to_owned()).await
}

async fn ipfs_save<U, B>(cli: &Client, url: U, body: B) -> Result<String>
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
            cli: reqwest_middleware::ClientBuilder::new(reqwest::Client::new()).build(),
        }
    }

    ///
    pub fn build(ipfs_endpoint_address: &str) -> Result<Self> {
        let client = reqwest::Client::builder().build()?;

        Ok(Self {
            ipfs_endpoint_address: ipfs_endpoint_address.to_owned(),
            // WARNING:
            // reqwest_retry doesn't work with streaming data
            cli: reqwest_middleware::ClientBuilder::new(client)
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

    #[instrument(level = "debug")]
    pub async fn save_blob(&self, blob: &[u8]) -> Result<String> {
        log::debug!("Uploading blob to IPFS");

        let url = format!(
            "{}/api/v0/add?pin=true&quiet=true",
            self.ipfs_endpoint_address,
        );

        let retry_strategy = default_retry_strategy()
            .map(|d| {
                log::info!("Retry in {d:?} ...");
                d
            })
            .take(MAX_RETRIES);

        Ok(Retry::spawn(retry_strategy, || {
            save_blob_retriable(&self.cli, &url, &blob)
        })
        .await?)
    }

    #[instrument(level = "debug")]
    pub async fn save<T>(&self, path: T) -> Result<String>
    where
        T: AsRef<Path> + std::fmt::Debug,
    {
        log::debug!(
            "Uploading file by path to IPFS: {}",
            path.as_ref().to_string_lossy().clone()
        );

        let url = format!(
            "{}/api/v0/add?pin=true&quiet=true",
            self.ipfs_endpoint_address
        );

        let retry_strategy = default_retry_strategy()
            .map(|d| {
                log::info!("Retry in {d:?} ...");
                d
            })
            .take(MAX_RETRIES);

        Ok(Retry::spawn(retry_strategy, || save_retriable(&self.cli, &url, &path)).await?)
    }

    #[instrument(level = "debug")]
    pub async fn load(&self, cid: &str) -> Result<Vec<u8>> {
        let url = format!("{}/ipfs/{cid}", self.ipfs_endpoint_address);
        log::info!("loading from: {}", url);
        let response = self.cli.get(url).send().await;
        log::info!("response obj: {:?}", response);
        let response = response?;
        log::info!("Got response: {:?}", response);
        let response_body = response.bytes().await?;
        Ok(Vec::from(&response_body[..]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use tokio::fs::{remove_file, OpenOptions};

    const IPFS_HTTP_ENDPOINT_FOR_TESTS: &str = "https://ipfs.network.gosh.sh";

    #[test]
    fn ser_test() {
        let s = r#"{"Hash": "1"}"#;
        assert!(serde_json::from_str::<SaveRes>(s).is_ok());
    }

    #[test_log::test(tokio::test)]
    async fn save_blob_test() {
        let blob = "fӅoAٲ";
        let ipfs = IpfsService::build(IPFS_HTTP_ENDPOINT_FOR_TESTS)
            .unwrap_or_else(|e| panic!("Can't build IPFS client: {e}"));
        let cid = ipfs
            .save_blob(blob.as_bytes())
            .await
            .unwrap_or_else(|e| panic!("Can't upload to ipfs: {e}"));

        eprintln!("CID = {cid}");
        let data = ipfs
            .load(&cid)
            .await
            .unwrap_or_else(|e| panic!("Failed to load from ipfs: {e}"));

        assert_eq!(data, blob.as_bytes());
    }

    #[test_log::test(tokio::test)]
    async fn save_test() {
        let mut path = env::temp_dir();
        path.push("test");

        OpenOptions::new()
            .create(true)
            .write(true)
            .open(&path)
            .await
            .unwrap_or_else(|e| panic!("Can't prepare test file: {e}"));

        let ipfs = IpfsService::build(IPFS_HTTP_ENDPOINT_FOR_TESTS)
            .unwrap_or_else(|e| panic!("Can't build IPFS client: {e}"));
        let cid = ipfs
            .save(&path)
            .await
            .unwrap_or_else(|e| panic!("Can't upload to ipfs: {e}"));

        eprintln!("CID = {cid}");
        let data = ipfs
            .load(&cid)
            .await
            .unwrap_or_else(|e| panic!("Failed to load from ipfs: {e}"));

        assert!(data.len() == 0);

        assert!(remove_file(&path).await.is_ok());
    }
}
