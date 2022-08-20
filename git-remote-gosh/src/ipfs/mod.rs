use reqwest::multipart;
use reqwest_middleware;
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};

use serde::Deserialize;
use std::{error::Error, path::Path, time::Duration};

use tokio::{fs::File, io::AsyncReadExt};

#[derive(Debug, Deserialize)]
struct SaveRes {
    #[serde(alias = "Hash")]
    hash: String,
}

#[derive(Debug)]
pub struct IpfsService {
    pub ipfs_endpoint_address: String,
    pub cli: reqwest_middleware::ClientWithMiddleware,
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
            cli: reqwest_middleware::ClientWithMiddleware::new(reqwest::Client::new(), Vec::new()),
        }
    }

    ///
    pub(crate) fn build(ipfs_endpoint_address: &str) -> Result<Self, Box<dyn Error>> {
        Ok(Self {
            ipfs_endpoint_address: ipfs_endpoint_address.to_owned(),
            cli: reqwest_middleware::ClientBuilder::new(reqwest::Client::builder().build()?)
                .with(RetryTransientMiddleware::new_with_policy(
                    ExponentialBackoff::builder()
                        .retry_bounds(Duration::from_secs(1), Duration::from_secs(60))
                        .build_with_max_retries(10),
                ))
                .build(),
        })
    }

    pub(crate) async fn save<T>(&self, filename: T) -> Result<String, Box<dyn Error>>
    where
        T: AsRef<Path> + std::fmt::Debug,
    {
        log::debug!("Uploading {filename:?}");

        let url = format!(
            "{}/api/v0/add?pin=true&quiet=true",
            self.ipfs_endpoint_address
        );

        let mut file = File::open(filename).await?;

        // TODO: rewrite with stream api
        let mut contents = vec![];
        file.read_to_end(&mut contents).await?;
        let part = multipart::Part::bytes(contents);

        let form = multipart::Form::new().part("file", part);

        let response = self.cli.post(&url).multipart(form).send().await?;
        let response_body = response.json::<SaveRes>().await?;
        Ok(response_body.hash)
    }

    pub(crate) async fn load(&self, cid: &str) -> Result<Vec<u8>, Box<dyn Error>> {
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
    #[tokio::test]
    async fn save_test() {
        let mut path = env::temp_dir();
        path.push("test");

        let mut res = OpenOptions::new()
            .create(true)
            .write(true)
            .open(&path)
            .await
            .is_ok();

        res &= if let Ok(ipfs) = IpfsService::build(IPFS_HTTP_ENDPOINT_FOR_TESTS) {
            if let Ok(cid) = ipfs.save(&path).await {
                eprintln!("CID = {cid}");
                ipfs.load(&cid).await.is_ok()
            } else {
                false
            }
        } else {
            false
        };

        assert!(remove_file(&path).await.is_ok());
        assert!(res);
    }
}
