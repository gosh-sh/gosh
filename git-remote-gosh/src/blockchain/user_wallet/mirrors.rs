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
use std::sync::atomic::{AtomicU64, Ordering};
use std::vec::Vec;
use tokio::sync::Mutex;
use tokio::sync::RwLock;

use tokio::sync::OnceCell;

#[derive(Deserialize, Debug)]
struct GetConfigResult {
    #[serde(rename = "value0")]
    pub max_number_of_mirror_wallets: NumberU64,
}

#[derive(Clone)]
struct UserWalletMirrors {
    mirrors: HashMap<u64, GoshContract>,
    initialized_mirrors: Vec<u64>,
    max_possible_number_of_wallets: u64,
    deployments_in_flight: u64,
}

#[derive(Deserialize, Debug)]
struct GetWalletMirrorsCountResult {
    #[serde(rename = "value0")]
    pub number_of_mirrors: NumberU64,
}

static NEXT_WALLET_INDEX: AtomicU64 = AtomicU64::new(0);
static MIRRORS: Lazy<RwLock<UserWalletMirrors>> =
    Lazy::new(|| RwLock::new(UserWalletMirrors::empty()));
static USER_WALLET_MIRRORS_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));
static INIT_MIRRORS: OnceCell<u32> = OnceCell::const_new();

#[instrument(level = "debug", skip(blockchain, wallet_config))]
pub(super) async fn take_next_wallet<B>(
    blockchain: &B,
    zero_wallet: GoshContract,
    gosh_root: &GoshContract,
    dao_address: &BlockchainContractAddress,
    wallet_config: &UserWalletConfig,
) -> GoshContract
where
    B: BlockchainService + BlockchainCall,
{
    let current_index = NEXT_WALLET_INDEX.fetch_add(1, Ordering::SeqCst);
    INIT_MIRRORS
        .get_or_init(|| async {
            let initialization_result = UserWalletMirrors::try_initialize(
                &MIRRORS,
                blockchain,
                &zero_wallet,
                gosh_root,
                dao_address,
                wallet_config,
            )
            .await;
            if let Err(e) = initialization_result {
                tracing::debug!(
                    "Error while initializing user wallet mirrors occured: {}",
                    e
                );
            }
            1
        })
        .await;
    let is_initialized = { MIRRORS.read().await.is_initialized() };
    if !is_initialized {
        let initialization_result = UserWalletMirrors::try_initialize(
            &MIRRORS,
            blockchain,
            &zero_wallet,
            gosh_root,
            dao_address,
            wallet_config,
        )
        .await;
        if let Err(e) = initialization_result {
            tracing::debug!(
                "Error while initializing user wallet mirrors occured: {}",
                e
            );
        }
    }
    // Retry read state
    // Note: It may still be uninitialized, yet should continue with zero wallet.
    let state = MIRRORS.read().await;
    let n = current_index % (state.get_available_mirrors_count() + 1);
    if n == 0 {
        return zero_wallet;
    } else {
        return state.get_mirror_by_index(n);
    }
}

impl UserWalletMirrors {
    pub fn empty() -> Self {
        return Self {
            mirrors: HashMap::new(),
            initialized_mirrors: Vec::new(),
            max_possible_number_of_wallets: 0u64,
            deployments_in_flight: 0u64,
        };
    }
    pub fn is_initialized(&self) -> bool {
        return self.max_possible_number_of_wallets > 0
            && self.get_available_mirrors_count() + 1 < self.max_possible_number_of_wallets;
    }
    pub fn get_mirror_by_index(&self, index: u64) -> GoshContract {
        // Note: index is shifted due to the zero wallet.
        let mirror_id = self.initialized_mirrors[(index - 1) as usize];
        self.mirrors
            .get(&mirror_id)
            .expect("mirror struct must be consistent")
            .clone()
    }
    pub fn get_available_mirrors_count(&self) -> u64 {
        self.initialized_mirrors.len() as u64
    }
    pub async fn try_initialize<B>(
        mirrors: &RwLock<UserWalletMirrors>,
        blockchain: &B,
        zero_wallet: &GoshContract,
        gosh_root: &GoshContract,
        dao_address: &BlockchainContractAddress,
        wallet_config: &UserWalletConfig,
    ) -> anyhow::Result<()>
    where
        B: BlockchainService + BlockchainCall,
    {
        // Trying to aquire lock to update max number of wallets
        // Ignore this run if it's been taken already.
        // Some other task is in the process of updating that global.
        if let Ok(guard) = USER_WALLET_MIRRORS_LOCK.try_lock() {
            let mut current_state: UserWalletMirrors = { mirrors.read().await.clone() };
            if current_state.max_possible_number_of_wallets == 0 {
                let max_number_of_mirrors =
                    get_user_wallet_config_max_number_of_mirrors(blockchain, zero_wallet).await?;
                current_state.max_possible_number_of_wallets = 1 + max_number_of_mirrors;
                // Checkpoint in case some other failure down the line
                {
                    let mut mirrors_state = mirrors.write().await;
                    *mirrors_state = current_state.clone();
                }
            }
            if current_state.get_available_mirrors_count() + 1
                < current_state.max_possible_number_of_wallets
            {
                // Read blockchain state regarding the number of onchain mirrors
                let mirrors_deployed =
                    get_number_of_user_wallet_mirrors_deployed(blockchain, zero_wallet).await?;
                for index in 0..mirrors_deployed {
                    let wallet_index = 1 + index;
                    if current_state.mirrors.get(&wallet_index).is_none() {
                        let user_wallet_mirror_result = get_user_wallet(
                            blockchain,
                            gosh_root,
                            dao_address,
                            wallet_config,
                            wallet_index,
                        )
                        .await;
                        match user_wallet_mirror_result {
                            Ok(user_wallet_mirror) => {
                                current_state
                                    .mirrors
                                    .insert(wallet_index, user_wallet_mirror);
                                current_state.initialized_mirrors.push(wallet_index);
                                // Checkpoint
                                {
                                    let mut mirrors_state = mirrors.write().await;
                                    *mirrors_state = current_state.clone();
                                }
                            }
                            Err(e) => {
                                tracing::debug!("Error while getting mirror wallet occured: {}", e);
                            }
                        }
                    }
                }

                let missing_mirrors = current_state.max_possible_number_of_wallets
                    - 1
                    - mirrors_deployed
                    - current_state.deployments_in_flight;
                for _ in 0..missing_mirrors {
                    if let Ok(_) = blockchain.call(zero_wallet, "deployWallet", None).await {
                        current_state.deployments_in_flight += 1;
                        // Checkpoint
                        {
                            let mut mirrors_state = mirrors.write().await;
                            *mirrors_state = current_state.clone();
                        }
                    }
                }
            }
        }
        Ok(())
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
