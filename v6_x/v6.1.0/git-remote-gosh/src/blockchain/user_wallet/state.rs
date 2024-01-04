use crate::blockchain::call::BlockchainCall;
use crate::blockchain::user_wallet::inner_calls;
use crate::blockchain::{BlockchainContractAddress, BlockchainService, GoshContract};

use std::ops::Deref;
use std::sync::atomic::{AtomicU64, Ordering};
use std::vec::Vec;

use anyhow::bail;
use thiserror::Error;

use tokio::sync::Mutex;
use tokio::sync::RwLock;
use tokio::sync::{Semaphore, SemaphorePermit};

use super::inner_calls::{
    get_number_of_user_wallet_mirrors_deployed, get_user_wallet,
    get_user_wallet_config_max_number_of_mirrors,
};
use super::inner_state::{TWalletMirrorIndex, UserWalletsMirrorsInnerState, Wallet};

const WALLET_CONTRACTS_PARALLELISM: usize = 100usize;
const GOSH_REMOTE_WALLET_PARALLELISM: &str = "GOSH_REMOTE_WALLET_PARALLELISM";

#[derive(Error, Debug)]
pub enum WalletError {
    #[error("there is no zero wallet")]
    ZeroWalletNotExists,
    #[error("operation failed. retrying...")]
    Other(anyhow::Error),
}

pub struct UserWalletContractRef<'a> {
    mirrors: &'a UserWalletMirrors,
    pub permit: SemaphorePermit<'a>,
    mirror_index: TWalletMirrorIndex,
    contract: GoshContract,
}

impl<'a> Deref for UserWalletContractRef<'a> {
    type Target = GoshContract;

    fn deref(&self) -> &Self::Target {
        &self.contract
    }
}

impl<'a> Drop for UserWalletContractRef<'a> {
    fn drop(&mut self) {
        self.mirrors.release_wallet(self.mirror_index);
    }
}

impl<'a> UserWalletContractRef<'a> {
    fn new(
        mirrors: &'a UserWalletMirrors,
        permit: SemaphorePermit<'a>,
        mirror_index: TWalletMirrorIndex,
        contract: GoshContract,
    ) -> Self {
        Self {
            mirrors,
            permit,
            mirror_index,
            contract,
        }
    }
}

pub struct UserWalletMirrors {
    inner: RwLock<UserWalletsMirrorsInnerState>,
    acquisitions: [AtomicU64; TWalletMirrorIndex::MAX as usize],
    semaphore: Semaphore,
    mirror_updates_lock: Mutex<()>,
}

impl UserWalletMirrors {
    const ZERO_WALLET_INDEX: TWalletMirrorIndex = 0 as TWalletMirrorIndex;

    pub fn new() -> Self {
        const N: usize = TWalletMirrorIndex::MAX as usize;
        let acquisitions: [AtomicU64; N] = [(); N].map(|_| AtomicU64::new(0));
        Self {
            inner: RwLock::new(UserWalletsMirrorsInnerState::empty()),
            acquisitions,
            semaphore: Semaphore::new(0),
            mirror_updates_lock: Mutex::new(()),
        }
    }

    pub async fn find_zero_wallet(&self) -> Option<Wallet> {
        let inner_state = self.inner.read().await;

        inner_state
            .wallets()
            .get(&UserWalletMirrors::ZERO_WALLET_INDEX)
            .cloned()
    }

    pub async fn is_zero_wallet_ready(&self) -> bool {
        let zero_wallet = self.find_zero_wallet().await;

        match zero_wallet {
            Some(Wallet::Contract(_)) => true,
            _ => false,
        }
    }

    pub async fn is_mirrors_ready(&self) -> bool {
        self.inner.read().await.is_full()
    }

    pub async fn init_zero_wallet(
        &self,
        blockchain: &impl BlockchainService,
        dao_address: &BlockchainContractAddress,
        remote_network: &str,
    ) -> anyhow::Result<()> {
        // read lock
        {
            match self.find_zero_wallet().await {
                Some(Wallet::Contract(_)) => return Ok(()),
                Some(Wallet::NonExistent(_)) => bail!(WalletError::ZeroWalletNotExists),
                None => (),
            };
        }

        // write lock
        {
            let wallet_config = blockchain.wallet_config().clone().ok_or(anyhow::anyhow!(
                "Local GOSH config does not contain user data. Please go to the web version and copy GOSH config from settings."
            ))?;
            let zero_contract: GoshContract = inner_calls::get_user_wallet(
                blockchain,
                blockchain.root_contract(),
                &dao_address,
                &wallet_config,
                0,
            )
            .await?;

            let is_active = zero_contract.is_active(&blockchain.client()).await?;

            let mut inner_state = self.inner.write().await;
            *inner_state = UserWalletsMirrorsInnerState::new(
                if is_active {
                    Wallet::Contract(zero_contract)
                } else {
                    Wallet::NonExistent(zero_contract.address)
                },
                blockchain.root_contract().to_owned(),
                dao_address.to_owned(),
                wallet_config.to_owned(),
            );
            let wallet_parallelism = std::env::var(GOSH_REMOTE_WALLET_PARALLELISM)
                .ok()
                .map(|num| usize::from_str_radix(&num, 10).ok())
                .flatten()
                .unwrap_or(WALLET_CONTRACTS_PARALLELISM);
            tracing::trace!("Add permits to wallet semaphore: {wallet_parallelism}");
            self.semaphore.add_permits(wallet_parallelism);
        }
        Ok(())
    }

    pub(super) async fn try_init_mirrors<B>(
        &self, blockchain: &B,
        dao_address: &BlockchainContractAddress,
    ) -> anyhow::Result<()>
    where
        B: BlockchainService + BlockchainCall,
    {
        if let Ok(lock) = self.mirror_updates_lock.try_lock() {
            let inner_state = { self.inner.read().await.clone() };
            let already_initialized_wallet_indexes: Vec<TWalletMirrorIndex> =
                { inner_state.wallets().keys().cloned().collect() };
            if let Some(max_number_of_wallets) = inner_state.max_number_of_wallets {
                if usize::from(max_number_of_wallets) <= already_initialized_wallet_indexes.len() {
                    return Ok(());
                }
            }
            tracing::trace!("inner wallets state {:#?}", inner_state.wallets());

            let zero_wallet = if let Wallet::Contract(zero_wallet) =
                inner_state.wallets()[&UserWalletMirrors::ZERO_WALLET_INDEX].clone()
            {
                zero_wallet
            } else {
                bail!(WalletError::ZeroWalletNotExists)
            };
            let available_mirrors_count =
                get_number_of_user_wallet_mirrors_deployed(blockchain, &zero_wallet).await?;
            for i in 0..available_mirrors_count {
                let wallet_index = (i + 1) as TWalletMirrorIndex;
                if !already_initialized_wallet_indexes.contains(&wallet_index) {
                    let get_mirror_result = get_user_wallet(
                        blockchain,
                        &inner_state.gosh_root,
                        &inner_state.dao_address,
                        &inner_state.wallet_config,
                        wallet_index as u64,
                    )
                    .await;
                    match get_mirror_result {
                        Err(e) => {
                            tracing::debug!("Error in get_user_wallet: {}", e);
                        }
                        Ok(mirror) => {
                            self.inner.write().await.add(wallet_index, mirror);
                            let wallet_parallelism = std::env::var(GOSH_REMOTE_WALLET_PARALLELISM)
                                .ok()
                                .map(|num| usize::from_str_radix(&num, 10).ok())
                                .flatten()
                                .unwrap_or(WALLET_CONTRACTS_PARALLELISM);
                            tracing::trace!(
                                "Add permits to wallet semaphore: {wallet_parallelism}"
                            );
                            self.semaphore.add_permits(wallet_parallelism);
                        }
                    }
                }
            }

            let max_number_of_wallets = {
                let max_number_of_wallets = { inner_state.max_number_of_wallets };
                match max_number_of_wallets {
                    Some(w) => w,
                    None => {
                        let n = get_user_wallet_config_max_number_of_mirrors(
                            blockchain,
                            dao_address
                        )
                        .await?;
                        let mut inner_state = self.inner.write().await;
                        let w: TWalletMirrorIndex = (n + 1) as TWalletMirrorIndex;
                        inner_state.max_number_of_wallets = Some(w);
                        w
                    }
                }
            };
            for _ in available_mirrors_count + 1..max_number_of_wallets as u64 {
                let _ = blockchain.call(&zero_wallet, "deployWallet", None).await;
            }
            drop(lock);
        }
        Ok(())
    }

    pub async fn take_zero_wallet(&self) -> anyhow::Result<GoshContract> {
        let zero_wallet = self.find_zero_wallet().await;

        let contract = match zero_wallet {
            Some(Wallet::Contract(wallet)) => wallet,
            _ => bail!(WalletError::ZeroWalletNotExists),
        };

        Ok(contract)
    }

    pub async fn take_one(&self) -> anyhow::Result<UserWalletContractRef> {
        let permit = self.semaphore.acquire().await?;
        let inner_state = { self.inner.read().await.clone() };
        let available_wallet_indexes: Vec<TWalletMirrorIndex> =
            inner_state.wallets().keys().cloned().collect();
        let mut min_used_wallet_index: TWalletMirrorIndex = available_wallet_indexes[0];
        let mut min_used_wallet_usage =
            self.acquisitions[min_used_wallet_index as usize].load(Ordering::SeqCst);
        for i in available_wallet_indexes {
            let usage = self.acquisitions[i as usize].load(Ordering::SeqCst);
            if usage < min_used_wallet_usage {
                min_used_wallet_index = i;
                min_used_wallet_usage = usage;
            }
        }
        let contract = if let Wallet::Contract(contract) =
            inner_state.wallets()[&min_used_wallet_index].clone()
        {
            contract
        } else {
            bail!(WalletError::ZeroWalletNotExists)
        };
        self.acquisitions[min_used_wallet_index as usize].fetch_add(1, Ordering::SeqCst);
        Ok(UserWalletContractRef::new(
            self,
            permit,
            min_used_wallet_index,
            contract,
        ))
    }

    fn release_wallet(&self, wallet_index: TWalletMirrorIndex) {
        self.acquisitions[wallet_index as usize].fetch_sub(1, Ordering::SeqCst);
    }
}
