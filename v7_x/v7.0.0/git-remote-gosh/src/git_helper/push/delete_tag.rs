use crate::blockchain::{BlockchainContractAddress, BlockchainService};

#[instrument(level = "trace", skip_all)]
pub async fn delete_tag(
    blockchain: &impl BlockchainService,
    remote_network: &str,
    dao_addr: &BlockchainContractAddress,
    repo_name: &str,
    tag_name: &str,
) -> anyhow::Result<()> {
    let repo_contract = blockchain.repo_contract();
    let wallet = blockchain.user_wallet(dao_addr, remote_network).await?;

    blockchain
        .delete_tag(&wallet, repo_name.to_owned(), tag_name.to_owned())
        .await?;

    Ok(())
}
