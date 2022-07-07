#![allow(unused_variables)]
use crate::abi as gosh_abi;
use crate::blockchain::{GoshContract, TonClient};

use data_contract_macro_derive::DataContract;
use serde::de;
use std::error::Error;
use std::fmt;
use std::option::Option;

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
}

impl Snapshot {
    pub async fn calculate_address(
        context: &TonClient,
        repository_address: &str,
        branch_name: &str,
        file_path: &str,
    ) -> Result<String, Box<dyn Error>> {
        let repo = GoshContract::new(repository_address, gosh_abi::REPO);
        let params = serde_json::json!({
            "branch": branch_name,
            "name": file_path
        });
        let address = repo
            .run_local(context, "getSnapshotAddr", Some(params))
            .await?["value0"]
            .take();
        return serde_json::from_value(address).map_err(|e| e.into());
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
            return Ok(data);
        }
    }

    // use our visitor to deserialize an `ActualValue`
    deserializer.deserialize_any(CompressedHexStringVisitor)
}
