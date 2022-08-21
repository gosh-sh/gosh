use crate::abi as gosh_abi;
use crate::blockchain::{GoshContract, Number, TonClient};
use ::git_object;
use data_contract_macro_derive::DataContract;
use std::collections::HashMap;
use std::error::Error;

#[derive(Deserialize, Debug)]
pub struct TreeComponent {
    pub flags: Number,
    pub mode: String,
    #[serde(rename = "typeObj")]
    pub type_obj: String,
    pub name: String,
    pub sha1: String,
    pub sha256: String,
}

#[derive(Deserialize, Debug, DataContract)]
#[abi = "tree.abi.json"]
#[abi_data_fn = "gettree"]
pub struct Tree {
    #[serde(rename = "value0")]
    pub objects: HashMap<String, TreeComponent>,
    #[serde(rename = "value1")]
    ipfs: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GetTreeResult {
    #[serde(rename = "value0")]
    address: String,
}

impl Tree {
    pub async fn calculate_address(
        context: &TonClient,
        repository_address: &str,
        tree_obj_sha1: &str,
    ) -> Result<String, Box<dyn Error>> {
        let repo_contract = GoshContract::new(repository_address, gosh_abi::REPO);
        let params = serde_json::json!({
            "treeName": tree_obj_sha1
        });
        let result: GetTreeResult = repo_contract
            .run_local(context, "getTreeAddr", Some(params))
            .await?;
        return Ok(result.address);
    }
}

impl Into<git_object::tree::Entry> for TreeComponent {
    fn into(self) -> git_object::tree::Entry {
        let mode = match self.type_obj.as_str() {
            "tree" => git_object::tree::EntryMode::Tree,
            "blob" => git_object::tree::EntryMode::Blob,
            "blobExecutable" => git_object::tree::EntryMode::BlobExecutable,
            "link" => git_object::tree::EntryMode::Link,
            "commit" => git_object::tree::EntryMode::Commit,
            _ => unreachable!(),
        };
        let filename = self.name.into();
        let oid = git_hash::ObjectId::from_hex(self.sha1.as_bytes()).expect("SHA1 must be correct");
        return git_object::tree::Entry {
            mode,
            filename,
            oid,
        };
    }
}

impl Into<git_object::Tree> for Tree {
    fn into(self) -> git_object::Tree {
        let mut entries: Vec<git_object::tree::Entry> =
            self.objects.into_values().map(|e| e.into()).collect();
        entries.sort();
        return git_object::Tree { entries };
    }
}
