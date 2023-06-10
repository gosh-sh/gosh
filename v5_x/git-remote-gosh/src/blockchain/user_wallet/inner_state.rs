use crate::blockchain::{BlockchainContractAddress, GoshContract};
use crate::config::UserWalletConfig;

use std::collections::HashMap;

pub type TWalletMirrorIndex = u8;

#[derive(Clone, Debug)]
pub enum Wallet {
    Contract(GoshContract),
    NonExistent(BlockchainContractAddress),
}

#[derive(Clone)]
pub struct UserWalletsMirrorsInnerState {
    wallets: HashMap<TWalletMirrorIndex, Wallet>,
    pub gosh_root: GoshContract,
    pub dao_address: BlockchainContractAddress,
    pub wallet_config: UserWalletConfig,
    pub max_number_of_wallets: Option<TWalletMirrorIndex>,
}

impl UserWalletsMirrorsInnerState {
    pub fn wallets(&self) -> &HashMap<TWalletMirrorIndex, Wallet> {
        &self.wallets
    }
    pub fn is_full(&self) -> bool {
        match self.max_number_of_wallets {
            None => false,
            Some(capacity) => self.wallets.len() >= (capacity as usize),
        }
    }
    pub(crate) fn new(
        zero_wallet: Wallet,
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
            max_number_of_wallets: None,
        }
    }

    pub(super) fn empty() -> Self {
        let no_address = BlockchainContractAddress::new("");
        let no_contract = GoshContract::new(no_address.clone(), ("", ""));
        let wallet_config = UserWalletConfig {
            pubkey: "".to_string(),
            secret: "".to_string(),
            profile: "".to_string(),
        };
        Self {
            wallets: HashMap::new(),
            gosh_root: no_contract,
            dao_address: no_address,
            wallet_config,
            max_number_of_wallets: None,
        }
    }
    pub fn add(&mut self, index: TWalletMirrorIndex, wallet: GoshContract) {
        self.wallets.insert(index, Wallet::Contract(wallet));
    }
}
