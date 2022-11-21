use crate::blockchain::EverClient;
use ton_client::{
    abi::{
        decode_boc, encode_boc, AbiParam, ParamsOfAbiEncodeBoc, ParamsOfDecodeBoc,
        ResultOfAbiEncodeBoc,
    },
    boc::{get_boc_hash, ParamsOfGetBocHash, ResultOfGetBocHash},
};

#[instrument(level = "debug", skip(context, data))]
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
    let ResultOfAbiEncodeBoc { boc } = encode_boc(context.clone(), params).await?;

    let mut decoded = decode_boc(
        context.clone(),
        ParamsOfDecodeBoc {
            boc,
            params: vec![AbiParam {
                name: "b".to_owned(),
                param_type: "cell".to_owned(),
                ..Default::default()
            }],
            allow_partial: false,
        },
    )
    .await?;
    let boc = decoded.data["b"].take();
    let boc = boc.as_str().unwrap();

    let ResultOfGetBocHash { hash } = get_boc_hash(
        context.clone(),
        ParamsOfGetBocHash {
            boc: boc.to_owned(),
        },
    )
    .await?;

    Ok(hash)
}
