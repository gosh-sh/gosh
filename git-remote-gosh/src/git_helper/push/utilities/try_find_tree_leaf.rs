use crate::blockchain;
use crate::git_helper::push::Result;
use git_hash::ObjectId;
use git_object::tree;
use git_odb::FindExt;
use git_repository::OdbHandle;
use std::path::Path;

pub fn try_find_tree_leaf(
    odb: &OdbHandle,
    tree_root_id: Option<ObjectId>,
    file_path: &Path,
) -> Result<Option<ObjectId>> {
    let mut cursor: ObjectId = match tree_root_id {
        None => return Ok(None),
        Some(tree_root_id) => tree_root_id,
    };
    let file_path = blockchain::tree::into_tree_contract_complient_path(file_path);
    let file_path: Vec<&str> = file_path.split('/').collect();
    let mut file_path_iter = file_path.iter().peekable();

    loop {
        let file_name = file_path_iter.next();
        let file_name = file_name.unwrap();
        let mut buffer: Vec<u8> = Vec::new();
        let tree_object = odb.find_tree(cursor, &mut buffer)?;

        if file_path_iter.peek().is_none() {
            let result = tree_object.entries.iter().find(|e| {
                if e.filename != file_name {
                    return false;
                }
                match e.mode {
                    tree::EntryMode::Tree => false,
                    tree::EntryMode::Blob
                    | tree::EntryMode::BlobExecutable
                    | tree::EntryMode::Link => true,
                    tree::EntryMode::Commit => panic!("Unsupported"),
                }
            });
            return Ok(result.map(|e| e.oid.into()));
        } else {
            let result = tree_object.entries.iter().find(|e| {
                if e.filename != file_name {
                    return false;
                }
                match e.mode {
                    tree::EntryMode::Tree => true,
                    tree::EntryMode::Blob
                    | tree::EntryMode::BlobExecutable
                    | tree::EntryMode::Link => false,
                    tree::EntryMode::Commit => panic!("Unsupported"),
                }
            });
            if result.is_none() {
                return Ok(None);
            }
            cursor = ObjectId::from(result.unwrap().oid);
        }
    }
}
