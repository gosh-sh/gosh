use super::get_user_wallet;
use crate::blockchain::call::BlockchainCall;
use crate::blockchain::{
    contract::{ContractInfo, ContractRead},
    serde_number::NumberU64,
    BlockchainContractAddress, BlockchainService, GoshContract,
};
use crate::config::UserWalletConfig;

use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::ops::Deref;
use std::ops::DerefMut;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::vec::Vec;
use tokio::sync::RwLock;
use tokio::sync::{Mutex, MutexGuard};
use tokio::sync::{Semaphore, SemaphorePermit};

use std::future::Future;

use tokio::sync::OnceCell;

#[derive(Deserialize, Debug)]
struct GetConfigResult {
    #[serde(rename = "value0")]
    pub max_number_of_mirror_wallets: NumberU64,
}

pub struct UserWalletsMirrorsInnerState {
    wallets: HashMap<u64, GoshContract>,
    gosh_root: GoshContract,
    dao_address: BlockchainContractAddress,
    wallet_config: UserWalletConfig,
}
impl UserWalletsMirrorsInnerState {
    pub fn new(
        zero_wallet: GoshContract,
        gosh_root: GoshContract,
        dao_address: BlockchainContractAddress,
        wallet_config: UserWalletConfig,
    ) -> Self {
        let mut wallets = HashMap::new();
        wallets.insert(0, zero_wallet);
        Self {
            wallets,
            gosh_root,
            dao_address,
            wallet_config,
        }
    }
    fn empty() -> Self {
        let no_address = BlockchainContractAddress::new("");
        let no_contract = GoshContract::new(no_address.clone(), ("", ""));
        Self::new(
            no_contract.clone(),
            no_contract,
            no_address,
            UserWalletConfig {
                pubkey: "".to_string(),
                secret: "".to_string(),
                profile: "".to_string(),
            },
        )
    }
}

pub struct UserWalletMirrors {
    pool: Arc<Mutex<Vec<GoshContract>>>,
    max_possible_number_of_wallets: AtomicU64,
    pool_size: AtomicU64,
    deployments_in_flight: AtomicU64,
    semaphore: Arc<Semaphore>,
    max_number_of_aquires_per_mirror: u32,
    inner_mirrors_lock: Arc<Mutex<UserWalletsMirrorsInnerState>>,
}

pub struct UserWalletContractRef<'a> {
    mirrors: &'a UserWalletMirrors,
    contract: GoshContract,
    permit: SemaphorePermit<'a>,
}
impl<'a> Deref for UserWalletContractRef<'a> {
    type Target = GoshContract;

    fn deref(&self) -> &Self::Target {
        &self.contract
    }
}

impl<'a> Drop for UserWalletContractRef<'a> {
    fn drop(&mut self) {
        tokio::task::block_in_place(move || {
            let mut pool = self.mirrors.pool.blocking_lock();
            pool.push(self.contract.clone());
        });
    }
}
impl<'a> UserWalletContractRef<'a> {
    fn new(
        mirrors: &'a UserWalletMirrors,
        permit: SemaphorePermit<'a>,
        contract: GoshContract,
    ) -> Self {
        return Self {
            mirrors,
            contract,
            permit,
        };
    }
}

#[derive(Deserialize, Debug)]
struct GetWalletMirrorsCountResult {
    #[serde(rename = "value0")]
    pub number_of_mirrors: NumberU64,
}

impl UserWalletMirrors {
    pub fn empty(max_number_of_aquires_per_mirror: u32) -> Self {
        return Self {
            pool: Arc::new(Mutex::new(Vec::<GoshContract>::new())),
            max_possible_number_of_wallets: AtomicU64::new(0),
            pool_size: AtomicU64::new(0),
            deployments_in_flight: AtomicU64::new(0),
            semaphore: Arc::new(Semaphore::new(0)),
            max_number_of_aquires_per_mirror,
            inner_mirrors_lock: Arc::new(Mutex::new(UserWalletsMirrorsInnerState::empty())),
        };
    }
    pub async fn take_one(&self) -> anyhow::Result<UserWalletContractRef> {
        let permit = self.semaphore.acquire().await?;
        let mut pool = self.pool.lock().await;
        let contract: GoshContract = pool.pop().unwrap();
        return Ok(UserWalletContractRef::new(self, permit, contract));
    }

    pub fn is_ready(&self) -> bool {
        return self.pool_size.load(Ordering::SeqCst) > 0;
    }

    pub fn is_mirrors_ready(&self) -> bool {
        if !self.is_ready() {
            return false;
        }
        let max_number_of_wallets = self.max_possible_number_of_wallets.load(Ordering::SeqCst);
        if max_number_of_wallets == 0 {
            return false;
        }
        let pool_size = self.pool_size.load(Ordering::SeqCst);
        return pool_size >= max_number_of_wallets * (self.max_number_of_aquires_per_mirror as u64);
    }

    #[instrument(level = "debug", skip(self, blockchain))]
    pub(super) async fn try_init_mirrors<B>(&self, blockchain: &B) -> anyhow::Result<()>
    where
        B: BlockchainService + BlockchainCall,
    {
        if self.is_mirrors_ready() {
            return Ok(());
        }
        if let Ok(mut inner_state) = self.inner_mirrors_lock.try_lock() {
            if self.is_mirrors_ready() {
                return Ok(());
            }
            let state: &mut UserWalletsMirrorsInnerState = inner_state.deref_mut();
            let mirrors: &mut HashMap<u64, GoshContract> = &mut state.wallets;
            let zero_wallet = mirrors.get(&0u64).unwrap().clone();
            let mut max_number_of_mirrors =
                (self.max_possible_number_of_wallets.load(Ordering::SeqCst) as i32) - 1;
            if max_number_of_mirrors < 0 {
                max_number_of_mirrors =
                    get_user_wallet_config_max_number_of_mirrors(blockchain, &zero_wallet).await?
                        as i32;
                self.max_possible_number_of_wallets
                    .store((max_number_of_mirrors + 1) as u64, Ordering::SeqCst);
            }
            let max_number_of_mirrors = max_number_of_mirrors;
            let mirrors_deployed =
                get_number_of_user_wallet_mirrors_deployed(blockchain, &zero_wallet).await?;
            for wallet_index in 1..mirrors_deployed + 1 {
                if mirrors.get(&wallet_index).is_none() {
                    let get_mirror_result = get_user_wallet(
                        blockchain,
                        &state.gosh_root,
                        &state.dao_address,
                        &state.wallet_config,
                        wallet_index,
                    )
                    .await;
                    if let Ok(mirror) = get_mirror_result {
                        let mut pool_guard = self.pool.lock().await;
                        let pool: &mut Vec<GoshContract> = pool_guard.deref_mut();
                        UserWalletMirrors::add_mirror_instance(
                            wallet_index,
                            mirror,
                            pool,
                            self.max_number_of_aquires_per_mirror,
                            Arc::clone(&self.semaphore),
                            &self.pool_size,
                            mirrors,
                        );
                    }
                }
            }
            let missing_mirrors = max_number_of_mirrors - (mirrors_deployed as i32);
            for _ in 0..missing_mirrors {
                let _ = blockchain.call(&zero_wallet, "deployWallet", None).await;
            }
        }
        Ok(())
    }

    #[instrument(level = "debug", skip(self, f))]
    pub async fn init_zero_wallet<F, Fut>(&self, f: F) -> anyhow::Result<()>
    where
        F: FnOnce() -> Fut,
        Fut: Future<Output = anyhow::Result<UserWalletsMirrorsInnerState>>,
    {
        if self.is_ready() {
            return Ok(());
        }
        let mut mirrors = self.inner_mirrors_lock.lock().await;
        let mut pool = self.pool.lock().await;
        if self.is_ready() {
            return Ok(());
        }
        let zero_state = f().await?;
        *mirrors = zero_state;
        UserWalletMirrors::add_mirror_instance(
            0u64,
            mirrors.wallets.get(&0u64).unwrap().clone(),
            pool.deref_mut(),
            self.max_number_of_aquires_per_mirror,
            Arc::clone(&self.semaphore),
            &self.pool_size,
            &mut mirrors.wallets,
        );
        Ok(())
    }

    fn add_mirror_instance(
        wallet_index: u64,
        wallet: GoshContract,
        pool: &mut Vec<GoshContract>,
        max_number_of_aquires_per_mirror: u32,
        semaphore: Arc<Semaphore>,
        pool_size: &AtomicU64,
        mirrors: &mut HashMap<u64, GoshContract>,
    ) {
        for _ in 0..max_number_of_aquires_per_mirror {
            pool.push(wallet.clone());
        }
        semaphore.add_permits(max_number_of_aquires_per_mirror as usize);
        pool_size.fetch_add(max_number_of_aquires_per_mirror as u64, Ordering::SeqCst);
        mirrors.insert(wallet_index, wallet);
    }
}

#[instrument(level = "debug", skip(blockchain))]
async fn get_user_wallet_config_max_number_of_mirrors<B, C>(
    blockchain: &B,
    user_wallet_contract: &C,
) -> anyhow::Result<u64>
where
    B: BlockchainService + BlockchainCall,
    C: ContractRead + ContractInfo + Sync,
{
    let result: GetConfigResult = user_wallet_contract
        .read_state(blockchain.client(), "getConfig", None)
        .await?;
    let number = result.max_number_of_mirror_wallets.into();
    Ok(number)
}

#[instrument(level = "debug", skip(blockchain))]
async fn get_number_of_user_wallet_mirrors_deployed<B, C>(
    blockchain: &B,
    wallet: &C,
) -> anyhow::Result<u64>
where
    B: BlockchainService + BlockchainCall,
    C: ContractRead + ContractInfo + Sync,
{
    let result: GetWalletMirrorsCountResult = wallet
        .read_state(blockchain.client(), "getWalletsCount", None)
        .await?;
    Ok(Into::<u64>::into(result.number_of_mirrors) - 1)
}
