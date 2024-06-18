use crate::blockchain::{
    contract::ContractRead, contract::GoshContract, BlockchainContractAddress, EverClient,
};

#[derive(Deserialize, Debug)]
pub struct GetTagContentResult {
    #[serde(rename = "value0")]
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct Lightweight {
    _name: String,
    _commit_id: String,
}

#[derive(Debug, Clone)]
pub struct Annotated {
    _name: String,
    _id: String,
    _commit_id: String,
    pub(crate) content: Vec<u8>,
}

#[derive(Debug, Clone)]
pub enum TagObject {
    Lightweight(Lightweight),
    Annotated(Annotated),
}

#[instrument(level = "trace", skip_all)]
pub async fn get_content(
    context: &EverClient,
    address: &BlockchainContractAddress,
) -> anyhow::Result<TagObject> {
    let tag_contract = GoshContract::new(address, crate::abi::TAG);
    let GetTagContentResult { content } = tag_contract
        .read_state(&context, "getContent", None)
        .await?;

    let mut iter = content.splitn(2, '\n');
    let head = iter.next().unwrap();
    let tag = if head.starts_with("tag") {
        // lightweight tag: "tag <TAG_NAME>\nobject <COMMIT_ID>\n"
        let tag_name = head.split(' ').nth(1).unwrap();
        let commit_id = iter.next().unwrap().split(' ').nth(1).unwrap();
        TagObject::Lightweight(Lightweight {
            _name: tag_name.to_owned(),
            _commit_id: commit_id.to_owned(),
        })
    } else {
        // annotated tag: "id <TAG_ID>\nobject <COMMIT_ID>\ntype commit\ntag <TAG_NAME>\n..."
        let tag_id = head.split(' ').nth(1).unwrap();
        let content = iter.next().unwrap();
        let mut content_iter = content.split('\n');
        let commit_id = content_iter.next().unwrap().split(' ').nth(1).unwrap();
        let tag_name = content_iter.nth(1).unwrap().split(' ').nth(1).unwrap();
        TagObject::Annotated(Annotated {
            _name: tag_name.to_owned(),
            _id: tag_id.to_owned(),
            _commit_id: commit_id.to_owned(),
            content: content.as_bytes().to_vec(),
        })
    };

    Ok(tag)
}
