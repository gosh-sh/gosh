use crate::blockchain::{
    self, call::BlockchainCall, contract::ContractInfo, user_wallet::UserWallet,
    BlockchainContractAddress, BlockchainService, Everscale, GoshBlobBitFlags, Tree,
};
use async_trait::async_trait;
use git_object;
use git_object::tree;
use std::collections::HashMap;
use std::ops::Deref;
use std::sync::Arc;

const MAX_RETRIES_FOR_CHUNKS_TO_APPEAR: i32 = 20;

#[derive(Serialize, Debug, Clone, Deserialize)]
pub struct TreeNode {
    flags: String,
    mode: String,
    #[serde(rename = "typeObj")]
    pub type_obj: String,
    name: String,
    sha1: String,
    sha256: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct DeployTreeArgs {
    #[serde(rename = "shaTree")]
    pub sha: String,
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "datatree")]
    nodes: HashMap<String, TreeNode>,
    number: u128,
}

#[derive(Serialize, Debug)]
pub struct DeployAddTreeArgs {
    #[serde(rename = "shaTree")]
    pub sha: String,
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "datatree")]
    nodes: HashMap<String, TreeNode>,
}

#[derive(Serialize, Debug, Clone)]
pub struct SetTreeFinishMarkArgs {
    #[serde(rename = "shaTree")]
    pub sha: String,
    #[serde(rename = "repoName")]
    pub repo_name: String,
}

#[async_trait]
pub trait DeployTree {
    async fn deploy_tree(
        &self,
        wallet: &UserWallet,
        sha: &str,
        tree_address: &str,
        repo_name: &str,
        nodes: &mut HashMap<String, TreeNode>,
        skip_deploy: bool,
    ) -> anyhow::Result<()>;
}

static TREE_NODES_CHUNK_MAX_SIZE: usize = 50;

#[async_trait]
impl DeployTree for Everscale {
    async fn deploy_tree(
        &self,
        wallet: &UserWallet,
        sha: &str,
        tree_address: &str,
        repo_name: &str,
        nodes: &mut HashMap<String, TreeNode>, // change to moved hashmap
        skip_deploy: bool, // don't deploy tree contract, just call deployAddTree
    ) -> anyhow::Result<()> {
        let wallet_contract = wallet.take_one().await?;
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());
        let nodes_cnt = nodes.len();
        let result = {
            tracing::trace!("Start tree upload by chunks");
            let mut repo_contract = self.repo_contract().clone();
            let tree_address =
                Tree::calculate_address(&Arc::clone(self.client()), &mut repo_contract, sha)
                    .await?;
            let mut nodes = nodes.to_owned();
            let chunk: HashMap<String, TreeNode> = HashMap::new();
            if skip_deploy {
                // check existing tree nodes
                let onchain_tree_object =
                    blockchain::Tree::load(self.client(), &tree_address).await?;
                nodes.retain(|k, _| !onchain_tree_object.objects.contains_key(k));
            } else {
                let params = DeployTreeArgs {
                    sha: sha.to_owned(),
                    repo_name: repo_name.to_owned(),
                    nodes: chunk,
                    number: nodes_cnt as u128,
                };
                tracing::trace!("DeployTreeArgs: {params:?}");
                self.send_message(
                    wallet_contract.deref(),
                    "deployTree",
                    Some(serde_json::to_value(params.clone())?),
                    None,
                )
                .await
                .map(|_| ())?;
            }
            while nodes.len() > 0 {
                let mut counter = 0;
                let chunk: HashMap<String, TreeNode>;
                (chunk, nodes) = nodes.into_iter().partition(|(_, _)| {
                    counter += 1;
                    counter <= TREE_NODES_CHUNK_MAX_SIZE
                });
                let params = DeployAddTreeArgs {
                    sha: sha.to_owned(),
                    repo_name: repo_name.to_owned(),
                    nodes: chunk,
                };
                tracing::trace!("DeployAddTreeArgs: {params:?}");
                self.send_message(
                    wallet_contract.deref(),
                    "deployAddTree",
                    Some(serde_json::to_value(params)?),
                    None,
                )
                .await
                .map(|_| ())?;
            }
            Ok(())
        };
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

#[instrument(level = "info", skip_all)]
async fn wait_for_all_chunks_to_be_loaded<B>(
    blockchain: &B,
    tree_address: &BlockchainContractAddress,
    nodes_cnt: usize,
) -> anyhow::Result<()>
where
    B: BlockchainService + 'static,
{
    tracing::trace!(
        "wait_for_all_chunks_to_be_loaded: tree_addr={:?}",
        tree_address
    );
    let mut counter = 0;
    while counter <= MAX_RETRIES_FOR_CHUNKS_TO_APPEAR {
        tracing::trace!("wait_for_all_chunks_to_be_loaded iteration: {counter}");
        let tree = Tree::load(blockchain.client(), tree_address).await?;
        tracing::trace!("Tree objects state: {:?}", tree);
        tracing::trace!(
            "Tree map length: {:?} (waiting length = {})",
            tree.objects.len(),
            nodes_cnt
        );
        if tree.objects.len() == nodes_cnt {
            return Ok(());
        }
        counter += 1;
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    }
    Err(anyhow::format_err!("Tree state is not complete after wait"))
}
