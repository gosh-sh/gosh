use crate::blockchain::blockchain_contract_address::FormatShort;
use crate::blockchain::{BlockchainContractAddress, BlockchainService, Snapshot};
use std::collections::HashSet;
use tokio::task::JoinSet;
use tracing::Instrument;

const MAX_RETRIES_FOR_SNAP_READINESS: i32 = 20;

#[instrument(level = "info", skip_all)]
pub async fn wait_snapshots_until_ready<B>(
    blockchain: &B,
    addresses: &[BlockchainContractAddress],
) -> anyhow::Result<Vec<BlockchainContractAddress>>
where
    B: BlockchainService + 'static,
{
    tracing::trace!("wait_snapshots_until_ready: snapshots={addresses:?}");
    let mut current_status = JoinSet::<anyhow::Result<Vec<BlockchainContractAddress>>>::new();

    let mut expected_snapshots = Vec::from(addresses);
    let b = blockchain.clone();
    current_status.spawn(
        async move {
            let mut iteration = 0;
            while !expected_snapshots.is_empty() {
                iteration += 1;
                if iteration > MAX_RETRIES_FOR_SNAP_READINESS {
                    tracing::trace!(
                        "Some contracts didn't appear in time: {}",
                        expected_snapshots.format_short()
                    );
                    return Ok(expected_snapshots);
                }
                let mut not_ready = Vec::<BlockchainContractAddress>::new();
                for snapshot_addr in expected_snapshots.clone() {
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
                        expected_snapshots.format_short(),
                        iteration
                    );
                }
                expected_snapshots = not_ready;
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            }
            Ok(vec![])
        }
        .instrument(info_span!("ckeck if snapshots are ready").or_current()),
    );

    let mut unready_snapshots = HashSet::new();
    while let Some(res) = current_status.join_next().await {
        let val = res??;
        for el in val {
            unready_snapshots.insert(el);
        }
    }
    Ok(Vec::from_iter(unready_snapshots))
}
