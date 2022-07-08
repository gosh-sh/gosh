#![allow(unused_variables)]
use crate::git_helper::GitHelper;
use git_hash;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

pub async fn push_diff(
    context: &mut GitHelper,
    commit_id: &git_hash::ObjectId,
    file_path: &str,
    diff: &Vec<u8>,
) -> Result<()> {
    todo!("deployDiff");
}

pub async fn push_initial_snapshot(
    context: &mut GitHelper,
    commit_id: &git_hash::ObjectId,
    file_path: &str,
    content: &[u8],
) -> Result<()> {
    todo!("deployNewSnapshot");
}
