use crate::blockchain::contract::ContractInfo;
use crate::blockchain::user_wallet::UserWallet;
use crate::blockchain::{call::BlockchainCall, Everscale, GoshBlobBitFlags};
use async_trait::async_trait;
use git_object;
use git_object::tree;
use std::collections::HashMap;
use std::ops::Deref;

#[derive(Serialize, Debug, Clone)]
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
    async fn deploy_tree(
        &self,
        wallet: &UserWallet,
        sha: &str,
        repo_name: &str,
        nodes: &HashMap<String, TreeNode>,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl DeployTree for Everscale {
    async fn deploy_tree(
        &self,
        wallet: &UserWallet,
        sha: &str,
        repo_name: &str,
        nodes: &HashMap<String, TreeNode>,
    ) -> anyhow::Result<()> {
        let params = DeployTreeArgs {
            sha: sha.to_owned(),
            repo_name: repo_name.to_owned(),
            nodes: nodes.to_owned(),
            ipfs: None, // !!!
        };
        tracing::trace!("DeployTreeArgs: {params:?}");
        let wallet_contract = wallet.take_one().await?;
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());
        let result = self
            .send_message(
                wallet_contract.deref(),
                "deployTree",
                Some(serde_json::to_value(params)?),
                None,
            )
            .await
            .map(|_| ());
        drop(wallet_contract);
        if let Err(ref e) = result {
            tracing::debug!("deploy_tree_error: {}", e);
        }
        result
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
