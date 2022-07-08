use crate::git_helper::GitHelper;
use git_hash::ObjectId; 
use std::path::PathBuf;

pub fn try_find_tree_leaf(context: &mut GitHelper, tree_root_id: Option<ObjectId>, file_path: &PathBuf) -> Option<ObjectId> {
    if tree_root_id.is_none() {
        return None;
    }
    todo!();
}
