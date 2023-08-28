mod load;
mod save;
pub mod service;

use reqwest::multipart;
use reqwest_tracing::{OtelName, TracingMiddleware};
use serde::Deserialize;
use std::fmt::Debug;
use std::{path::Path, time::Duration};
use thiserror::Error;
use tokio::fs::File;
use tokio_retry::strategy::ExponentialBackoff;
use tracing::Instrument;

type MiddlewareHttpClient = reqwest_middleware::ClientWithMiddleware;

static MAX_RETRIES: usize = 20;
static MAX_RETRY_DURATION: Duration = Duration::from_secs(30);

#[derive(Error, Debug)]
pub enum IpfsError {
    #[error("Failed to access ipfs")]
    SaveToIpfsError,
}

#[derive(Debug, Deserialize)]
struct SaveRes {
    #[serde(alias = "Hash")]
    hash: String,
}

#[derive(Builder, Debug, Clone)]
pub struct IpfsService<HttpClient = MiddlewareHttpClient> {
    ipfs_endpoint_address: String,
    http_client: HttpClient,
}

pub trait IpfsConfig<HttpClient> {
    fn ipfs_endpoint(&self) -> &String;
    fn http_client(&self) -> &HttpClient;
}

impl IpfsConfig<MiddlewareHttpClient> for IpfsService {
    fn ipfs_endpoint(&self) -> &String {
        &self.ipfs_endpoint_address
    }
    fn http_client(&self) -> &MiddlewareHttpClient {
        &self.http_client
    }
}

pub fn build_ipfs(endpoint: &str) -> anyhow::Result<IpfsService> {
    let mut ipfs_builder = IpfsServiceBuilder::default();
    ipfs_builder.ipfs_endpoint_address(endpoint.to_owned());

    let http_client = reqwest_middleware::ClientBuilder::new(reqwest::Client::builder().build()?)
        .with_init(reqwest_middleware::Extension(OtelName(
            "ipfs_reqwest".into(),
        )))
        .with(TracingMiddleware::default())
        .build();

    ipfs_builder.http_client(http_client);

    Ok(ipfs_builder.build()?)
}

impl IpfsService<MiddlewareHttpClient> {
    fn retry_strategy(&self) -> impl Iterator<Item = Duration> {
        // TODO: parametrize the retry strategy via builder and take from self
        ExponentialBackoff::from_millis(100)
            .factor(3)
            .max_delay(MAX_RETRY_DURATION)
            .map(|d| {
                tracing::info!("Retry in {d:?} ...");
                d
            })
            .take(MAX_RETRIES)
    }

    #[instrument(level = "info", skip_all)]
    async fn save_body<U, B>(cli: &MiddlewareHttpClient, url: U, body: B) -> anyhow::Result<String>
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

    #[instrument(level = "info", skip_all)]
    async fn save_blob_retriable(
        cli: &MiddlewareHttpClient,
        url: &str,
        blob: &[u8],
    ) -> anyhow::Result<String> {
        tracing::trace!("save_blob_retriable: url={url}");
        // TODO: to_owned is not really necessary since reqwest doesn't modify body
        // so may be there's more clever way to not to copy blob
        IpfsService::save_body(cli, url, blob.to_owned()).await
    }

    #[instrument(level = "info", skip_all)]
    async fn save_file_retriable(
        cli: &MiddlewareHttpClient,
        url: &str,
        path: impl AsRef<Path>,
    ) -> anyhow::Result<String> {
        tracing::trace!("save_file_retriable: url={url}");
        // in case of file upload usually you want to store metadata, but:
        // 1) reqwest async has no support for file
        // 2) we actually don't need it since we don't want to store metadata for a file in IPFS
        let file = File::open(path).await?;
        let body = reqwest::Body::from(file);
        IpfsService::save_body(cli, url, body).await
    }

    #[instrument(level = "trace", skip_all)]
    async fn load_retriable(cli: &MiddlewareHttpClient, url: &str) -> anyhow::Result<Vec<u8>> {
        tracing::info!("loading from: {}", url);
        let response = cli.get(url).send().await?;
        tracing::info!("Got response: {:?}", response);
        let response_body = response
            .bytes()
            .instrument(info_span!("decode_response").or_current())
            .await?;
        Ok(Vec::from(&response_body[..]))
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
