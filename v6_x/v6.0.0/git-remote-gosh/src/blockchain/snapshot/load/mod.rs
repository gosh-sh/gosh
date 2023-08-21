#![allow(unused_variables)]
use crate::{
    abi as gosh_abi,
    blockchain::{contract::ContractRead, EverClient, GoshContract},
};

use crate::blockchain::BlockchainContractAddress;
use data_contract_macro_derive::DataContract;
use serde::de;
use std::{fmt, option::Option};

pub mod diffs;

#[derive(Deserialize, DataContract)]
#[abi = "snapshot.abi.json"]
#[abi_data_fn = "getSnapshot"]
pub struct Snapshot {
    #[serde(rename = "temporaryCommit")]
    pub next_commit: String,

    #[serde(rename = "temporarySnapData")]
    #[serde(deserialize_with = "snapshot_content_custom_deserialization")]
    pub next_content: Vec<u8>,

    #[serde(rename = "temporaryIpfs")]
    pub next_ipfs: Option<String>,

    #[serde(rename = "approvedCommit")]
    pub current_commit: String,

    #[serde(rename = "approvedSnapData")]
    #[serde(deserialize_with = "snapshot_content_custom_deserialization")]
    pub current_content: Vec<u8>,

    #[serde(rename = "approvedIpfs")]
    pub current_ipfs: Option<String>,

    #[serde(rename = "baseCommit")]
    pub original_commit: String,

    #[serde(rename = "isSnapReady")]
    pub ready_for_diffs: bool,

    #[serde(rename = "isPin")]
    pub is_pinned: bool,
}

fn crop_vec(v: &Vec<u8>) -> String {
    if v.len() > 8 {
        let mut str = v[0..4]
            .to_vec()
            .iter()
            .fold(format!("Len: {}, Data: ", v.len()), |acc, el| {
                format!("{acc}{:02X}", el)
            });
        str.push_str("..");
        v[v.len() - 4..]
            .to_vec()
            .iter()
            .fold(str, |acc, el| format!("{acc}{:02X}", el))
    } else {
        v.iter()
            .map(|el| format!("{:02X}", el))
            .collect::<Vec<String>>()
            .join("")
    }
}

impl fmt::Debug for Snapshot {
    fn fmt(&self, f: &mut fmt::Formatter) -> Result<(), fmt::Error> {
        f.debug_struct("Snapshot")
            .field("next_commit", &self.next_commit)
            .field("next_content", &crop_vec(&self.next_content))
            .field("next_ipfs", &self.next_ipfs)
            .field("current_commit", &self.current_commit)
            .field("current_content", &crop_vec(&self.current_content))
            .field("current_ipfs", &self.current_ipfs)
            .field("original_commit", &self.original_commit)
            .field("ready_for_diffs", &self.ready_for_diffs)
            .finish()
    }
}

#[derive(Deserialize, Debug)]
pub struct GetSnapshotAddrResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetSnapshotFilePath {
    #[serde(rename = "value0")]
    pub file_path: String,
}

impl Snapshot {
    #[instrument(level = "info", skip_all)]
    pub async fn calculate_address(
        context: &EverClient,
        repo_contract: &GoshContract,
        commit_sha: &str,
        file_path: &str,
    ) -> anyhow::Result<BlockchainContractAddress> {
        tracing::trace!("calculate_address: commit_sha={commit_sha}, repo_contract.address={}, file_path={file_path}", repo_contract.address);
        let params = serde_json::json!({
            "commitsha": commit_sha,
            "name": file_path
        });
        let result: GetSnapshotAddrResult = repo_contract
            .run_static(context, "getSnapshotAddr", Some(params))
            .await?;
        Ok(result.address)
    }

    #[instrument(level = "info", skip_all)]
    pub async fn get_file_path(
        context: &EverClient,
        address: &BlockchainContractAddress,
    ) -> anyhow::Result<String> {
        tracing::trace!("get_file_path: address={address}");
        let snapshot = GoshContract::new(address, gosh_abi::SNAPSHOT);
        let result: GetSnapshotFilePath = snapshot.read_state(context, "getName", None).await?;
        tracing::trace!("received file path `{result:?}` for snapshot {snapshot:?}",);
        Ok(result.file_path)
    }
}

fn snapshot_content_custom_deserialization<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
where
    D: de::Deserializer<'de>,
{
    // define a visitor that deserializes
    struct CompressedHexStringVisitor;

    impl<'de> de::Visitor<'de> for CompressedHexStringVisitor {
        type Value = Vec<u8>;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a hex string containing compressed data")
        }

        fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            if v.len() % 2 != 0 {
                // It is certainly not a hex string
                return Err(E::custom("Not a hex string"));
            } else if v.is_empty() {
                return Ok(vec![]);
            }
            let compressed_data: Vec<u8> = (0..v.len())
                .step_by(2)
                .map(|i| {
                    u8::from_str_radix(&v[i..i + 2], 16)
                        .map_err(|_| E::custom(format!("Not a hex at {} -> {}", i, &v[i..i + 2])))
                })
                .collect::<Result<Vec<u8>, E>>()?;
            let data = ton_client::utils::decompress_zstd(&compressed_data)
                .map_err(|e| E::custom(format!("Decompress failed. Inner error: {}", e)))?;
            //            let base64_encoded_compressed_data = base64::encode(&compressed_data);
            //            let base64_encoded_decompressed_data = ton_client::utils::decompress_zstd(&base64_encoded_compressed_data)?;
            //            let data = base64::decode(base64_encoded_decompressed_data)?;
            Ok(data)
        }
    }

    // use our visitor to deserialize an `ActualValue`
    deserializer.deserialize_any(CompressedHexStringVisitor)
}

#[derive(Deserialize)]
pub struct OldSnapshot {
    #[serde(rename = "value0")]
    pub next_commit: String,

    #[serde(rename = "value1")]
    #[serde(deserialize_with = "snapshot_content_custom_deserialization")]
    pub next_content: Vec<u8>,

    #[serde(rename = "value2")]
    pub next_ipfs: Option<String>,

    #[serde(rename = "value3")]
    pub current_commit: String,

    #[serde(rename = "value4")]
    #[serde(deserialize_with = "snapshot_content_custom_deserialization")]
    pub current_content: Vec<u8>,

    #[serde(rename = "value5")]
    pub current_ipfs: Option<String>,

    #[serde(rename = "value6")]
    pub original_commit: String,

    #[serde(rename = "value7")]
    pub ready_for_diffs: bool,
}
