use super::GitHelper;
use std::str::FromStr;
use std::error::Error;
use std::env;
use std::collections::{
    HashSet,
    VecDeque
};
use std::vec::Vec;
use git_object;
use git_odb;
use git_hash;
use git_odb::{
    Find,
    Write
};
use crate::blockchain;

struct DownloadTask {
    r#type: git_object::Kind,
    id: git_hash::ObjectId
}

impl DownloadTask {
    pub fn new(kind: git_object::Kind, oid: git_hash::ObjectId) -> Self {
        return DownloadTask {
            r#type: kind,
            id: oid
        };
    }

    pub fn commit_from_sha(sha: &str) -> Result <Self, Box<dyn Error>> {
        let commit_id = git_hash::ObjectId::from_str(sha)?;
        return Ok(DownloadTask::new(git_object::Kind::Commit, commit_id));
    }

    pub fn commit(commit_id: &git_hash::ObjectId) -> Self {
        return Self::new(git_object::Kind::Commit, commit_id.to_owned());
    }

    pub fn tree(tree_id: &git_hash::ObjectId) -> Self {
        return Self::new(git_object::Kind::Tree, tree_id.to_owned());
    }

    pub fn blob(oid: &git_hash::ObjectId) -> Self {
        return Self::new(git_object::Kind::Blob, oid.to_owned());
    }
}

async fn download_commit_object_task(commit_id: &git_hash::ObjectId) {
     
}


fn reshuffle_tree_content_buffer(onchain_data_decoded: Vec<u8>)-> Result<Vec<u8>, Box<dyn Error>> {
    let content = String::from_utf8(onchain_data_decoded)?;
    log::info!("About to shuffle:\n {}\n-----", content);
    let mut buffer: Vec<u8> = vec![];
    for entry in content.lines() {
        let (head, _fn) = entry.split_at(entry.find('\t').expect("Broken onchain tree content 1*"));
        if let [mode, _, sha] = head.split(' ').collect::<Vec<&str>>()[..] {
            buffer.extend_from_slice({
                if mode == "040000" {"40000"} else { mode }
            }.as_bytes());
            buffer.extend_from_slice(format!(" {}", &_fn[1..]).as_bytes());
            buffer.push(0u8);
            let sha = git_hash::ObjectId::from_hex(sha.as_bytes())?;
            buffer.extend_from_slice(sha.as_bytes());
        } else {
            panic!("Broken onchain tree content 2*");
        }
    }
    return Ok(buffer);
}

impl GitHelper {
    pub async fn calculate_commit_address(&self, commit_id: &git_hash::ObjectId) -> Result<String, Box<dyn Error>> {
        let commit_id = format!("{}", commit_id);
        log::info!("Calculating commit address for repository <{}> and commit id <{}>", self.repo_addr, commit_id);
        return Ok(blockchain::get_commit_address(&self.es_client, &self.repo_addr, &commit_id).await?);
    }

    pub async fn download_commit<'a>(&self, commit_id: &git_hash::ObjectId, branch: &str) -> Result <blockchain::GoshCommit, Box<dyn Error>> {
        let onchain_commit_address = self.calculate_commit_address(commit_id).await?;
        log::info!("Downloading commit from {}", onchain_commit_address);
        let onchain_commit = blockchain::get_commit_by_addr(&self.es_client, &onchain_commit_address).await?.unwrap();
        log::info!("Complete downloaded commit from {}", onchain_commit_address);
        return Ok(onchain_commit);
    }

    pub async fn download_blob<'a>(&self, kind: &git_object::Kind, oid: &git_hash::ObjectId) -> Result<blockchain::GoshBlob, Box<dyn Error>> {
        use git_object::Kind::*;
        let kind_as_str: &str = match kind {
            Blob => "blob",
            Tree => "tree",
            Tag => "tag",
            _ => unimplemented!()
        };
        let oid = format!("{}", oid);
        let onchain_blob_address = blockchain::get_blob_address(&self.es_client, &self.repo_addr, kind_as_str, &oid).await?;
        let onchain_blob = blockchain::get_blob_by_addr(&self.es_client, &self.ipfs_client, &onchain_blob_address).await?.unwrap();
        return Ok(onchain_blob);
    }

    pub fn is_commit_in_local_cache(&mut self, object_id: &git_hash::ObjectId) -> bool {
        return self.local_repository().objects.contains(object_id)
    }

    async fn write_git_data<'a>(&mut self, obj: git_object::Data<'a>) -> Result<git_hash::ObjectId, Box<dyn Error>> {
        log::info!("Writing git object: {} -> size: {}", obj.kind, obj.data.len());
        let mut store = &mut self.local_repository().objects;
        // It should refresh once even if the refresh mode is never, just to initialize the index
        //store.refresh_never();
        let object_id = store.write_buf(obj.kind, obj.data)?;
        return Ok(object_id);
    }

    pub async fn fetch(&mut self, sha: &str, name: &str) -> Result<Vec<String>, Box<dyn Error>> {
        const REFS_HEAD_PREFIX: &str = "refs/heads/";
        if !name.starts_with(REFS_HEAD_PREFIX) {
            return Err("Error. Can not fetch an object without refs/heads/ prefix")?;
        }
        let branch: &str  = {
            let mut iter = name.chars();
            iter.by_ref().nth(REFS_HEAD_PREFIX.len());
            iter.as_str()
        };
        let mut visited: HashSet::<git_hash::ObjectId> = HashSet::new();
        let mut queue = VecDeque::new();
        queue.push_back(DownloadTask::commit_from_sha(sha)?);
        while let Some(DownloadTask { r#type, id}) = queue.pop_front() {
            log::info!("Task: {} - {}", r#type, id);
            if id.is_null() { continue; }
            if visited.contains(&id) { continue; }
            visited.insert(id.clone());
            if self.is_commit_in_local_cache(&id) { continue; }
            match r#type {
                git_object::Kind::Commit => {
                    let onchain_commit = self.download_commit(&id, branch).await?;
                    let data = git_object::Data::new(git_object::Kind::Commit, onchain_commit.content.as_bytes());
                    let obj = git_object::Object::from(data.decode()?).into_commit();
                    log::info!("Received commit {}", id);
                    //self.verbose(`got: commit (${sha}) at ${obj.address}`)
                    queue.push_back(DownloadTask::tree(&obj.tree));
                    queue.append(&mut VecDeque::from(
                        obj.parents.iter().filter_map(|parent_id| {
                            if visited.contains(parent_id) { return None; }
                            return Some(DownloadTask::commit(parent_id));
                        }).collect::<Vec<DownloadTask>>()
                    ));
                    self.write_git_data(data).await?;
                },
                git_object::Kind::Tag => {
                    unimplemented!();
                },
                git_object::Kind::Blob => {
                    // self.verbose(`${type} ${sha}...`)
                    let onchain_object = self.download_blob(&r#type, &id).await?;
                    let data = git_object::Data::new(r#type, &onchain_object.content);
                    log::info!("Blob parsed{}", id);
                    let obj = git_object::Object::from(data.decode()?);
                    log::info!("Received blob {}", id);
                    self.write_git_data(data).await?;
                },
                git_object::Kind::Tree => {
                    // self.verbose(`${type} ${sha}...`)
                    let onchain_object = self.download_blob(&r#type, &id).await?;
                    let buffer = reshuffle_tree_content_buffer(onchain_object.content)?;
                    log::info!("Tree obj parsed {}", id);
                    let tree = git_object::TreeRef::from_bytes(&buffer)?;
                    log::info!("Received tree {}", id);
                    queue.append(&mut VecDeque::from(
                        tree.entries.iter().filter_map(|git_object::tree::EntryRef{mode, filename, oid}| {
                            let oid: git_hash::ObjectId = git_hash::ObjectId::from(*oid);
                            return match mode {
                                git_object::tree::EntryMode::Tree => Some(DownloadTask::tree(&oid)),
                                git_object::tree::EntryMode::Blob => Some(DownloadTask::blob(&oid)),
                                git_object::tree::EntryMode::Commit => Some(DownloadTask::commit(&oid)),
                                git_object::tree::EntryMode::BlobExecutable => Some(DownloadTask::blob(&oid)),
                                _ => None 
                            };
                        }).collect::<Vec<DownloadTask>>()
                    ));
                    let data = git_object::Data::new(r#type, &buffer); 
                    self.write_git_data(data).await?; 
                }
            }
        }
        Ok(vec!["\n".to_owned()])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_can_decode_tree_obj() {
        let encoded = vec![49u8, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 100, 56, 54, 100, 50, 101, 51, 99, 55, 51, 55, 54, 57, 98, 55, 52, 97, 50, 55, 52, 102, 101, 102, 54, 97, 52, 52, 102, 56, 99, 97, 53, 102, 101, 48, 55, 99, 54, 50, 99, 9, 76, 73, 67, 69, 78, 83, 69, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 49, 52, 101, 54, 56, 97, 51, 54, 48, 49, 52, 54, 97, 53, 52, 51, 98, 98, 50, 101, 55, 56, 49, 97, 97, 97, 97, 97, 48, 99, 54, 101, 49, 54, 50, 53, 100, 57, 55, 97, 9, 101, 118, 101, 114, 115, 100, 107, 46, 110, 111, 100, 101, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 56, 100, 102, 99, 48, 97, 49, 56, 56, 102, 56, 97, 48, 49, 98, 51, 54, 52, 53, 51, 55, 97, 56, 56, 54, 51, 102, 55, 54, 102, 50, 48, 48, 56, 50, 52, 101, 50, 56, 100, 9, 102, 97, 118, 105, 99, 111, 110, 46, 105, 99, 111, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 50, 100, 49, 99, 50, 49, 55, 53, 98, 98, 97, 100, 52, 56, 48, 49, 102, 101, 98, 101, 49, 101, 48, 48, 97, 57, 55, 54, 102, 57, 53, 97, 101, 100, 49, 50, 100, 53, 55, 101, 9, 103, 111, 115, 104, 46, 116, 118, 99, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 100, 49, 49, 48, 53, 97, 54, 97, 52, 56, 98, 53, 53, 53, 50, 57, 97, 53, 56, 48, 52, 57, 98, 102, 54, 57, 55, 51, 51, 97, 49, 55, 48, 50, 98, 49, 98, 55, 98, 51, 9, 103, 111, 115, 104, 102, 105, 108, 101, 46, 121, 97, 109, 108, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 97, 102, 53, 54, 50, 54, 98, 52, 97, 49, 49, 52, 97, 98, 99, 98, 56, 50, 100, 54, 51, 100, 98, 55, 99, 56, 48, 56, 50, 99, 51, 99, 52, 55, 53, 54, 101, 53, 49, 98, 9, 115, 97, 109, 112, 108, 101, 46, 116, 120, 116];
        let expected: Vec<u8> = "31 30 30 36 34 34 20 4c 49 43 45 4e 53 45 00 d8 6d 2e 3c 73 76 9b 74 a2 74 fe f6 a4 4f 8c a5 fe 07 c6 2c 31 30 30 36 34 34 20 65 76 65 72 73 64 6b 2e 6e 6f 64 65 00 14 e6 8a 36 01 46 a5 43 bb 2e 78 1a aa aa 0c 6e 16 25 d9 7a 31 30 30 36 34 34 20 66 61 76 69 63 6f 6e 2e 69 63 6f 00 8d fc 0a 18 8f 8a 01 b3 64 53 7a 88 63 f7 6f 20 08 24 e2 8d 31 30 30 36 34 34 20 67 6f 73 68 2e 74 76 63 00 2d 1c 21 75 bb ad 48 01 fe be 1e 00 a9 76 f9 5a ed 12 d5 7e 31 30 30 36 34 34 20 67 6f 73 68 66 69 6c 65 2e 79 61 6d 6c 00 d1 10 5a 6a 48 b5 55 29 a5 80 49 bf 69 73 3a 17 02 b1 b7 b3 31 30 30 36 34 34 20 73 61 6d 70 6c 65 2e 74 78 74 00 af 56 26 b4 a1 14 ab cb 82 d6 3d b7 c8 08 2c 3c 47 56 e5 1b".split(" ").map(|e| u8::from_str_radix(&e, 16).unwrap()).collect();
        let decoded: Vec<u8> = reshuffle_tree_content_buffer(encoded).unwrap();
        assert_eq!(expected, decoded);
    }
}

