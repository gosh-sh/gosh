use git_remote_gosh::{
    ipfs::{
        build_ipfs,
        service::{FileLoad, FileSave},
    },
    logger::test_utils::{init_logger, shutdown_logger},
};

use std::env;
use tokio::fs::{remove_file, OpenOptions};
use tracing::trace_span;

const IPFS_HTTP_ENDPOINT_FOR_TESTS: &str = "https://ipfs.network.gosh.sh";

#[tokio::test]
async fn save_blob_test() {
    init_logger().await;
    {
        let span = trace_span!("test_ipfs_save_blob_test");
        let _guard = span.enter();
        let blob = "fӅoAٲ";
        let ipfs = build_ipfs(IPFS_HTTP_ENDPOINT_FOR_TESTS)
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
    shutdown_logger().await;
}

#[tokio::test]
async fn save_file() {
    init_logger().await;
    {
        let span = trace_span!("test_ipfs_save_file");
        let _guard = span.enter();
        let mut path = env::temp_dir();
        path.push("test");

        OpenOptions::new()
            .create(true)
            .write(true)
            .open(&path)
            .await
            .unwrap_or_else(|e| panic!("Can't prepare test file: {e}"));

        let ipfs = build_ipfs(IPFS_HTTP_ENDPOINT_FOR_TESTS)
            .unwrap_or_else(|e| panic!("Can't build IPFS client: {e}"));
        let cid = ipfs
            .save_file(&path)
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
    shutdown_logger().await;
}
