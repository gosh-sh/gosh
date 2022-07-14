use crate::abi;
use crate::blockchain::GoshContract;
use crate::config::UserWalletConfig;
use crate::git_helper::GitHelper;
use serde::{
    Serializer,
    Serialize,
    ser::SerializeSeq
};
use ton_client::crypto::KeyPair;
use primitive_types::U256;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;


#[derive(Deserialize, Debug)]
struct GetAddrWalletResult {
    #[serde(rename = "value0")]
    pub address: String,
}


pub async fn user_wallet(context: &GitHelper) -> Result<GoshContract> {
    let config = user_wallet_config(context);
    if config.is_none() {
        return Err("User wallet config must be set".into());
    }
    let config = config.expect("Guarded");
    let dao_contract = GoshContract::new(
        &context.remote.gosh,
        abi::DAO
    );
    let pubkey = U256::from_str_radix(&config.pubkey, 16)?;
    let pubkey = pubkey.to_string(); 
    let result: GetAddrWalletResult = dao_contract.run_local(
        &context.es_client, 
        "getAddrWallet",
        Some(serde_json::json!({
            "pubkey": pubkey,
            "index": 0
        }))
    ).await?;
    let user_wallet_address = result.address; 
    log::trace!("user_wallet address: {:?}", user_wallet_address);
    let secrets = KeyPair::new(config.pubkey, config.secret);

    let contract = GoshContract::new_with_keys(&user_wallet_address, abi::WALLET, secrets);
    return Ok(contract);
}

fn user_wallet_config(context: &GitHelper) -> Option<UserWalletConfig> {
    return context
        .config
        .find_network_user_wallet(&context.remote.network);
}
