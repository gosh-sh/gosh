use crate::blockchain::blockchain_contract_address::FormatShort;
use crate::blockchain::contract::GoshContract;
use crate::blockchain::{gosh_abi, BlockchainContractAddress, BlockchainService};
use std::collections::HashSet;
use tokio::task::JoinSet;
use tracing::Instrument;

const MAX_RETRIES_FOR_DIFF_READINESS: i32 = 20;
const CHUNK_SIZE: usize = 50;

#[derive(Deserialize, Debug, Clone)]
struct GetStatusResult {
    #[serde(rename = "value0")]
    pub correct: bool,
}

#[instrument(level = "info", skip_all)]
pub async fn wait_diffs_until_ready<B>(
    blockchain: &B,
    addresses: &[BlockchainContractAddress],
) -> anyhow::Result<Vec<BlockchainContractAddress>>
where
    B: BlockchainService + 'static,
{
    let mut current_status = JoinSet::<anyhow::Result<Vec<BlockchainContractAddress>>>::new();

    let mut expected_diffs = Vec::from(addresses);
    for chunk in expected_diffs.chunks_mut(CHUNK_SIZE) {
        let b = blockchain.clone();
        let mut chunk_clone = chunk.to_vec();
        current_status.spawn(
            async move {
                let mut iteration = 0;
                while !chunk_clone.is_empty() {
                    iteration += 1;
                    if iteration > MAX_RETRIES_FOR_DIFF_READINESS {
                        tracing::trace!(
                        "Some contracts didn't appear in time: {}",
                        chunk_clone.format_short()
                    );
                        return Ok(chunk_clone);
                    }
                    let mut not_ready = Vec::<BlockchainContractAddress>::new();
                    for diff_addr in chunk_clone.clone() {
                        let diff_contract = GoshContract::new(&diff_addr, gosh_abi::DIFF);
                        let diff_status: anyhow::Result<GetStatusResult> =
                            diff_contract.run_local(b.client(), "getStatus", None).await;
                        tracing::trace!("get status of {}: {:?}", diff_addr, diff_status);
                        match diff_status {
                            Ok(status) => {
                                if !status.correct {
                                    // TODO: should wait and ask again
                                    not_ready.push(diff_addr.clone());
                                    tracing::trace!("Diff not ready yet: {}", diff_addr);
                                } else {
                                    tracing::trace!("Diff ready: {}", diff_addr);
                                }
                            }
                            Err(ref e) => {
                                not_ready.push(diff_addr.clone());
                                tracing::trace!(
                                "Loading diff {} failed with: {e}. iteration {iteration}",
                                diff_addr
                            );
                            }
                        };
                    }
                    if !not_ready.is_empty() {
                        tracing::trace!(
                        "Diffs {} are not ready yet. Iteration #{}",
                        chunk_clone.format_short(),
                        iteration
                    );
                    }
                    chunk_clone = not_ready;
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                }
                Ok(vec![])
            }
                .instrument(info_span!("check_if_diffs_are_ready").or_current()),
        );
    }
    let mut unready_diffs = HashSet::new();
    while let Some(res) = current_status.join_next().await {
        let val = res??;
        for el in val {
            unready_diffs.insert(el);
        }
    }
    Ok(Vec::from_iter(unready_diffs))
}
