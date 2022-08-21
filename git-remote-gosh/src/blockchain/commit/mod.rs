use crate::blockchain::TonClient;
mod save;

pub use save::{
    push_commit,
    notify_commit
};
use crate::blockchain::Result;

#[derive(Deserialize, Debug, DataContract)]
#[abi = "commit.abi.json"]
#[abi_data_fn = "getCommit"]
pub struct GoshCommit {
    repo: String,
    pub branch: String,
    pub sha: String,
    parents: Vec<String>,
    pub content: String,
}

pub async fn get_set_commit_created_at_time(context: &TonClient, repository_contract_address: &str, commit_id: &str, branch_name: &str) -> Result<u64> {
    unimplemented!();
}
