use crate::blockchain::{
    self,
    tree::into_tree_contract_complient_path
};
use git_diff;
use git_hash::{self, ObjectId};
use git_object::tree;
use git_odb;
use git_odb::{Find, Write};
use git_repository::{self, Object};
use std::env::current_dir;
use std::os;
use std::process::{Command, Stdio};
use std::{
    collections::{HashSet, HashMap, VecDeque},
    error::Error,
    str::FromStr,
    vec::Vec,
};
use std::path::PathBuf;
use git_repository::{
    OdbHandle,
    Repository
};
use git_odb::FindExt;
use git_traverse::tree::recorder;

use crate::git_helper::push::Result;

pub struct TreeDiff {
    pub added: Vec<recorder::Entry>,
    pub deleted: Vec<recorder::Entry>,
    // updated: from -> to
    pub updated: Vec<(recorder::Entry, recorder::Entry)>
}

impl TreeDiff {
    pub fn new() -> Self {
        Self {
            added: vec![],
            deleted: vec![],
            updated: vec![]
        }
    }
}

fn all_files(repository: &Repository, tree_root: ObjectId) -> Result<Vec<recorder::Entry>> {
    let all_objects:Vec<recorder::Entry> = {
        repository.find_object(tree_root)?
            .into_tree()
            .traverse()
            .breadthfirst
            .files()?
            .into_iter()
            .collect()
    };
    return Ok(all_objects
        .into_iter()
        .filter(|e| match e.mode {
            tree::EntryMode::Blob | tree::EntryMode::BlobExecutable => true,
            tree::EntryMode::Link => true,
            tree::EntryMode::Tree => false,
            tree::EntryMode::Commit => {
                panic!("Commits of git submodules are not supported yet");
            }
        })
        .collect());
}

pub fn build_tree_diff_from_commits(
    repository: &Repository,
    original_commit_id: ObjectId,
    next_commit_id: ObjectId
) -> Result<TreeDiff> {
    let original_tree_root_id = repository
        .find_object(original_commit_id)?
        .into_commit()
        .tree()?
        .id;
    let next_tree_root_id = repository
        .find_object(next_commit_id)?
        .into_commit()
        .tree()?
        .id;
    return build_tree_diff(repository, original_tree_root_id, next_tree_root_id);
}

pub fn build_tree_diff(
    repository: &Repository,
    original_tree_root_id: ObjectId, 
    next_tree_root_id: ObjectId
) -> Result<TreeDiff> {
    let mut original_files_state: HashMap<_, _> = all_files(repository, original_tree_root_id)?
        .into_iter()
        .map(|e| (e.filepath.to_string(), e))
        .collect();

    let mut next_files_state = all_files(repository, next_tree_root_id)?;

    let mut tree_diff = TreeDiff::new();
    for next_tree_entry in next_files_state.drain(..) {
        let full_path = next_tree_entry.filepath.to_string(); 
        if let Some(original_tree_entry) = original_files_state.remove(&full_path) {
            if original_tree_entry.oid != next_tree_entry.oid {
                tree_diff.updated.push((original_tree_entry, next_tree_entry));
            }
        } else {
            tree_diff.added.push(next_tree_entry);
        }
    }
    tree_diff.deleted = original_files_state.drain().map(|e| e.1).collect();
    Ok(tree_diff)
}
    
