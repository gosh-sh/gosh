use crate::blockchain::call::BlockchainCall;
use crate::blockchain::{
    contract::{ContractInfo, ContractRead},
    serde_number::NumberU64,
    BlockchainContractAddress, BlockchainService, GoshContract,
};
use crate::config::UserWalletConfig;

use std::collections::HashMap;
use std::ops::Deref;
use std::ops::DerefMut;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::vec::Vec;

use tokio::sync::Mutex;
use tokio::sync::{Semaphore, SemaphorePermit};

use std::future::Future;

use super::inner_calls::{
    get_user_wallet
};

pub type TWalletMirrorIndex = u8;

#[derive(Clone)]
pub struct UserWalletsMirrorsInnerState {
    wallets: HashMap<TWalletMirrorIndex, GoshContract>,
    pub gosh_root: GoshContract,
    pub dao_address: BlockchainContractAddress,
    pub wallet_config: UserWalletConfig,
    pub max_number_of_wallets: Option<TWalletMirrorIndex>
}

impl UserWalletsMirrorsInnerState {
    pub fn wallets(&self) -> &HashMap<TWalletMirrorIndex, GoshContract> {
        &self.wallets
    }
    pub fn is_full(&self) -> bool {
        match self.max_number_of_wallets {
            None => false,
            Some(capacity) => {
                self.wallets.len() >= (capacity as usize)
            }
        }
    }
    pub(crate) fn new(
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
            max_number_of_wallets: None
        }
    }

    pub(super) fn empty() -> Self {
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
    pub fn add(&mut self, index: TWalletMirrorIndex, wallet: GoshContract) {
        self.wallets.insert(index, wallet);
    }
}

