use crate::git_helper::GitHelper;
use crate::abi as gosh_abi;
use crate::blockchain::{GoshContract, Number, TonClient};
use ::git_object;
use data_contract_macro_derive::DataContract;
use std::collections::HashMap;
use std::error::Error;
use git_hash::ObjectId;
use git_odb;
use git_odb::Find;
use std::vec::Vec;

#[derive(Serialize, Debug)]
pub struct TreeNode {
    flags: String,
    mode: String,
    #[serde(rename = "typeObj")]
    type_obj: String,
    name: String,
    sha1: String,
    sha256: String
}

#[derive(Serialize, Debug)]
pub struct DeployTreeArgs {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "datatree")] 
    node: Vec<TreeNode>
}

impl<'a> From<&'a git_object::tree::EntryRef<'a>> for TreeNode {
    fn from(entry: &git_object::tree::EntryRef) -> Self {
        todo!();
    }
}
    

pub async fn push_tree(context: &mut GitHelper, tree_id: &ObjectId) -> Result<(), Box<dyn Error>> {
    let mut buffer: Vec<u8> = Vec::new();
    let tree_nodes: Vec<TreeNode> = context
        .local_repository()
        .objects
        .try_find(tree_id, &mut buffer)?
        .expect("Local object must be there")
        .try_into_tree_iter()
        .unwrap()
        .entries()?
        .iter()
        .map(|e| e.into())
        .collect();
    //let params = DeployTreeArgs {
        
    //};  
    Ok(())
}


