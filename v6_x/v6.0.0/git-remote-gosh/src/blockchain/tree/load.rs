use crate::blockchain::{gosh_abi, run_local, BlockchainContractAddress, BlockchainService, EverClient, GoshContract, Snapshot, GoshBlobBitFlags};
use ::git_object;
use data_contract_macro_derive::DataContract;
use git_object::tree::EntryMode;
use std::collections::{HashMap, VecDeque};
use git_object::tree;

// TODO: the same as TreeNode leave only one
#[derive(Serialize, Debug, Clone, Deserialize)]
pub struct TreeComponent {
    pub flags: String,
    pub mode: String,
    #[serde(rename = "typeObj")]
    pub type_obj: String,
    pub name: String,
    #[serde(rename = "gitsha")]
    pub git_sha: String,
    #[serde(rename = "tvmshatree")]
    pub tvm_sha_tree: Option<String>,
    #[serde(rename = "tvmshafile")]
    pub tvm_sha_file: Option<String>,
    pub commit: String,
}

#[derive(Deserialize, Debug)]
struct GetDetailsResult {
    #[serde(rename = "value0")]
    pub is_ready: bool,
    #[serde(rename = "value1")]
    objects: HashMap<String, TreeComponent>,
    #[serde(rename = "value2")]
    _sha_tree_local: String,
    #[serde(rename = "value3")]
    _sha_tree: String,
    #[serde(rename = "value4")]
    _pubaddr: BlockchainContractAddress,
}

#[derive(Deserialize, Debug, DataContract)]
#[abi = "tree.abi.json"]
#[abi_data_fn = "gettree"]
pub struct Tree {
    #[serde(rename = "value0")]
    pub objects: HashMap<String, TreeComponent>,
}

#[derive(Deserialize, Debug)]
pub struct GetTreeResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize)]
pub struct CalculateHashResult {
    #[serde(rename = "value0")]
    hash: String,
}

impl Tree {
    pub async fn calculate_address(
        context: &EverClient,
        repo_contract: &GoshContract,
        sha_inner_tree: &str,
    ) -> anyhow::Result<BlockchainContractAddress> {
        let params = serde_json::json!({ "shainnertree": sha_inner_tree });
        let result: GetTreeResult = repo_contract
            .run_static(context, "getTreeAddr", Some(params))
            .await?;
        Ok(result.address)
    }

    pub async fn get_address_from_commit(
        context: &EverClient,
        commit_address: &BlockchainContractAddress,
    ) -> anyhow::Result<BlockchainContractAddress> {
        let commit_contract = GoshContract::new(commit_address, gosh_abi::COMMIT);
        let result: GetTreeResult = commit_contract.run_local(context, "gettree", None).await?;
        Ok(result.address)
    }

    pub async fn inner_tree_hash(
        context: &EverClient,
        wallet_contract: &GoshContract,
        tree: &HashMap<String, TreeComponent>,
    ) -> anyhow::Result<String> {
        let params = serde_json::json!({ "_tree": tree });
        let result: CalculateHashResult = wallet_contract
            .run_static(context, "calculateInnerTreeHash", Some(params))
            .await?;
        Ok(result.hash)
    }
}

pub fn type_obj_to_entry_mod(type_obj: &str) -> git_object::tree::EntryMode {
    match type_obj {
        "tree" => git_object::tree::EntryMode::Tree,
        "blob" => git_object::tree::EntryMode::Blob,
        "blobExecutable" => git_object::tree::EntryMode::BlobExecutable,
        "link" => git_object::tree::EntryMode::Link,
        "commit" => git_object::tree::EntryMode::Commit,
        _ => unreachable!(),
    }
}

impl Into<git_object::tree::Entry> for TreeComponent {
    fn into(self) -> git_object::tree::Entry {
        let mode = type_obj_to_entry_mod(self.type_obj.as_str());
        let filename = self.name.into();
        let oid =
            git_hash::ObjectId::from_hex(self.git_sha.as_bytes()).expect("SHA1 must be correct");
        git_object::tree::Entry {
            mode,
            filename,
            oid,
        }
    }
}

impl Into<git_object::Tree> for Tree {
    fn into(self) -> git_object::Tree {
        let mut entries: Vec<git_object::tree::Entry> =
            self.objects.into_values().map(|e| e.into()).collect();
        entries.sort();
        git_object::Tree { entries }
    }
}

pub async fn check_if_tree_is_ready<B>(
    blockchain: &B,
    address: &BlockchainContractAddress,
) -> anyhow::Result<(bool, usize)>
// returns ready status and number of tree objects
where
    B: BlockchainService + 'static,
{
    tracing::trace!("Check whether tree is ready: {address}");
    let tree_contract = GoshContract::new(address, gosh_abi::TREE);
    let value = run_local(blockchain.client(), &tree_contract, "getDetails", None).await?;
    let res: GetDetailsResult = serde_json::from_value(value)?;

    tracing::trace!(
        "tree {}: ready={}, objects={}",
        address,
        res.is_ready,
        res.objects.len()
    );
    Ok((res.is_ready, res.objects.len()))
}

#[derive(Debug)]
pub struct SnapshotMonitor {
    pub base_commit: String,
    pub latest_commit: String,
}

#[instrument(level = "trace", skip_all)]
pub async fn construct_map_of_snapshots(
    context: &EverClient,
    repo_contract: &GoshContract,
    tree: Tree,
    prefix: &str,
    snapshot_to_commit: &mut HashMap<String, Vec<SnapshotMonitor>>,
    queue: &mut VecDeque<(Tree, String)>,
) -> anyhow::Result<()> {
    tracing::trace!(
        "construct_map_of_snapshots: prefix:{}, tree:{:?}",
        prefix,
        tree
    );
    for (_, entry) in tree.objects {
        let mode: EntryMode = type_obj_to_entry_mod(entry.type_obj.as_str());
        match mode {
            git_object::tree::EntryMode::Tree => {
                let subtree_address =
                    Tree::calculate_address(context, repo_contract, &entry.tvm_sha_tree.unwrap())
                        .await?;
                let subtree = Tree::load(context, &subtree_address).await?;
                let full_path = format!("{}{}/", prefix, entry.name);
                queue.push_back((subtree, full_path));
            }
            git_object::tree::EntryMode::Blob
            | git_object::tree::EntryMode::BlobExecutable
            | git_object::tree::EntryMode::Link => {
                let full_path = format!("{}{}", prefix, entry.name);
                tracing::trace!("Check snapshot {}", full_path);
                let snapshot_address =
                    Snapshot::calculate_address(context, repo_contract, &entry.commit, &full_path)
                        .await?;
                tracing::trace!("snapshot address {}", snapshot_address);
                match Snapshot::load(context, &snapshot_address).await {
                    Ok(snapshot) => {
                        tracing::trace!("snapshot data: {:?}", snapshot);
                        let snap_mon = SnapshotMonitor {
                            base_commit: entry.commit,
                            latest_commit: snapshot.current_commit,
                        };
                        let entry = snapshot_to_commit.entry(full_path).or_insert(vec![]);
                        entry.push(snap_mon);
                    }
                    Err(_) => {}
                }
            }
            _ => {}
        }
    }
    Ok(())
}

impl<'a> From<(Option<String>, Option<String>, String, &'a tree::Entry)> for TreeComponent {
    fn from(
        (file_hash, tree_hash, commit, entry): (
            Option<String>,
            Option<String>,
            String,
            &tree::Entry,
        ),
    ) -> Self {
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
