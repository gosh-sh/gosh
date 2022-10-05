use git_remote_gosh::ipfs::{IpfsLoad, IpfsSave, IpfsService};
use std::env;
use tokio::fs::{remove_file, OpenOptions};

const IPFS_HTTP_ENDPOINT_FOR_TESTS: &str = "https://ipfs.network.gosh.sh";

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
async fn save_file() {
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
