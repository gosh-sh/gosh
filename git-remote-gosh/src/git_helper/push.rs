#![allow(unused_variables)]
#![allow(unused_imports)]
use super::GitHelper;
use crate::blockchain;
use git_hash;
use git_object;
use git_odb;
use git_odb::{Find, Write};
use git_repository;
use std::env::current_dir;
use std::os;
use std::{
    collections::{HashSet, VecDeque},
    error::Error,
    str::FromStr,
    vec::Vec,
};

async fn push_ref(local_ref: &str, remote_ref: &str) -> Result<String, Box<dyn Error>> {
    let splitted: Vec<&str> = local_ref.split("/").collect();
    let branch = match splitted.as_slice() {
        [.., branch] => branch,
        _ => unreachable!(),
    };

    log::debug!("{}", current_dir()?.to_str().unwrap());

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
            _ => unreachable!(),
        };

        Ok(vec![result])
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use git2::{string_array::StringArray, IndexAddOption, IndexTime, Repository, Signature, Time};

    use super::*;

    #[tokio::test]
    async fn ensure_push_ok() {
        let local_ref = "refs/heads/demo";
        let push_result = push_ref(local_ref, "refs/heads/demo").await.unwrap();
        assert_eq!(format!("ok {}", local_ref), push_result);
    }

    #[tokio::test]
    async fn test_push() -> Result<(), Box<dyn Error>> {
        let dir = std::env::temp_dir().join("test_push");

        fs::remove_dir_all(&dir)?;
        fs::create_dir_all(&dir)?;
        fs::write(dir.join("readme.txt").to_owned(), "test")?;

        println!("Testing push {:?}", dir);

        let repo = Repository::init(dir).expect("repository init successfuly");
        repo.remote_set_url("origin", "gosh::test://test")?;

        let mut index = repo.index()?;
        index.add_all(["*"].iter(), IndexAddOption::DEFAULT, None)?;
        index.write()?;

        let tree = index.write_tree()?;

        let author = Signature::new("tester", "test@test.test", &Time::new(0, 0))?;

        // let head = repo.head()?;
        // let ref_opt = head.name();
        let update_ref = Some("HEAD");

        repo.commit(
            update_ref,
            &author,
            &author,
            "message",
            &repo.find_tree(tree)?,
            &[],
        )?;

        repo.remotes()?.iter().for_each(|x| println!("{x:?}"));

        Ok(())
    }
}
