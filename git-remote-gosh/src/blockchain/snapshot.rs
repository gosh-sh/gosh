#![allow(unused_variables)]
use std::error::Error;
use std::option::Option;
use data_contract_macro_derive::DataContract;
use crate::abi as gosh_abi;
use crate::blockchain::{
    TonClient,
    GoshContract
};

use base64;
use base64_serde::base64_serde_type;

base64_serde_type!(Base64Standard, base64::STANDARD);


#[derive(Deserialize, Debug, DataContract)]
#[abi = "snapshot.abi.json"]
#[abi_data_fn = "getSnapshot"]
pub struct Snapshot {
    #[serde(rename = "value0")]
    pub next_commit: String,

    #[serde(rename = "value1")]
    #[serde(with = "Base64Standard")]
    pub next_content: Vec<u8>,

    #[serde(rename = "value2")]
    pub next_ipfs: Option<String>,
        
    #[serde(rename = "value3")]
    pub current_commit: String,

    #[serde(rename = "value4")]
    #[serde(with = "Base64Standard")]
    pub current_content: Vec<u8>,

    #[serde(rename = "value5")]
    pub current_ipfs: Option<String>,
}


impl Snapshot {
    pub async fn calculate_address(context: &TonClient, repository_address: &str, branch_name: &str, file_path: &str) -> Result<String, Box<dyn Error>>{
        let repo = GoshContract::new(repository_address, gosh_abi::REPO);
        let params = serde_json::json!({
            "branch": branch_name,
            "name": file_path
        });
        let address = repo.run_local(context, "getSnapshotAddr", Some(params))
            .await?["value0"].take();
        return serde_json::from_value(address)
            .map_err(|e| e.into());
    }
}

