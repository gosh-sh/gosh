use crate::abi;
use crate::blockchain::GoshContract;
use crate::config::UserWalletConfig;
use crate::git_helper::GitHelper;
use crate::blockchain::TonClient;
use ton_client::crypto::KeyPair;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;


#[derive(Deserialize, Debug)]
struct GetAddrWalletResult {
    #[serde(rename = "value0")]
    pub address: String,
}

pub async fn get_user_wallet(client: &TonClient, dao_address: &str, pubkey: &str, secret: &str)  -> Result<GoshContract> {
    // let gosh_root_contract = GoshContract::new(
    //     gosh_root_contract_address,
    //     abi::GOSH
    // );
     
    // let dao_address: GetAddrDaoResult = gosh_root_contract.run_static(
    //     &client,
    //     "getAddrDao",
    //     Some(serde_json::json!({
    //         "name": dao_name
    //     }))
    // ).await?;
    let dao_contract = GoshContract::new(
        &dao_address,
        abi::DAO
    );
    let result: GetAddrWalletResult = dao_contract.run_local(
        &client, 
        "getAddrWallet",
        Some(serde_json::json!({
            "pubkey": format!("0x{}", pubkey),
            "index": 0
        }))
    ).await?;
    let user_wallet_address = result.address;
    log::trace!("user_wallet address: {:?}", user_wallet_address);
    let secrets = KeyPair::new(pubkey.into(), secret.into());

    let contract = GoshContract::new_with_keys(&user_wallet_address, abi::WALLET, secrets);
    Ok(contract)
}

lazy_static! {
    static ref _USER_WALLET: std::sync::RwLock<Option<GoshContract>> = std::sync::RwLock::new(None);
}

#[instrument(level = "debug", skip(context))]
pub async fn user_wallet(context: &GitHelper) -> Result<GoshContract> {
    if _USER_WALLET.read().unwrap().is_none() {
        let mut user_wallet = _USER_WALLET.write().unwrap();
        if user_wallet.is_none() {
            let config = user_wallet_config(context);
            if config.is_none() {
                return Err("User wallet config must be set".into());
            }
            let config = config.expect("Guarded");
            *user_wallet = Some(get_user_wallet(
                &context.es_client,
                &context.dao_addr,
                &config.pubkey,
                &config.secret
            ).await?);
        }
    };

    Ok(_USER_WALLET.read().unwrap().as_ref().unwrap().clone())
}

fn user_wallet_config(context: &GitHelper) -> Option<UserWalletConfig> {
    return context
        .config
        .find_network_user_wallet(&context.remote.network);
}
