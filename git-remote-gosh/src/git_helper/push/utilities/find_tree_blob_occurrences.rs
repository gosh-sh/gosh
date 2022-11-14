

use git_hash::{self, ObjectId};
use git_object;
use git_odb;
use git_odb::FindExt;

use git_repository::OdbHandle;
use git_repository::{self};


use std::path::{Path, PathBuf};

use std::{
    vec::Vec,
};

pub fn find_tree_blob_occurrences(
    node_path: &Path,
    odb: &OdbHandle,
    tree_id: &ObjectId,
    blob_id: &ObjectId,
    buffer: &mut Vec<PathBuf>,
) -> anyhow::Result<()> {
    use git_object::tree::EntryMode::*;
    let mut tree_object_buffer: Vec<u8> = Vec::new();
    let tree = odb.find_tree(tree_id, &mut tree_object_buffer)?;
    for entry in tree.entries {
        match entry.mode {
            Tree => {
                find_tree_blob_occurrences(
                    &node_path.join(entry.filename.to_string()),
                    odb,
                    &entry.oid.into(),
                    blob_id,
                    buffer,
                )?;
            }
            Blob | BlobExecutable | Link => {
                if entry.oid == blob_id.as_ref() {
                    buffer.push(node_path.join(entry.filename.to_string()));
                }
            }
            Commit => unimplemented!("git submodule"),
        }
    }
    Ok(())
}
