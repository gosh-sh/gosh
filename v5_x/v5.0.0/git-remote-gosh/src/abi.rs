macro_rules! abi {
    ($file: expr) => {
        // NOTE: Run `make copy_abi` in case of `No such file...` error
        ($file, include_str!(concat!("../resources/", $file)))
    };
}

type Abi = (&'static str, &'static str);

pub static DAO: Abi = abi!("goshdao.abi.json");
pub static GOSH: Abi = abi!("systemcontract.abi.json");
pub static WALLET: Abi = abi!("goshwallet.abi.json");
pub static REPO: Abi = abi!("repository.abi.json");
pub static COMMIT: Abi = abi!("commit.abi.json");
pub static SNAPSHOT: Abi = abi!("snapshot.abi.json");
pub static TREE: Abi = abi!("tree.abi.json");
pub static DIFF: Abi = abi!("diff.abi.json");
pub static VERSION_CONTROLLER: Abi = abi!("versioncontroller.abi.json");
pub static TAG: Abi = abi!("tag.abi.json");

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
