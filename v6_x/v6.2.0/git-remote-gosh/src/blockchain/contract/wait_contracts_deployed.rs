use crate::blockchain::blockchain_contract_address::FormatShort;
use crate::blockchain::{
    BlockchainContractAddress, BlockchainService, MAX_ACCOUNTS_ADDRESSES_PER_QUERY,
};
use std::collections::HashSet;
use tokio::task::JoinSet;
use tracing::Instrument;

const MAX_RETRIES_FOR_DIFFS_TO_APPEAR: i32 = 3; // x 3sec

#[instrument(level = "info", skip_all)]
pub async fn wait_contracts_deployed<B>(
    blockchain: &B,
    addresses: &[BlockchainContractAddress],
) -> anyhow::Result<Vec<BlockchainContractAddress>>
where
    B: BlockchainService + 'static,
{
    let mut deployment_results: JoinSet<anyhow::Result<Vec<BlockchainContractAddress>>> =
        JoinSet::new();
    for chunk in addresses.chunks(MAX_ACCOUNTS_ADDRESSES_PER_QUERY) {
        let mut waiting_for_addresses = Vec::from(chunk);
        let b = blockchain.clone();
        deployment_results.spawn(
            async move {
                let mut iteration = 0;
                while !waiting_for_addresses.is_empty() {
                    iteration += 1;
                    if iteration > MAX_RETRIES_FOR_DIFFS_TO_APPEAR + 1 {
                        // anyhow::bail!(
                        tracing::trace!(
                            "Some contracts didn't appear in time: {}",
                            waiting_for_addresses.format_short()
                        );
                        return Ok(waiting_for_addresses);
                    }
                    match b.check_contracts_state(&waiting_for_addresses, true).await {
                        Ok(found_addresses) => {
                            let available: HashSet<BlockchainContractAddress> =
                                HashSet::from_iter(found_addresses.iter().cloned());
                            waiting_for_addresses.retain(|e| !available.contains(e));
                            if !waiting_for_addresses.is_empty() {
                                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                                tracing::trace!(
                                    "Addresses {} are not ready yet. iteration {}",
                                    waiting_for_addresses.format_short(),
                                    iteration
                                );
                            }
                        }
                        Err(ref e) => {
                            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                            tracing::trace!(
                                "State request failed with: {}. iteration {}",
                                e,
                                iteration
                            );
                        }
                    }
                } // While loop
                Ok(vec![])
            } //move
            .instrument(info_span!("tokio::spawn::wait_contracts_deployed").or_current()),
        );
    }
    let mut undeployed_contracts = HashSet::new();
    while let Some(res) = deployment_results.join_next().await {
        let val = res??;
        for el in val {
            undeployed_contracts.insert(el);
        }
    }
    Ok(Vec::from_iter(undeployed_contracts))
}
