#![allow(unused_variables)]
use crate::{
    abi as gosh_abi,
    blockchain::{GoshContract, TonClient},
};

use crate::blockchain::BlockchainContractAddress;
use data_contract_macro_derive::DataContract;
use serde::de;
use std::{fmt, option::Option};
pub mod diffs;

#[derive(Deserialize, Debug, DataContract)]
#[abi = "snapshot.abi.json"]
#[abi_data_fn = "getSnapshot"]
pub struct Snapshot {
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

#[derive(Deserialize, Debug)]
struct GetSnapshotAddrResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetSnapshotFilePath {
    #[serde(rename = "value0")]
    pub file_path: String,
}

impl Snapshot {
    #[instrument(level = "debug", skip(context))]
    pub async fn calculate_address(
        context: &TonClient,
        repo_contract: &mut GoshContract,
        branch_name: &str,
        file_path: &str,
    ) -> anyhow::Result<BlockchainContractAddress> {
        let params = serde_json::json!({
            "branch": branch_name,
            "name": file_path
        });
        let result: GetSnapshotAddrResult = repo_contract
            .run_static(context, "getSnapshotAddr", Some(params))
            .await?;
        Ok(result.address)
    }

    #[instrument(level = "debug", skip(context))]
    pub async fn get_file_path(
        context: &TonClient,
        address: &BlockchainContractAddress,
    ) -> anyhow::Result<String> {
        let snapshot = GoshContract::new(address, gosh_abi::SNAPSHOT);
        let result: GetSnapshotFilePath = snapshot.run_local(context, "getName", None).await?;
        log::debug!("received file path `{result:?}` for snapshot {snapshot:?}",);
        // Note: Fix! Contract returns file path prefixed with a branch name
        let mut path = result.file_path;
        path = path
            .split_once('/')
            .expect("Must be prefixed")
            .1
            .to_string();
        Ok(path)
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
