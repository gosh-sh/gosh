use cached::once_cell::sync::Lazy;
use std::collections::HashMap;

use crate::blockchain::{branch_list, get_commit_by_addr, BlockchainContractAddress, EverClient};

const ZERO_COMMIT: &str = "0000000000000000000000000000000000000000";
// pub const EMPTY_TREE_SHA: &str = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"; // $ echo -n '' | git hash-object --stdin -t tree
// pub const EMPTY_BLOB_SHA: &str = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"; // $ echo -n '' | git hash-object --stdin -t blob

static FILEMODE: Lazy<HashMap<u32, &'static str>> = Lazy::new(|| {
    let mut map = HashMap::new();
    map.insert(0, "000000"); // 0000000000000000 (040000): No
    map.insert(16384, "040000"); // 0100000000000000 (040000): Directory
    map.insert(33188, "100644"); // 1000000110100100 (100644): Regular non-executable file
    map.insert(33204, "100664"); // 1000000110110100 (100664): Regular non-executable group-writeable file
    map.insert(33261, "100755"); // 1000000111101101 (100755): Regular executable file
    map.insert(40960, "120000"); // 1010000000000000 (120000): Symbolic link
    map.insert(57344, "160000"); // 1110000000000000 (160000): Gitlink
    map
});

/*
pub fn open_repo() -> anyhow::Result<Repository> {
    match Repository::open_from_env() {
        Ok(repo) => Ok(repo),
        Err(e) => Err(format!("error: failed to open local repository: {e}")),
    }
}
*/

// fn _object_data(repo: Repository, sha: &str) -> Option<Object> {
//     let odb = repo.odb().ok()?;
//     let oid = Oid::from_str(sha).ok()?;
//     let odb_object = odb.read(oid).ok()?;
//     let object_type = odb_object.kind();

//     match object_type {
//         ObjectType::Any => {
//             tracing::trace!("unsupported type: {} (sha: {})", object_type, sha);
//             None
//         }
//         ObjectType::Commit => {
//             tracing::trace!("unsupported type: {} (sha: {})", object_type, sha);
//             None
//         }
//         ObjectType::Tree => {
//             tracing::trace!("unsupported type: {} (sha: {})", object_type, sha);
//             None
//         }
//         ObjectType::Blob => {
//             tracing::trace!("unsupported type: {} (sha: {})", object_type, sha);
//             None
//         }
//         ObjectType::Tag => {
//             tracing::trace!("unsupported type: {} (sha: {})", object_type, sha);
//             None
//         }
//     }
// }

pub async fn get_refs(
    context: &EverClient,
    repo_addr: &BlockchainContractAddress,
) -> anyhow::Result<Option<Vec<String>>> {
    let _list = branch_list(context, repo_addr)
        .await
        .map_err(|e| anyhow::Error::from(e))?
        .branch_ref;
    if _list.is_empty() {
        return Ok(None);
    }

    let mut ref_list: Vec<String> = Vec::new(); //_list.iter().map(|branch| format!("<SHA> refs/heads/{}", branch.branch_name)).collect();
    for branch in _list {
        let _commit = get_commit_by_addr(context, &branch.commit_address)
            .await
            .unwrap()
            .unwrap();
        if _commit.sha != ZERO_COMMIT {
            ref_list.push(format!("{} refs/heads/{}", _commit.sha, branch.branch_name));
        }
    }
    Ok(Some(ref_list))
}

// pub fn ls_objects() {}

// pub fn is_object_exists() {}

// pub fn extract_refs() {}

// pub fn write_object() {}

// pub fn blob_prev_sha() {}
