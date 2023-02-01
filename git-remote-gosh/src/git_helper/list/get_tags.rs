use crate::blockchain::{BlockchainContractAddress, EverClient, tag_list};

pub async fn get_tags(
    context: &EverClient,
    repo_addr: &BlockchainContractAddress,
) -> anyhow::Result<Option<Vec<String>>> {
    let tags = tag_list(context, repo_addr).await?;

    return if tags.len() == 0 {
        Ok(None)
    } else {
        Ok(Some(tags))
    }
}
