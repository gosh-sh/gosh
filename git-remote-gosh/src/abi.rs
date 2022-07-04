macro_rules! abi {
    ($file: expr) => {{
        // NOTE: Run `make copy_abi` in case of `No such file...` error
        include_str!(concat!("../resources/", $file))
    }};
}

pub static GOSH: &str = abi!("gosh.abi.json");
pub static WALLET: &str = abi!("goshwallet.abi.json");
pub static REPO: &str = abi!("repository.abi.json");
pub static COMMIT: &str = abi!("commit.abi.json");
pub static SNAPSHOT: &str = abi!("snapshot.abi.json");
pub static TREE: &str = abi!("tree.abi.json");

#[derive(serde::Serialize)]
struct GetCommitAddrArgs {
    #[serde(rename = "nameCommit")] 
    pub name_commit: String,
}

#[derive(serde::Serialize)]
struct GetBlobAddrArgs {
    #[serde(rename = "nameBlob")]
    pub name_blob: String,
}


pub fn get_commit_addr_args(sha: &str) -> Option<serde_json::Value> {
    Some(
        serde_json::to_value(GetCommitAddrArgs {
            name_commit: sha.to_owned(),
        })
        .unwrap(),
    )
}

pub fn get_blob_addr_args(kind: &str, sha: &str) -> Option<serde_json::Value> {
    Some(
        serde_json::to_value(GetBlobAddrArgs {
            name_blob: format!("{} {}", kind, sha),
        })
        .unwrap(),
    )
}
