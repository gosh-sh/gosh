use ::git_object;
use git_repository::Repository;

use crate::blockchain::{self, tvm_hash, GoshBlobBitFlags, GoshContract, TonClient};
use git_hash::ObjectId;
use git_object::tree::{self, EntryRef};
use git_odb::{self, Find, FindExt};
use std::collections::{HashMap, HashSet, VecDeque};
use std::error::Error;
use std::vec::Vec;

#[derive(Serialize, Debug)]
pub struct TreeNode {
    flags: String,
    mode: String,
    #[serde(rename = "typeObj")]
    type_obj: String,
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
        Commit => unimplemented!(),
    }
    .to_owned()
}

#[instrument(level = "debug", skip(cli))]
async fn construct_tree_node(
    cli: &TonClient,
    repo: &Repository,
    e: &EntryRef<'_>,
) -> Result<(String, TreeNode), Box<dyn Error>> {
    let mut buffer = vec![];
    use git_object::tree::EntryMode::*;
    let content_hash = match e.mode {
        Tree | Link => {
            let _ = repo.objects.try_find(e.oid, &mut buffer)?;
            sha256::digest_bytes(&buffer)
        }
        Blob | BlobExecutable => {
            let content = repo.objects.find_blob(e.oid, &mut buffer)?.data;
            if content.len() > crate::config::IPFS_CONTENT_THRESHOLD {
                // NOTE:
                // Here is a problem: we calculate if this blob is going to ipfs
                // one way (blockchain::snapshot::save::is_going_to_ipfs)
                // and it's different here.
                // However!
                // 1. This sha will be validated for files NOT in IPFS
                // 2. We can be sure if this check passed than this file surely
                //    goes to IPFS
                // 3. If we though that this file DOES NOT go to IPFS and calculated
                //    tvm_hash instead it will not break
                sha256::digest_bytes(&content)
            } else {
                tvm_hash(&cli, content).await?
            }
        }
        Commit => unimplemented!(),
    };
    let file_name = e.filename.to_string();
    let tree_node = TreeNode::from((format!("0x{content_hash}"), e));
    let type_obj = &tree_node.type_obj;
    let key = tvm_hash(&cli, format!("{}:{}", type_obj, file_name).as_bytes()).await?;
    Ok((format!("0x{}", key), tree_node))
}

#[instrument(level = "debug", skip(cli))]
pub async fn push_tree(
    cli: &TonClient,
    repo: &Repository,
    wallet: &GoshContract,
    repo_name: &str,
    tree_id: &ObjectId,
) -> Result<(), Box<dyn Error>> {
    let mut visited = HashSet::new();
    let mut to_deploy = VecDeque::new();
    to_deploy.push_back(tree_id.clone());
    while let Some(tree_id) = to_deploy.pop_front() {
        if visited.contains(&tree_id) {
            continue;
        }
        visited.insert(tree_id);
        let mut buffer: Vec<u8> = Vec::new();
        let entry_ref_iter = repo
            .objects
            .try_find(tree_id, &mut buffer)?
            .expect("Local object must be there")
            .try_into_tree_iter()
            .unwrap()
            .entries()?;

        let mut tree_nodes: HashMap<String, TreeNode> = HashMap::new();

        for e in entry_ref_iter.iter() {
            if e.mode == git_object::tree::EntryMode::Tree {
                to_deploy.push_back(e.oid.into());
            }
            let (hash, tree_node) = construct_tree_node(&cli, &repo, e).await?;
            tree_nodes.insert(hash, tree_node);
        }
        let params = DeployTreeArgs {
            sha: tree_id.to_hex().to_string(),
            repo_name: repo_name.to_string(),
            nodes: tree_nodes,
            ipfs: None, // !!!
        };
        let params: serde_json::Value = serde_json::to_value(params)?;

        blockchain::call(&cli, &wallet, "deployTree", Some(params)).await?;
    }
    Ok(())
}
