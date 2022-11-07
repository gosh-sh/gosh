use crate::blockchain::{
    call::BlockchainCall, contract::ContractInfo, Everscale, GoshBlobBitFlags,
};
use async_trait::async_trait;
use git_object;
use git_object::tree;
use std::collections::HashMap;

#[derive(Serialize, Debug)]
pub struct TreeNode {
    flags: String,
    mode: String,
    #[serde(rename = "typeObj")]
    pub type_obj: String,
    name: String,
    sha1: String,
    sha256: String,
}

#[derive(Serialize, Debug)]
pub struct DeployTreeArgs {
    #[serde(rename = "shaTree")]
    pub sha: String,
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "datatree")]
    nodes: HashMap<String, TreeNode>,
    ipfs: Option<String>,
}

#[async_trait]
pub trait DeployTree {
    async fn deploy_tree<W>(
        &self,
        wallet: &W,
        sha: &str,
        repo_name: &str,
        nodes: HashMap<String, TreeNode>,
    ) -> anyhow::Result<()>
    where
        W: ContractInfo + Sync + 'static;
}

#[async_trait]
impl DeployTree for Everscale {
    async fn deploy_tree<W>(
        &self,
        wallet: &W,
        sha: &str,
        repo_name: &str,
        nodes: HashMap<String, TreeNode>,
    ) -> anyhow::Result<()>
    where
        W: ContractInfo + Sync + 'static,
    {
        let params = DeployTreeArgs {
            sha: sha.to_owned(),
            repo_name: repo_name.to_owned(),
            nodes,
            ipfs: None, // !!!
        };

        self.call(wallet, "deployTree", Some(serde_json::to_value(params)?))
            .await
            .map(|_| ())
    }
}

impl<'a> From<(String, &'a tree::EntryRef<'a>)> for TreeNode {
    fn from((sha256, entry): (String, &tree::EntryRef)) -> Self {
        Self {
            flags: (GoshBlobBitFlags::Compressed as u8).to_string(),
            mode: std::str::from_utf8(entry.mode.as_bytes())
                .unwrap()
                .to_owned(),
            type_obj: convert_to_type_obj(entry.mode),
            name: entry.filename.to_string(),
            sha1: entry.oid.to_hex().to_string(),
            sha256,
        }
    }
}

fn convert_to_type_obj(entry_mode: tree::EntryMode) -> String {
    use git_object::tree::EntryMode::*;
    match entry_mode {
        Tree => "tree",
        Blob => "blob",
        BlobExecutable => "blobExecutable",
        Link => "link",
        Commit => "commit",
    }
    .to_owned()
}
