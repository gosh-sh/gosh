use crate::blockchain::blockchain_contract_address::FormatShort;
use crate::blockchain::{BlockchainContractAddress, BlockchainService, Snapshot};
use std::collections::HashSet;
use tokio::task::JoinSet;
use tracing::Instrument;

const MAX_RETRIES_FOR_SNAP_READINESS: i32 = 3;
const CHUNK_SIZE: usize = 50;

#[instrument(level = "info", skip_all)]
pub async fn wait_snapshots_until_ready<B>(
    blockchain: &B,
    addresses: &[BlockchainContractAddress],
) -> anyhow::Result<Vec<BlockchainContractAddress>>
where
    B: BlockchainService + 'static,
{
    let mut current_status = JoinSet::<anyhow::Result<Vec<BlockchainContractAddress>>>::new();

    let mut expected_snapshots = Vec::from(addresses);
    for chunk in expected_snapshots.chunks_mut(CHUNK_SIZE) {
        let b = blockchain.clone();
        let mut chunk_clone = chunk.to_vec();
        current_status.spawn(
            async move {
                let mut iteration = 0;
                while !chunk_clone.is_empty() {
                    iteration += 1;
                    if iteration > MAX_RETRIES_FOR_SNAP_READINESS {
                        tracing::trace!(
                            "Some contracts didn't appear in time: {}",
                            chunk_clone.format_short()
                        );
                        return Ok(chunk_clone);
                    }
                    let mut not_ready = Vec::<BlockchainContractAddress>::new();
                    for snapshot_addr in chunk_clone.clone() {
                        match Snapshot::load(b.client(), &snapshot_addr).await {
                            Ok(snapshot) => {
                                if !snapshot.ready_for_diffs {
                                    not_ready.push(snapshot_addr.clone());
                                    tracing::trace!("Snap not ready yet: {}", snapshot_addr);
                                } else {
                                    tracing::trace!("Snap ready: {}", snapshot_addr);
                                }
                            }
                            Err(ref e) => {
                                not_ready.push(snapshot_addr.clone());
                                tracing::trace!(
                                    "Loading snapshot {} failed with: {e}. iteration {iteration}",
                                    snapshot_addr
                                );
                            }
                        };
                    }
                    if !not_ready.is_empty() {
                        tracing::trace!(
                            "Snapshots {} are not ready yet. Iteration #{}",
                            chunk_clone.format_short(),
                            iteration
                        );
                    }
                    chunk_clone = not_ready.to_vec();
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                }
                Ok(vec![])
            }
            .instrument(info_span!("check_if_snapshots_are_ready").or_current()),
        );
    }

    let mut unready_snapshots = HashSet::new();
    while let Some(res) = current_status.join_next().await {
        let val = res??;
        for el in val {
            unready_snapshots.insert(el);
        }
    }
    Ok(Vec::from_iter(unready_snapshots))
}
