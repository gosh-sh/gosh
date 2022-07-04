#![allow(unused_variables)]
#![allow(unused_imports)]
use super::GitHelper;
use std::{
    str::FromStr,
    error::Error,
    collections::{HashSet, VecDeque},
    vec::Vec,
};
// use git_object;
// use git_odb;
// use git_hash;
// use git_repository;
// use git_odb::{
//     Find,
//     Write
// };
use crate::blockchain;

async fn push_ref(local_ref: &str, remote_ref: &str) -> Result<String, String> {
    let splitted: Vec<&str> = local_ref.split("/").collect();
    let branch = match splitted.as_slice() {
        [.., branch] => branch,
        _ => unreachable!()
    };

    let result_ok = format!("ok {local_ref}");
    Ok(result_ok)
}

async fn delete_remote_ref(remote_ref: &str) -> Result<String, String> {
    Ok("delete ref ok".to_owned())
}

impl GitHelper {
    pub async fn push(&self, refs: &str) -> Result<Vec<String>, Box<dyn Error>> {
        let splitted: Vec<&str> = refs.split(":").collect();
        let result = match splitted.as_slice() {
            [remote_ref] => delete_remote_ref(remote_ref).await?,
            [local_ref, remote_ref] => push_ref(local_ref, remote_ref).await?,
            _ => unreachable!()
        };

        Ok(vec![result])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn ensure_push_ok() {
        let local_ref = "refs/heads/demo";
        let push_result = push_ref(local_ref, "refs/heads/demo").await.unwrap();
        assert_eq!(format!("ok {}", local_ref), push_result);
    }
}