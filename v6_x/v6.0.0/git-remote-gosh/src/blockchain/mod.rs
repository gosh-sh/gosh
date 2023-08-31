#![allow(unused_variables)]
use base64;
use base64_serde::base64_serde_type;

use serde::Deserialize;
use serde_json;
use tracing_futures::Instrument;

use std::sync::Arc;

pub mod branch;
mod call;
pub mod contract;
mod error;
use error::RunLocalError;
pub mod service;
pub use service::*;

use ton_client::{
    abi::{
        encode_initial_data, encode_message, Abi, CallSet, ParamsOfEncodeInitialData,
        ParamsOfEncodeMessage, ResultOfEncodeInitialData, Signer,
    },
    boc::{
        cache_set, get_boc_hash, BocCacheType, ParamsOfBocCacheSet, ParamsOfGetBocHash,
        ResultOfBocCacheSet, ResultOfGetBocHash,
    },
    net::{query_collection, ParamsOfQuery, ParamsOfQueryCollection},
    processing::ProcessingEvent,
    tvm::{run_tvm, ParamsOfRunTvm},
    ClientContext,
};

mod blockchain_contract_address;
pub use blockchain_contract_address::{BlockchainContractAddress, FormatShort};
pub mod commit;
mod serde_number;
pub mod snapshot;
pub mod tag;
pub mod tree;
mod tvm_hash;
pub mod user_wallet;
pub use crate::{
    abi as gosh_abi,
    config::{self, UserWalletConfig},
};
pub use commit::GoshCommit;
use once_cell::sync::Lazy;
use serde_number::Number;
pub use snapshot::Snapshot;
use std::collections::HashMap;

use tokio::sync::RwLock;

use ton_client::boc::{encode_state_init, ParamsOfEncodeStateInit, ResultOfEncodeStateInit};
pub use tree::Tree;
pub use tvm_hash::tvm_hash;

use self::contract::{ContractRead, ContractStatic, GoshContract};

pub const ZERO_SHA: &str = "0000000000000000000000000000000000000000";
pub const EMPTY_BLOB_SHA1: &str = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
pub const EMPTY_BLOB_SHA256: &str =
    "0x96a296d224f285c67bee93c30f8a309157f0daa35dc5b87e410b78630a09cfc7";

pub const MAX_ACCOUNTS_ADDRESSES_PER_QUERY: usize = 255;

static PINNED_CONTRACT_BOCREFS: Lazy<
    Arc<RwLock<HashMap<BlockchainContractAddress, (String, EverClient)>>>,
> = Lazy::new(|| Arc::new(RwLock::new(HashMap::new())));

#[repr(u8)]
pub enum GoshBlobBitFlags {
    Binary = 1,
    Compressed = 2,
    Ipfs = 4,
}

#[repr(u8)]
pub enum ContractKind {
    Dao,
    Wallet,
    Repo,
    Commit,
    Tree,
    Snapshot,
    Diff,
    Tag,
}

base64_serde_type!(Base64Standard, base64::engine::general_purpose::STANDARD);

#[derive(Deserialize)]
pub struct GoshBlob {
    sha: String,
    commit: String,
    #[serde(with = "Base64Standard")]
    pub content: Vec<u8>,
    pub ipfs: String,
    pub flags: Number,
}

#[derive(Deserialize, Debug)]
pub struct AccountBoc {
    boc: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AddrVersion {
    #[serde(rename = "addr")]
    pub address: BlockchainContractAddress,

    #[serde(rename = "version")]
    pub version: String,
}

#[derive(Deserialize, Debug)]
struct CallResult {
    #[serde(rename = "id")]
    trx_id: String,
    status: u8,
    #[serde(with = "ton_sdk::json_helper::uint")]
    total_fees: u64,
    in_msg: String,
    out_msgs: Vec<String>,
}

#[derive(Deserialize, Debug)]
struct SendMessageResult {
    shard_block_id: String,
    message_id: String,
    sending_endpoints: Vec<String>,
}

#[derive(Deserialize, Debug)]
pub struct GetNameCommitResult {
    #[serde(rename = "value0")]
    pub name: String,
}

#[derive(Deserialize, Debug)]
pub struct GetNameBranchResult {
    #[serde(rename = "value0")]
    pub name: String,
}

#[derive(Deserialize, Debug)]
struct GetRepoAddrResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetCommitAddrResult {
    #[serde(rename = "value0")]
    pub address: BlockchainContractAddress,
}

#[derive(Deserialize, Debug)]
struct GetBoolResult {
    #[serde(rename = "value0")]
    pub is_ok: bool,
}

#[derive(Deserialize, Debug, Clone)]
pub struct BranchRef {
    #[serde(rename = "branchname")]
    pub branch_name: String,

    #[serde(rename = "commitaddr")]
    pub commit_address: BlockchainContractAddress,

    #[serde(rename = "commitversion")]
    pub version: String,
}

#[derive(Deserialize, Debug)]
pub struct GetAllAddressResult {
    #[serde(rename = "value0")]
    pub branch_ref: Vec<BranchRef>,
}

#[derive(Deserialize, Debug)]
pub struct GetContractCodeResult {
    #[serde(rename = "value0")]
    pub code: String,
}

#[derive(Deserialize, Debug)]
pub struct Account {
    #[serde(rename = "id")]
    pub address: String,
}

#[derive(Deserialize, Clone)]
pub struct GetTagContentResult {
    #[serde(rename = "value0")]
    pub content: String,
}

#[derive(Deserialize, Debug, Clone)]
struct GetAddrBranchResult {
    #[serde(rename = "value0")]
    pub branch: BranchRef,
}

#[derive(Deserialize, Debug)]
struct GetHeadResult {
    #[serde(rename = "value0")]
    pub head: String,
}

#[derive(Deserialize, Debug)]
struct GetVersionResult {
    #[serde(rename = "value0")]
    pub contract_name: String,
    #[serde(rename = "value1")]
    pub version: String,
}

pub type EverClient = Arc<ClientContext>;

#[derive(Builder)]
pub struct Everscale {
    wallet_config: Option<UserWalletConfig>,
    ever_client: EverClient,
    root_contract: GoshContract,
    repo_contract: GoshContract,
}

impl Clone for Everscale {
    fn clone(&self) -> Self {
        Self {
            wallet_config: self.wallet_config.clone(),
            ever_client: Arc::clone(&self.ever_client),
            root_contract: self.root_contract.clone(),
            repo_contract: self.repo_contract.clone(),
        }
    }
}

#[instrument(level = "trace", skip_all)]
async fn check_contracts_deployed(
    context: &EverClient,
    contracts_addresses: &[BlockchainContractAddress],
    allow_incomplete_results: bool,
) -> anyhow::Result<Vec<BlockchainContractAddress>> {
    tracing::trace!("get_contracts_blocks: allow_incomplete_results={allow_incomplete_results}");
    if contracts_addresses.is_empty() {
        return Ok(vec![]);
    }
    tracing::trace!("internal get_contracts_blocks start");
    let mut accounts_bocs = vec![];
    for chunk in contracts_addresses.chunks(MAX_ACCOUNTS_ADDRESSES_PER_QUERY) {
        let addresses: &[String] = &chunk
            .iter()
            .map(|e| -> String { <&BlockchainContractAddress as Into<String>>::into(e) })
            .collect::<Vec<String>>();
        let filter = serde_json::json!({
            "id": {
                "in": addresses
            }
        });
        // This log is too big and is printed too often
        // tracing::trace!("Filter: {}", filter.to_string());
        let query_result: Vec<serde_json::Value> = query_collection(
            Arc::clone(context),
            ParamsOfQueryCollection {
                collection: "accounts".to_owned(),
                filter: Some(filter),
                result: "id".to_owned(),
                limit: Some(contracts_addresses.len() as u32),
                order: None,
            },
        )
        .instrument(info_span!("get_contracts_blocks sdk::query_collection").or_current())
        .await
        .map(|r| r.result)?;
        if query_result.len() != contracts_addresses.len() {
            if !allow_incomplete_results {
                anyhow::bail!(
                    "Some accounts are missing. Expecting {} boc results while have {}",
                    contracts_addresses.len(),
                    query_result.len()
                );
            } else {
                tracing::trace!(
                    "Got incomplete result: {} out of {}",
                    query_result.len(),
                    contracts_addresses.len()
                );
            }
        }
        for r in query_result.iter() {
            let address = BlockchainContractAddress::new(
                r["id"]
                    .as_str()
                    .expect("address must be a string")
                    .to_owned(),
            );
            accounts_bocs.push(address);
        }
    }
    return Ok(accounts_bocs);
}

#[instrument(level = "info", skip_all)]
async fn run_local(
    context: &EverClient,
    contract: &GoshContract,
    function_name: &str,
    args: Option<serde_json::Value>,
) -> anyhow::Result<serde_json::Value> {
    tracing::trace!("internal run_local start");
    tracing::trace!("read_state: function_name={function_name}, args={args:?}");
    let filter = Some(serde_json::json!({
        "id": { "eq": contract.address }
    }));
    let query = query_collection(
        Arc::clone(context),
        ParamsOfQueryCollection {
            collection: "accounts".to_owned(),
            filter,
            result: "boc".to_owned(),
            limit: Some(1),
            order: None,
        },
    )
    .instrument(info_span!("run_local sdk::query_collection").or_current())
    .await
    .map(|r| r.result)?;

    if query.is_empty() {
        anyhow::bail!(
            "account with address {} not found. Was trying to call {}",
            contract.address,
            function_name,
        );
    }
    let account_boc = &query[0]["boc"].as_str();
    if account_boc.is_none() {
        anyhow::bail!(
            "account with address {} does not contain boc",
            contract.address,
        );
    }
    let call_set = match args {
        Some(value) => CallSet::some_with_function_and_input(function_name, value),
        None => CallSet::some_with_function(function_name),
    };

    let encoded = encode_message(
        Arc::clone(context),
        ParamsOfEncodeMessage {
            abi: contract.abi.clone(),
            address: Some(String::from(contract.address.clone())),
            call_set,
            signer: Signer::None,
            deploy_set: None,
            processing_try_index: None,
            signature_id: None,
        },
    )
    .instrument(info_span!("run_local sdk::encode_message").or_current())
    .await
    .map_err(|e| Box::new(RunLocalError::from(&e)))?;

    let result = run_tvm(
        Arc::clone(context),
        ParamsOfRunTvm {
            message: encoded.message,
            account: account_boc.unwrap().to_string(),
            abi: Some(contract.abi.clone()),
            boc_cache: None,
            execution_options: None,
            return_updated_account: None,
        },
    )
    .instrument(info_span!("run_local sdk::run_tvm").or_current())
    .await
    .map(|r| r.decoded.unwrap())
    .map(|r| r.output.unwrap())
    .map_err(|e| anyhow::format_err!("run_local failed: {e}"))?;

    Ok(result)
}

#[instrument(level = "info", skip_all)]
async fn run_static(
    context: &EverClient,
    contract: &GoshContract,
    function_name: &str,
    args: Option<serde_json::Value>,
) -> anyhow::Result<serde_json::Value> {
    // Read lock
    tracing::trace!("run_static: function_name={function_name}, args={args:?}");
    let boc_ref = {
        PINNED_CONTRACT_BOCREFS
            .read()
            .await
            .get(&contract.address)
            .map(|(r, c)| (r.to_owned(), Arc::clone(c)))
    };
    let pin = contract.address.to_string();
    let (account, boc_cache, client) = if let Some(boc_ref) = boc_ref {
        let (boc_ref, client) = boc_ref;
        tracing::trace!(
            "run_static: use cached boc ref: {} -> {}",
            &contract.address,
            boc_ref
        );
        (boc_ref, Some(BocCacheType::Pinned { pin: pin }), client)
    } else {
        tracing::trace!("run_static: load account' boc");
        let filter = Some(serde_json::json!({
            "id": { "eq": contract.address }
        }));
        let query = query_collection(
            Arc::clone(context),
            ParamsOfQueryCollection {
                collection: "accounts".to_owned(),
                filter,
                result: "boc".to_owned(),
                limit: Some(1),
                order: None,
            },
        )
        .instrument(info_span!("run_static sdk::query_collection").or_current())
        .await
        .map(|r| r.result)?;

        if query.is_empty() {
            anyhow::bail!(
                "account with address {} not found. Was trying to call {}",
                contract.address,
                function_name,
            );
        }
        let AccountBoc { boc, .. } = serde_json::from_value(query[0].clone())?;
        tracing::trace!("Save acc to cache");
        let ResultOfBocCacheSet { boc_ref } = cache_set(
            Arc::clone(context),
            ParamsOfBocCacheSet {
                boc,
                cache_type: BocCacheType::Pinned { pin: pin },
            },
        )
        .await?;
        // write lock
        {
            let mut refs = PINNED_CONTRACT_BOCREFS.write().await;
            refs.insert(
                contract.address.clone(),
                (boc_ref.clone(), Arc::clone(context)),
            );
        }
        (boc_ref, None, Arc::clone(context))
    };
    // ---------
    let call_set = match args {
        Some(value) => CallSet::some_with_function_and_input(function_name, value),
        None => CallSet::some_with_function(function_name),
    };

    let encoded = encode_message(
        Arc::clone(&client),
        ParamsOfEncodeMessage {
            abi: contract.abi.clone(),
            address: Some(String::from(contract.address.clone())),
            call_set,
            signer: Signer::None,
            deploy_set: None,
            processing_try_index: None,
            signature_id: None,
        },
    )
    .instrument(info_span!("run_static sdk::encode_message").or_current())
    .await
    .map_err(|e| Box::new(RunLocalError::from(&e)))?;
    // ---------
    let result = run_tvm(
        Arc::clone(&client),
        ParamsOfRunTvm {
            message: encoded.message,
            account: account.clone(),
            abi: Some(contract.abi.clone()),
            boc_cache,
            execution_options: None,
            return_updated_account: None,
        },
    )
    .instrument(info_span!("run_static sdk::run_tvm").or_current())
    .await
    .map(|r| r.decoded.unwrap())
    .map(|r| r.output.unwrap())
    .map_err(|e| anyhow::format_err!("run_static failed: {e}"));
    if result.is_err() {
        tracing::trace!("run_static error: {result:?}");
    }
    Ok(result?)
}

#[instrument(level = "debug", skip(context))]
pub async fn get_account_data(
    context: &EverClient,
    contract: &GoshContract,
) -> anyhow::Result<serde_json::Value> {
    let query = r#"query($address: String!){
        blockchain {
          account(address: $address) {
            info {
              acc_type balance
            }
          }
        }
    }"#
    .to_owned();

    let result = ton_client::net::query(
        Arc::clone(context),
        ParamsOfQuery {
            query: query.clone(),
            variables: Some(serde_json::json!({
                "address": contract.address,
            })),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)
    .map_err(|e| anyhow::format_err!("query error: {e}"))?;

    let extracted_data = &result["data"]["blockchain"]["account"]["info"];

    Ok(extracted_data.clone())
}

fn processing_event_to_string(pe: ProcessingEvent) -> String {
    match pe {
        ProcessingEvent::WillSend {
            shard_block_id,
            message_id,
            message,
            ..
        } => format!(
            "\nWillSend: {{\n\t\
shard_block_id: \"{shard_block_id}\",\n\t\
message_id: \"{message_id}\"\n}}"
        ),
        ProcessingEvent::DidSend {
            shard_block_id,
            message_id,
            message,
            ..
        } => format!(
            "\nDidSend: {{\n\t\
shard_block_id: \"{shard_block_id}\",\n\t\
message_id: \"{message_id}\"\n}}"
        ),
        ProcessingEvent::SendFailed {
            shard_block_id,
            message_id,
            message,
            error,
            ..
        } => format!(
            "\nSendFailed: {{\n\t\
shard_block_id: \"{shard_block_id}\",\n\t\
message_id: \"{message_id}\"\n\t\
error: \"{error}\"\n}}"
        ),
        ProcessingEvent::WillFetchNextBlock {
            shard_block_id,
            message_id,
            message,
            ..
        } => format!(
            "\nWillFetchNextBlock: {{\n\t\
shard_block_id: \"{shard_block_id}\",\n\t\
message_id: \"{message_id}\"\n}}"
        ),
        ProcessingEvent::FetchNextBlockFailed {
            shard_block_id,
            message_id,
            message,
            error,
            ..
        } => format!(
            "\nFetchNextBlockFailed: {{\n\tshard_block_id: \"{shard_block_id}\",\n\t\
message_id: \"{message_id}\"\n\terror: \"{error}\"\n}}"
        ),
        ProcessingEvent::MessageExpired {
            message_id,
            message,
            error,
            ..
        } => format!(
            "\nMessageExpired: {{\n\terror: \"{error}\",\n\tmessage_id: \"{message_id}\"\n}}"
        ),
        _ => format!("{:#?}", pe),
    }
}

async fn default_callback(pe: ProcessingEvent) {
    // TODO: improve formatting for potentially unlimited structs/enums.
    // TODO: Need to clarify Remp json field
    tracing::trace!("callback: {}", processing_event_to_string(pe));
}

#[instrument(level = "info", skip_all)]
pub async fn get_repo_address(
    context: &EverClient,
    gosh_root_addr: &BlockchainContractAddress,
    dao: &str,
    repo: &str,
) -> anyhow::Result<BlockchainContractAddress> {
    tracing::trace!("get_repo_address: gosh_root_addr={gosh_root_addr}, dao={dao}, repo={repo}");
    let contract = GoshContract::new(gosh_root_addr, gosh_abi::GOSH);

    let args = serde_json::json!({ "dao": dao, "name": repo });
    let result: GetRepoAddrResult = contract
        .read_state(context, "getAddrRepository", Some(args))
        .await?;
    tracing::trace!("get_repo_address result: {:?}", result);
    Ok(BlockchainContractAddress::new(result.address))
}

#[instrument(level = "info", skip_all)]
pub async fn branch_list(
    context: &EverClient,
    repo_addr: &BlockchainContractAddress,
) -> anyhow::Result<GetAllAddressResult> {
    tracing::trace!("branch_list: repo_addr={repo_addr}");
    let contract = GoshContract::new(repo_addr, gosh_abi::REPO);

    let result: GetAllAddressResult = contract.read_state(context, "getAllAddress", None).await?;
    tracing::trace!("branch_list result: {:?}", result);
    Ok(result)
}

#[instrument(level = "trace", skip_all)]
pub async fn get_contract_code(
    context: &EverClient,
    repo_addr: &BlockchainContractAddress,
    kind: ContractKind,
) -> anyhow::Result<GetContractCodeResult> {
    tracing::debug!("get_contract_code: repo_addr={repo_addr}");
    let contract = GoshContract::new(repo_addr, gosh_abi::REPO);

    let fn_name = match kind {
        ContractKind::Commit => "getCommitCode",
        ContractKind::Tag => "getTagCode",
        _ => unimplemented!(),
    };

    let result: GetContractCodeResult = contract.read_state(context, fn_name, None).await?;
    tracing::debug!("{fn_name} result: {result:?}");

    Ok(result)
}

#[instrument(level = "trace", skip_all)]
pub async fn tag_list(
    context: &EverClient,
    repo_addr: &BlockchainContractAddress,
) -> anyhow::Result<Vec<String>> {
    tracing::debug!("tag_list: repo_addr={repo_addr}");

    let GetContractCodeResult { code } =
        get_contract_code(context, repo_addr, ContractKind::Tag).await?;

    let hash = calculate_boc_hash(context, &code).await?;
    let query = r#"query($code_hash: String!) {
        accounts(filter: {
            code_hash: { eq: $code_hash }
        }) {
            id
        }
    }"#
    .to_string();

    let result = ton_client::net::query(
        Arc::clone(&context),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({
                "code_hash": hash,
            })),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)
    .map_err(|e| anyhow::format_err!("query error: {e}"))?;

    let raw_accounts = result["data"]["accounts"].clone();
    let accounts: Vec<Account> = serde_json::from_value(raw_accounts)?;

    let mut result: Vec<String> = vec![];

    for account in accounts {
        let address = BlockchainContractAddress::new(account.address);
        let tag_contract = GoshContract::new(address, gosh_abi::TAG);
        let GetTagContentResult { content } =
            tag_contract.read_state(context, "getContent", None).await?;
        let mut iter = content.split('\n');
        let first = iter.next().unwrap();
        let item = if first.starts_with("tag") {
            // lightweght tag:
            // "tag <TAG_NAME>\nobject <COMMIT_ID>\n"
            let tag_name = first.split(' ').nth(1).unwrap();
            let commit_id = iter.next().unwrap().split(' ').nth(1).unwrap();
            format!("{commit_id} refs/tags/{tag_name}")
        } else {
            // annotated tag:
            // "id <TAG_ID>\nobject <COMMIT_ID>\ntype commit\ntag <TAG_NAME>\n..."
            let tag_id = first.split(' ').nth(1).unwrap();
            let tag_name = iter.nth(2).unwrap().split(' ').nth(1).unwrap();
            format!("{tag_id} refs/tags/{tag_name}")
        };
        result.push(item);
    }

    tracing::debug!("tag_list result: {:?}", result);
    Ok(result.to_owned())
}

#[instrument(level = "info", skip_all)]
pub async fn get_commit_address(
    context: &EverClient,
    repo_contract: &mut GoshContract,
    sha: &str,
) -> anyhow::Result<BlockchainContractAddress> {
    tracing::trace!("get_commit_address: repo_contract={repo_contract:?}, sha={sha}");
    let result: GetCommitAddrResult = repo_contract
        .static_method(
            context,
            "getCommitAddr",
            gosh_abi::get_commit_addr_args(sha),
        )
        .await?;
    Ok(result.address)
}

#[instrument(level = "info", skip_all)]
pub async fn get_commit_by_addr(
    context: &EverClient,
    address: &BlockchainContractAddress,
) -> anyhow::Result<Option<GoshCommit>> {
    tracing::trace!("get_commit_by_addr: address={address}");
    let commit = GoshCommit::load(context, address).await?;
    Ok(Some(commit))
}

pub async fn get_head(
    context: &EverClient,
    address: &BlockchainContractAddress,
) -> anyhow::Result<String> {
    let contract = GoshContract::new(address, gosh_abi::REPO);
    let result: GetHeadResult = contract.read_state(context, "getHEAD", None).await?;
    tracing::trace!("get_head result: {:?}", result);
    Ok(result.head)
}

#[instrument(level = "trace", skip_all)]
pub async fn calculate_boc_hash(context: &EverClient, code: &str) -> anyhow::Result<String> {
    let params = ParamsOfGetBocHash {
        boc: code.to_owned(),
    };
    let ResultOfGetBocHash { hash } = get_boc_hash(Arc::clone(context), params).await?;
    Ok(hash)
}

#[instrument(level = "trace", skip_all)]
pub async fn calculate_contract_address(
    context: &EverClient,
    kind: ContractKind,
    code: &str,
    initial_data: Option<serde_json::Value>,
) -> anyhow::Result<BlockchainContractAddress> {
    let abi = match kind {
        ContractKind::Tag => gosh_abi::TAG,
        ContractKind::Commit => gosh_abi::COMMIT,
        ContractKind::Tree => gosh_abi::TREE,
        ContractKind::Snapshot => gosh_abi::SNAPSHOT,
        ContractKind::Diff => gosh_abi::DIFF,
        _ => unimplemented!(),
    };

    let params = ParamsOfEncodeInitialData {
        abi: Some(Abi::Json(abi.1.to_owned())),
        initial_data,
        ..Default::default()
    };

    let ResultOfEncodeInitialData { data } =
        encode_initial_data(Arc::clone(context), params).await?;

    let params = ParamsOfEncodeStateInit {
        code: Some(code.to_owned()),
        data: Some(data.to_owned()),
        ..Default::default()
    };

    let ResultOfEncodeStateInit { state_init } =
        encode_state_init(Arc::clone(context), params).await?;

    let hash = calculate_boc_hash(context, &state_init).await?;

    Ok(BlockchainContractAddress::new(format!("0:{hash}")))
}

#[cfg(test)]
pub mod tests {

    use super::*;
    use crate::{
        config::{self, Config},
        git_helper::ever_client::create_client,
    };

    pub struct TestEnv {
        config: Config,
        pub client: EverClient,
        gosh: BlockchainContractAddress,
        dao: String,
        repo: String,
    }

    impl TestEnv {
        pub fn new() -> Self {
            let cfg = config::Config::default();
            let client = create_client(&cfg, "vps23.ton.dev").unwrap();
            TestEnv {
                config: cfg,
                client,
                gosh: BlockchainContractAddress::new(
                    "0:bb1ab825fe9fa51fb4eabb830347c7ee648951cb125182c793a0ca0f0b2cbe35",
                ),
                dao: "dao-x".to_string(),
                repo: "repo-01".to_string(),
            }
        }
    }

    #[test]
    fn ensure_context_can_be_decoded() {
        let blob: GoshBlob = serde_json::from_str(r#"{"sha":"tree 0ed805c960f4c12fd1cab8e6144978594469ecb1","commit":"0:6bb19a7ee94996f9e37f8859a0390e6ea842d2c0d239a30d0287f0f441d76000","content":"KLUv/QBYvQcAthM4HnBp0gFo/mC0kUVYBNkkf174wuRgs5vClfbv/415OC8ALgAvAO4GsxWt1DTrowEgCggQAQIDxzk9W5+yDyfE1vQJ9xrXE12zx/whZXTwRfEDolZZjU4H4ns8rrqkm4wy95pENW7VnJit6yTEj5YEBAEtFr7xR2+C8tReT3V3t/H+BQkWZyeXmc7Y2llm6DQYyMFiMTh+E52h70ySbtJVb++frBhRu+faHUO3nASSsJxEDAYG8oqCoheHW77m4jHnuPisI6Po2I83mjW6nmZqRdENyCuJZHzd/GqtjdlEkwcGAEa4A7hKBHFsIuLYVcSxG+DCHg==","ipfs":"","flags":"2"}"#).unwrap();
        let content = ton_client::utils::decompress_zstd(&blob.content).unwrap();
        assert_eq!(
            content,
            vec![
                49u8, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 100, 56, 54, 100, 50, 101, 51,
                99, 55, 51, 55, 54, 57, 98, 55, 52, 97, 50, 55, 52, 102, 101, 102, 54, 97, 52, 52,
                102, 56, 99, 97, 53, 102, 101, 48, 55, 99, 54, 50, 99, 9, 76, 73, 67, 69, 78, 83,
                69, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 49, 52, 101, 54, 56, 97,
                51, 54, 48, 49, 52, 54, 97, 53, 52, 51, 98, 98, 50, 101, 55, 56, 49, 97, 97, 97,
                97, 97, 48, 99, 54, 101, 49, 54, 50, 53, 100, 57, 55, 97, 9, 101, 118, 101, 114,
                115, 100, 107, 46, 110, 111, 100, 101, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108,
                111, 98, 32, 56, 100, 102, 99, 48, 97, 49, 56, 56, 102, 56, 97, 48, 49, 98, 51, 54,
                52, 53, 51, 55, 97, 56, 56, 54, 51, 102, 55, 54, 102, 50, 48, 48, 56, 50, 52, 101,
                50, 56, 100, 9, 102, 97, 118, 105, 99, 111, 110, 46, 105, 99, 111, 10, 49, 48, 48,
                54, 52, 52, 32, 98, 108, 111, 98, 32, 50, 100, 49, 99, 50, 49, 55, 53, 98, 98, 97,
                100, 52, 56, 48, 49, 102, 101, 98, 101, 49, 101, 48, 48, 97, 57, 55, 54, 102, 57,
                53, 97, 101, 100, 49, 50, 100, 53, 55, 101, 9, 103, 111, 115, 104, 46, 116, 118,
                99, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 100, 49, 49, 48, 53, 97,
                54, 97, 52, 56, 98, 53, 53, 53, 50, 57, 97, 53, 56, 48, 52, 57, 98, 102, 54, 57,
                55, 51, 51, 97, 49, 55, 48, 50, 98, 49, 98, 55, 98, 51, 9, 103, 111, 115, 104, 102,
                105, 108, 101, 46, 121, 97, 109, 108, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111,
                98, 32, 97, 102, 53, 54, 50, 54, 98, 52, 97, 49, 49, 52, 97, 98, 99, 98, 56, 50,
                100, 54, 51, 100, 98, 55, 99, 56, 48, 56, 50, 99, 51, 99, 52, 55, 53, 54, 101, 53,
                49, 98, 9, 115, 97, 109, 112, 108, 101, 46, 116, 120, 116
            ]
        );
    }

    #[tokio::test]
    async fn ensure_calculate_tvm_hash_correctly() {
        let te = TestEnv::new();
        const SAMPLE_STRING: &str = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/src/blockchain/tvm_hash/modifiers.sol.test-sample"
        ));
        const PRECALCULATED_HASH_FOR_THE_STRING: &str =
            "0x31ae25c80597d6c084f743b6d9e2866196eb0194f42c084614baa9a0474aa12f";
        let hash = tvm_hash(&te.client, SAMPLE_STRING.to_string().as_bytes())
            .await
            .unwrap();
        assert_eq!(PRECALCULATED_HASH_FOR_THE_STRING, format!("0x{}", hash));
    }

    // TODO:
    // Move into integration tests
    // As of now they're not following contract changes
    // therefore not adding a value
    #[tokio::test]
    #[ignore]
    async fn ensure_get_repo_address() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await;
        let expected = BlockchainContractAddress::new(
            "0:4de6a95c7dbfebef9bad6ef7f34f6a31f62953f989a169e81ef71493332ac4a6",
        );
        assert_eq!(expected, repo_addr.unwrap());
    }

    #[tokio::test]
    #[ignore]
    async fn ensure_run_static_correctly() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo)
            .await
            .unwrap();
        let address = "0:4de6a95c7dbfebef9bad6ef7f34f6a31f62953f989a169e81ef71493332ac4a6";
        let address = BlockchainContractAddress::new(address);
        let contract = GoshContract::new(address, gosh_abi::REPO);
        let list: GetAllAddressResult = contract
            .run_static(&te.client, "getAllAddress", None)
            .await
            .unwrap();

        eprintln!("{:#?}", list);

        let head: GetHeadResult = contract
            .run_static(&te.client, "getHEAD", None)
            .await
            .unwrap();

        eprintln!("{:#?}", head);
    }

    /*
    #[tokio::test]
    async fn ensure_list_remote_refs() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await.unwrap();
        let remote_refs = get_refs(&te.client, &repo_addr).await.unwrap().unwrap();
        let expected_refs = vec![
            "e8099827e251c2fb4485b1039b3b6d31e5f428e4 refs/heads/dev"
        ];
        assert_eq!(1, remote_refs.len());
        assert_eq!(expected_refs, remote_refs);
    }

    #[tokio::test]
    async fn ensure_remote_rev_parsed_correctly() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await.unwrap();

        let empty = remote_rev_parse(&te.client, &repo_addr, "HEAD").await;
        assert_eq!(None, empty.unwrap());

        let commit_sha = remote_rev_parse(&te.client, &repo_addr, "dev").await;
        assert_eq!(Some("0:eca4354dbf3ad5d328f80ac58284c6b5a7fe5b975dc6015cb88b22a9e33fff17".to_owned()), commit_sha.unwrap());
    }

    #[tokio::test]
    async fn ensure_remote_head_received_correctly() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await.unwrap();
        let current_head = get_head(&te.client, &repo_addr).await;
        assert_eq!("dev", current_head.unwrap());
    }

    #[tokio::test]
    async fn ensure_remote_head_change_sucessfully() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await.unwrap();

        let gosh_wallet_addr = "0:28a99e8c42e3da1fe6689d7f0fda8e390f44434adb9369a67023dc2106c5358b";
        let keys = KeyPair {
            public: "56931c7fe75bd4e7364671d5c2cd553104b6b6cbce8b3c1d2f1c579dbf9745a1".to_owned(),
            secret: "92410336883c797c5662ee059815d33c8426a4b2184e4ce939e58395d8ec783b".to_owned(),
        };

        set_head(&te.client, &gosh_wallet_addr, &te.repo, "dev", keys).await;
        let new_head = get_head(&te.client, &repo_addr).await;
        assert_eq!("dev", new_head.unwrap());
    }

    #[tokio::test]
    async fn ensure_snapshot_address_received_correctly() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await.unwrap();
        let snapshot_addr = Snapshot::calculate_address(&te.client, &repo_addr, "dev", "README.md").await;
        assert_eq!("0:c61cab86fc0372c719a590761c8f67ebca1f577e50e7f37609866b1e2c90959a", snapshot_addr.unwrap());
    }

    #[tokio::test]
    async fn ensure_snapshot_can_be_loaded() {
        // TODO:
        // Change test to follow updated repositories.
        // seems like an integration test.
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await.unwrap();
        let snapshot_addr = Snapshot::calculate_address(&te.client, &repo_addr, &"dev", &"src/some.txt").await.expect("must be there");
        //let snapshot_addr = "0:c191199824e37ac8aa4c4fdc900bdb00b85247d1a720c710fe56a36ebbb14038";
        let snapshot = Snapshot::load(&te.client, &snapshot_addr).await.expect("must load correctly");
        assert!(
            snapshot.next_commit != ""
            || snapshot.current_commit != ""
        );
    }

    #[tokio::test]
    async fn ensure_tree_root_can_be_loaded() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await.unwrap();
        let tree_sha = "39683d79c14d9508a930fca9d0974e83b3dbeca4";
        let tree_addr = Tree::calculate_address(&te.client, &te.gosh, &repo_addr, tree_sha).await.unwrap();
        assert_eq!("0:fd4014cbb38307925b747b0d782952aedac97a9e438ff09f0f490dc7a25b6418", tree_addr);
        let tree_obj = Tree::load(&te.client, &tree_addr).await.unwrap();
        assert_eq!("\"some.txt\"", format!("{:?}", tree_obj.objects["0xa419777677a02a989ff0b6bb62d5c903eb11d1afc8056df32c1753e7a4a692d1"].name));
    }

    #[tokio::test]
    async fn ensure_load_messages_correctly() {
        let te = TestEnv::new();
        let snapshot_addr = "0:c61cab86fc0372c719a590761c8f67ebca1f577e50e7f37609866b1e2c90959a";
        let messages = load_messages_to(&te.client, snapshot_addr).await.unwrap();
        eprintln!("load_messages_to(): {:#?}", messages);
        // assert_eq!(2, messages.len());
    }
    */
}
