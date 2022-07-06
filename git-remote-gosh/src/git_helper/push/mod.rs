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

// async fn push_object(
//     repo: &git_repository::Repository,
//     object: &Object,
// ) -> Result<String, Box<dyn Error>> {
//     todo!()
// }

impl GitHelper {
    async fn push_ref(
        &mut self,
        local_ref: &str,
        remote_ref: &str,
    ) -> Result<String, Box<dyn Error>> {
        // TODO: git rev-list?
        let repo = self.local_repository();

        let remote_commit_id = repo
            .find_reference(remote_ref)?
            .into_fully_peeled_id()?
            .object()?
            .id;

        log::debug!("remote commit id {remote_commit_id}");

        let cmd = Command::new("git")
            .args([
                "rev-list",
                "--objects",
                "--in-commit-order",
                "--reverse",
                format!("{local_ref}").as_str(),
                format!("^{remote_commit_id}").as_str(),
            ])
            .spawn()
            .expect("git rev-list failed");

        let cmd_out = cmd.wait_with_output()?;
        for line in String::from_utf8(cmd_out.stdout)?.lines() {
            if let Some(oid) = line.split_ascii_whitespace().nth(0) {
                let object_id = git_hash::ObjectId::from_str(oid)?;
                // kind?
                let object = repo.find_object(object_id)?;
                match object.kind {
                    git_object::Kind::Blob => todo!(),
                    // git_object::Kind::Commit => push_commit(&repo, &object).await?,
                    git_object::Kind::Commit => todo!(),
                    git_object::Kind::Tag => todo!(),
                    git_object::Kind::Tree => todo!(),
                }
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
    pub async fn push(&mut self, refs: &str) -> Result<Vec<String>, Box<dyn Error>> {
        let splitted: Vec<&str> = refs.split(":").collect();
        let result = match splitted.as_slice() {
            [remote_ref] => delete_remote_ref(remote_ref).await?,
            [local_ref, remote_ref] => self.push_ref(local_ref, remote_ref).await?,
            _ => unreachable!(),
        };

        Ok(vec![result])
    }
}

// async fn push_commit(
//     repo: &git_repository::Repository,
//     object: &Object,
// ) -> Result<(), Box<dyn Error>> {
//     todo!()
// }

async fn delete_remote_ref(remote_ref: &str) -> Result<String, String> {
    Ok("delete ref ok".to_owned())
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
            "gosh::vps23.ton.dev://0:54fdd2ac8027b16c83b2b8b0cc4360ff4135a936c355bdb5c4776bdd3190fefc/dadao/somefiles",
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
        // branch set upstream "origin"
        branch.set_upstream(repo.remotes()?.get(0))?;

        // get remote ref
        // let remote_ref = repo.branch_remote_name()

        // push

        // push_ref()

        Ok(())
    }
}
