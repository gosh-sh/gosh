#[derive(Deserialize, Debug, DataContract)]
#[abi = "commit.abi.json"]
#[abi_data_fn = "getCommit"]
pub struct GoshCommit {
    repo: String,
    branch: String,
    pub sha: String,
    parents: Vec<String>,
    pub content: String,
}


