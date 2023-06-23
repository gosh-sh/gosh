use crate::abi;
use crate::blockchain::call::BlockchainCall;
use crate::blockchain::{
    contract::{ContractInfo, ContractRead},
    serde_number::NumberU64,
    BlockchainContractAddress, BlockchainService, GoshContract,
};
use crate::config::UserWalletConfig;
use ton_client::crypto::KeyPair;

#[derive(Deserialize, Debug)]
struct GetConfigResult {
    #[serde(rename = "value0")]
    pub max_number_of_mirror_wallets: NumberU64,
}

#[derive(Deserialize, Debug)]
struct GetProfileAddrResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetAddrWalletResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetWalletMirrorsCountResult {
    #[serde(rename = "value0")]
    pub number_of_wallets: NumberU64,
}

#[instrument(level = "info", skip_all)]
pub(super) async fn get_number_of_user_wallet_mirrors_deployed<B, C>(
    blockchain: &B,
    wallet: &C,
) -> anyhow::Result<u64>
where
    B: BlockchainService + BlockchainCall,
    C: ContractRead + ContractInfo + Sync,
{
    tracing::trace!("get_number_of_user_wallet_mirrors_deployed: wallet={wallet:?}");
    let result: GetWalletMirrorsCountResult = wallet
        .read_state(blockchain.client(), "getWalletsCount", None)
        .await
        .map_err(|e| {
            tracing::trace!("get_number_of_user_wallet_mirrors_deployed error: {}", e);
            e
        })?;
    tracing::trace!(
        "get_number_of_user_wallet_mirrors_deployed result: {:?}",
        result
    );
    Ok(Into::<u64>::into(result.number_of_wallets) - 1)
}

#[instrument(level = "info", skip_all)]
pub(super) async fn get_user_wallet(
    blockchain: &impl BlockchainService,
    gosh_root: &GoshContract,
    dao_address: &BlockchainContractAddress,
    wallet: &UserWalletConfig,
    user_wallet_index: u64,
) -> anyhow::Result<GoshContract> {
    tracing::trace!("get_user_wallet: gosh_root.address={}, dao_address={dao_address}, wallet={wallet:?}, user_wallet_index={user_wallet_index}", gosh_root.address);
    let UserWalletConfig {
        pubkey,
        secret,
        profile,
    }: UserWalletConfig = blockchain
        .wallet_config()
        .clone()
        .ok_or_else(|| anyhow::anyhow!("Wallet config expected"))?;

    let result: GetProfileAddrResult = gosh_root
        .run_static(
            blockchain.client(),
            "getProfileAddr",
            Some(serde_json::json!({ "name": profile })),
        )
        .await
        .map_err(|e| {
            tracing::trace!("getProfileAddr error: {}", e);
            e
        })?;
    let dao_contract = GoshContract::new(dao_address, abi::DAO);

    let params = serde_json::json!({
        "pubaddr": result.address,
        "index": user_wallet_index
    });
    let result: GetAddrWalletResult = dao_contract
        .run_static(blockchain.client(), "getAddrWallet", Some(params))
        .await
        .map_err(|e| {
            tracing::trace!("getAddrWallet error: {}", e);
            e
        })?;
    let user_wallet_address = result.address;
    tracing::trace!("user_wallet address: {:?}", user_wallet_address);
    let secrets = KeyPair::new(pubkey.into(), secret.into());

    let contract = GoshContract::new_with_keys(&user_wallet_address, abi::WALLET, secrets);
    Ok(contract)
}

#[instrument(level = "info", skip_all)]
pub(super) async fn get_user_wallet_config_max_number_of_mirrors<B, C>(
    blockchain: &B,
    user_wallet_contract: &C,
) -> anyhow::Result<u64>
where
    B: BlockchainService + BlockchainCall,
    C: ContractRead + ContractInfo + Sync,
{
    tracing::trace!("get_user_wallet_config_max_number_of_mirrors: user_wallet_contract={user_wallet_contract:?}");
    let result: GetConfigResult = user_wallet_contract
        .read_state(blockchain.client(), "getConfig", None)
        .await?;
    tracing::trace!(
        "get_user_wallet_config_max_number_of_mirrors result: {:?}",
        result
    );
    let number = result.max_number_of_mirror_wallets.into();
    Ok(number)
}
