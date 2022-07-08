use crate::git_helper::GitHelper;
use crate::blockchain::GoshContract;
use crate::config::UserWalletConfig;
use crate::abi;
use ton_client::crypto::KeyPair;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

pub fn user_wallet(context: &GitHelper) -> Result<GoshContract> {
    let config = user_wallet_config(context);
    if config.is_none() {
        return Err("User wallet config must be set".into());
    }
    let config = config.expect("Guarded");
    let user_wallet_address = config.address;
    let secrets = KeyPair::new(config.pubkey, config.secret);

    let contract = GoshContract::new_with_keys(
        &user_wallet_address, 
        abi::WALLET, 
        secrets
    );
    return Ok(contract);
}

fn user_wallet_config(context: &GitHelper) -> Option<UserWalletConfig> {
    return context.config.find_network_user_wallet(&context.remote.network);
} 
