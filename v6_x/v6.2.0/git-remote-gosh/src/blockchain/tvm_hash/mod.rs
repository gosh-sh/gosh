use crate::blockchain::EverClient;
use std::sync::Arc;
use ton_client::{
    abi::{
        decode_boc, encode_boc, AbiParam, ParamsOfAbiEncodeBoc, ParamsOfDecodeBoc,
        ResultOfAbiEncodeBoc,
    },
    boc::{get_boc_hash, ParamsOfGetBocHash, ResultOfGetBocHash},
};

#[instrument(level = "info", skip_all)]
pub async fn tvm_hash(context: &EverClient, data: &[u8]) -> anyhow::Result<String> {
    let params = ParamsOfAbiEncodeBoc {
        params: vec![AbiParam {
            name: "data".to_string(),
            param_type: "bytes".to_string(),
            ..Default::default()
        }],
        data: serde_json::json!({ "data": hex::encode(data) }),
        boc_cache: None,
    };
    let ResultOfAbiEncodeBoc { boc } = encode_boc(Arc::clone(context), params)?;

    let mut decoded = decode_boc(
        Arc::clone(context),
        ParamsOfDecodeBoc {
            boc,
            params: vec![AbiParam {
                name: "b".to_owned(),
                param_type: "cell".to_owned(),
                ..Default::default()
            }],
            allow_partial: false,
        },
    )?;
    let boc = decoded.data["b"].take();
    let boc = boc.as_str().unwrap();

    let ResultOfGetBocHash { hash } = get_boc_hash(
        Arc::clone(context),
        ParamsOfGetBocHash {
            boc: boc.to_owned(),
        },
    )?;

    Ok(hash)
}
