#![allow(unused_variables)]
#![allow(unused_imports)]
use super::GitHelper;
use crate::blockchain;
use git2::Repository;
use git_diff;
use git_hash::{self, ObjectId};
use git_object;
use git_odb;
use git_odb::{Find, Write};
use git_repository::{self, Object};
use std::env::current_dir;
use std::os;
use std::process::Command;
use std::{
    collections::{HashSet, VecDeque},
    error::Error,
    str::FromStr,
    vec::Vec,
};
use tokio::io::AsyncBufReadExt;

async fn push_object(
    repo: &git_repository::Repository,
    object_id: &ObjectId,
) -> Result<String, Box<dyn Error>> {
    todo!()
}

async fn push_ref(
    repo: &git_repository::Repository,
    local_ref: &str,
    remote_ref: &str,
) -> Result<String, Box<dyn Error>> {
    let local_commit_id = repo.find_reference(local_ref)?.into_fully_peeled_id()?;
    let commit_id = local_commit_id.object()?.id;

    // git rev-list

    // let repo = Repository::open_from_env()?; // libgit2
    // let full_ref = repo.resolve_reference_from_short_name(local_ref)?;
    // let commit = repo.reference_to_annotated_commit(&full_ref)?;

    log::debug!("local ref commit {:?}", commit_id);

    let mut commits_queue = VecDeque::<git_hash::ObjectId>::new();
    struct TreeObjectsQueueItem {
        pub path: String,
        pub object_id: ObjectId,
    }
    let mut tree_obj_queue = VecDeque::<TreeObjectsQueueItem>::new();

    commits_queue.push_back(commit_id);

    let cmd = Command::new("git")
        .args([
            "rev-list",
            "--objects",
            "--in-commit-order",
            "--reverse",
            format!("{local_ref}").as_str(),
            // format!("{remote_ref}").as_str(),
        ])
        .spawn()
        .expect("git rev-list failed");

    let cmd_out = cmd.wait_with_output()?;
    for line in String::from_utf8(cmd_out.stdout)?.lines() {
        if let Some(oid) = line.split_ascii_whitespace().nth(0) {
            let object = git_hash::ObjectId::from_str(oid)?;
            push_object(&repo, &object).await?;
        } else {
            break;
        }
    }

    // let splitted: Vec<&str> = local_ref.split("/").collect();
    // let branch = match splitted.as_slice() {
    //     [.., branch] => branch,
    //     _ => unreachable!(),
    // };

    // log::debug!("{}", current_dir()?.to_str().unwrap());

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
            [local_ref, remote_ref] => {
                push_ref(&self.local_git_repository, local_ref, remote_ref).await?
            }
            _ => unreachable!(),
        };

        Ok(vec![result])
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use git2::{
        string_array::StringArray, Branch, IndexAddOption, IndexTime, Repository, Signature, Time,
    };

    use super::*;

    // #[tokio::test]
    // async fn ensure_push_ok() {
    //     let local_ref = "refs/heads/demo";
    //     let push_result = push_ref(local_ref, "refs/heads/demo").await.unwrap();
    //     assert_eq!(format!("ok {}", local_ref), push_result);
    // }

    #[tokio::test]
    async fn test_push() -> Result<(), Box<dyn Error>> {
        // TODO: rewrite from libgit2 to gitoxide
        let dir = std::env::temp_dir().join("test_push");

        fs::remove_dir_all(&dir)?;
        fs::create_dir_all(&dir)?;
        fs::write(dir.join("readme.txt").to_owned(), "test")?;

        println!("Testing push {:?}", dir);

        let repo = Repository::init(dir).expect("repository init successfuly");
        repo.remote_set_url(
            "origin",
            "gosh::test_network://account@test/repository/name",
        )?;

        let mut index = repo.index()?;
        index.add_all(["*"].iter(), IndexAddOption::DEFAULT, None)?;
        index.write()?;

        let tree = index.write_tree()?;

        let author = Signature::new("tester", "test@test.test", &Time::new(0, 0))?;

        let update_ref = Some("HEAD");

        repo.commit(
            update_ref,
            &author,
            &author,
            "message",
            &repo.find_tree(tree)?,
            &[],
        )?;

        let head = repo.head()?;
        println!("head {:?}", head.name());
        let full_ref = repo.resolve_reference_from_short_name("main")?;
        let commit = repo.reference_to_annotated_commit(&full_ref)?;

        println!("commit {:?}", commit.id());

        // get current branch
        let mut branch = Branch::wrap(head);
        // set upstream
        branch.set_upstream(repo.remotes()?.get(0))?;

        // get remote ref
        // let remote_ref = repo.branch_remote_name()

        // push

        // push_ref()

        Ok(())
    }
}
