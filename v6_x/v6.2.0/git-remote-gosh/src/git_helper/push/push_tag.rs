use crate::blockchain::{BlockchainContractAddress, BlockchainService};
use git_hash::ObjectId;

#[instrument(level = "trace", skip_all)]
pub async fn push_tag(
    blockchain: &impl BlockchainService,
    remote_network: &str,
    dao_addr: &BlockchainContractAddress,
    repo_name: &str,
    tag_name: &str,
    commit_id: &ObjectId,
    tag_content: &str,
) -> anyhow::Result<()> {
    let repo_contract = blockchain.repo_contract();

    let commit_address = &crate::blockchain::get_commit_address(
        &blockchain.client(),
        &mut repo_contract.clone(),
        &commit_id.to_string(),
    )
    .await?;

    let wallet = blockchain.user_wallet(dao_addr, remote_network).await?;
    blockchain
        .deploy_tag(
            &wallet,
            repo_name.to_owned(),
            tag_name.to_owned(),
            commit_id.to_string(),
            tag_content.to_owned(),
            commit_address.to_owned(),
        )
        .await?;

    Ok(())
}
