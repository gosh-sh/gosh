use crate::blockchain::{
    self, call::BlockchainCall, contract::ContractInfo, gosh_abi, user_wallet::UserWallet,
    BlockchainContractAddress, BlockchainService, Everscale, GoshBlobBitFlags, GoshContract, Tree,
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
    #[serde(rename = "gitsha")]
    git_sha: String,
    #[serde(rename = "tvmshatree")]
    tvm_sha_tree: Option<String>,
    #[serde(rename = "tvmshafile")]
    tvm_sha_file: Option<String>,
    commit: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct DeployTreeArgs {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "shaTree")]
    pub sha_tree: String,
    #[serde(rename = "shainnerTree")]
    pub sha_inner_tree: String,
    #[serde(rename = "datatree")]
    nodes: HashMap<String, TreeNode>,
    number: u128,
}

#[derive(Serialize, Debug)]
pub struct DeployAddTreeArgs {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "shainnerTree")]
    pub sha_inner_tree: String,
    #[serde(rename = "datatree")]
    nodes: HashMap<String, TreeNode>,
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
        sha_inner_hash: &str,
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
        sha_inner_hash: &str,
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
            let tree_contract =
                GoshContract::new(BlockchainContractAddress::new(&tree_address), gosh_abi::TREE);

            if tree_contract.is_active(self.client()).await? {
                // check existing tree nodes
                let onchain_tree_object =
                    blockchain::Tree::load(self.client(), &tree_address).await?;
                nodes.retain(|k, _| !onchain_tree_object.objects.contains_key(k));
            } else {
                let params = DeployTreeArgs {
                    repo_name: repo_name.to_owned(),
                    sha_tree: sha.to_owned(),
                    sha_inner_tree: sha_inner_hash.to_string(),
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
                let mut chunk = HashMap::new();
                (chunk, nodes) = nodes.into_iter().partition(|(_, _)| {
                    counter += 1;
                    counter <= TREE_NODES_CHUNK_MAX_SIZE
                });
                let params = DeployAddTreeArgs {
                    sha_inner_tree: sha_inner_hash.to_string(),
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

impl<'a> From<(Option<String>, Option<String>, String, &'a tree::Entry)> for TreeNode {
    fn from((file_hash, tree_hash, commit, entry): (Option<String>, Option<String>, String, &tree::Entry)) -> Self {
        Self {
            flags: (GoshBlobBitFlags::Compressed as u8).to_string(),
            mode: std::str::from_utf8(entry.mode.as_bytes())
                .unwrap()
                .to_owned(),
            type_obj: convert_to_type_obj(entry.mode),
            name: entry.filename.to_string(),
            git_sha: entry.oid.to_hex().to_string(),
            tvm_sha_file: file_hash,
            tvm_sha_tree: tree_hash,
            commit,
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
