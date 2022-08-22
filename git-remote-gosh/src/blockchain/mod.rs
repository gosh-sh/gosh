#![allow(unused_variables)]
use base64;
use base64_serde::base64_serde_type;
use serde::{de, Deserialize};
use serde_json;
use std::{env, fmt, sync::Arc};
mod error;
use error::RunLocalError;
mod create_branch;
pub use create_branch::CreateBranchOperation;
use ton_client::{
    abi::{encode_message, Abi, CallSet, ParamsOfEncodeMessage, Signer},
    boc::{cache_set, BocCacheType, ParamsOfBocCacheSet, ResultOfBocCacheSet},
    crypto::KeyPair,
    net::{query_collection, NetworkQueriesProtocol, ParamsOfQueryCollection},
    processing::{ParamsOfProcessMessage, ProcessingEvent, ResultOfProcessMessage},
    tvm::{run_tvm, ParamsOfRunTvm},
    ClientConfig, ClientContext,
};
pub mod commit;
mod serde_number;
pub mod snapshot;
pub mod tree;
mod tvm_hash;
mod user_wallet;
pub use commit::GoshCommit;
pub use commit::{notify_commit, push_commit};
use serde_number::Number;
pub use snapshot::Snapshot;
pub use tree::{push_tree, Tree};
pub use tvm_hash::tvm_hash;
pub use user_wallet::user_wallet;

use crate::abi as gosh_abi;
use crate::config::Config;

pub const ZERO_ADDRESS: &str = "0:0000000000000000000000000000000000000000000000000000000000000000";
pub const ZERO_SHA: &str = "0000000000000000000000000000000000000000";
pub const MAX_ONCHAIN_FILE_SIZE: u32 = 15360;
const CACHE_PIN_STATIC: &str = "static";

#[repr(u8)]
pub enum GoshBlobBitFlags {
    Binary = 1,
    Compressed = 2,
    Ipfs = 4,
}

base64_serde_type!(Base64Standard, base64::STANDARD);

#[derive(Clone)]
pub struct GoshContract {
    address: String,
    pretty_name: String,
    abi: Abi,
    keys: Option<KeyPair>,
    boc_ref: Option<String>,
}

impl fmt::Debug for GoshContract {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let struct_name = format!("GoshContract<{}>", self.pretty_name);
        f.debug_struct(&struct_name)
            .field("address", &self.address)
            .finish_non_exhaustive()
    }
}

impl GoshContract {
    pub fn new(address: &str, (pretty_name, abi): (&str, &str)) -> Self {
        GoshContract {
            pretty_name: pretty_name.to_owned(),
            address: address.to_owned(),
            abi: Abi::Json(abi.to_string()),
            keys: None,
            boc_ref: None,
        }
    }

    pub fn new_with_keys(address: &str, (pretty_name, abi): (&str, &str), keys: KeyPair) -> Self {
        GoshContract {
            pretty_name: pretty_name.to_owned(),
            address: address.to_owned(),
            abi: Abi::Json(abi.to_string()),
            keys: Some(keys),
            boc_ref: None,
        }
    }

    #[instrument(level = "debug", skip(context))]
    pub async fn run_local<T>(
        &self,
        context: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> Result<T>
    where
        T: de::DeserializeOwned,
    {
        let result = run_local(context, self, function_name, args).await?;
        log::trace!("run_local result: {:?}", result);
        Ok(serde_json::from_value::<T>(result)?)
    }

    #[instrument(level = "debug", skip(context))]
    pub async fn run_static<T>(
        &mut self,
        context: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>,
    ) -> Result<T>
    where
        T: de::DeserializeOwned,
    {
        let result = run_static(context, self, function_name, args).await?;
        log::trace!("run_statuc result: {:?}", result);
        Ok(serde_json::from_value::<T>(result)?)
    }
}

#[derive(Deserialize, Debug)]
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
struct GetRepoAddrResult {
    #[serde(rename = "value0")]
    pub address: String,
}

#[derive(Deserialize, Debug)]
struct GetCommitAddrResult {
    #[serde(rename = "value0")]
    pub address: String,
}

#[derive(Deserialize, Debug)]
struct GetBoolResult {
    #[serde(rename = "value0")]
    pub is_ok: bool,
}

#[derive(Deserialize, Debug)]
pub struct BranchRef {
    #[serde(rename = "key")]
    pub branch_name: String,

    #[serde(rename = "value")]
    pub commit_sha: String,
}

#[derive(Deserialize, Debug)]
pub struct GetAllAddressResult {
    #[serde(rename = "value0")]
    pub branch_ref: Vec<BranchRef>,
}

#[derive(Deserialize, Debug)]
struct GetAddrBranchResult {
    #[serde(rename = "value0")]
    pub branch: BranchRef,
}

#[derive(Deserialize, Debug)]
struct GetHeadResult {
    #[serde(rename = "value0")]
    pub head: String,
}

pub type TonClient = Arc<ClientContext>;
pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[instrument(level = "debug")]
pub fn create_client(config: &Config, network: &str) -> Result<TonClient> {
    let endpoints = config
        .find_network_endpoints(network)
        .expect("Unknown network");
    let proto = env::var("GOSH_PROTO")
        .unwrap_or(".git".to_string())
        .to_lowercase();

    let config = ClientConfig {
        network: ton_client::net::NetworkConfig {
            endpoints: if endpoints.is_empty() {
                None
            } else {
                Some(endpoints.to_owned())
            },
            queries_protocol: if proto.starts_with("http") {
                NetworkQueriesProtocol::HTTP
            } else {
                NetworkQueriesProtocol::WS
            },
            network_retries_count: 5,
            message_retries_count: 10,
            message_processing_timeout: 220000000,
            wait_for_timeout: 220000000,
            query_timeout: 220000000,
            ..Default::default()
        },
        ..Default::default()
    };
    let es_client = ClientContext::new(config)
        .map_err(|e| format!("failed to create EverSDK client: {}", e))?;

    Ok(Arc::new(es_client))
}

async fn run_local(
    cli: &TonClient,
    contract: &GoshContract,
    function_name: &str,
    args: Option<serde_json::Value>,
) -> Result<serde_json::Value> {
    let filter = Some(serde_json::json!({
        "id": { "eq": contract.address }
    }));
    let query = query_collection(
        cli.clone(),
        ParamsOfQueryCollection {
            collection: "accounts".to_owned(),
            filter,
            result: "boc".to_owned(),
            limit: Some(1),
            order: None,
        },
    )
    .await
    .map(|r| r.result)?;

    if query.is_empty() {
        return Err(Box::new(RunLocalError::from(format!(
            "account with address {} not found. Was trying to call {}",
            contract.address, function_name
        ))));
    }
    let account_boc = &query[0]["boc"].as_str();
    let call_set = match args {
        Some(value) => CallSet::some_with_function_and_input(function_name, value),
        None => CallSet::some_with_function(function_name),
    };

    let encoded = encode_message(
        cli.clone(),
        ParamsOfEncodeMessage {
            abi: contract.abi.clone(),
            address: Some(contract.address.to_owned()),
            call_set: call_set,
            signer: Signer::None,
            deploy_set: None,
            processing_try_index: None,
        },
    )
    .await
    .map_err(|e| Box::new(RunLocalError::from(&e)))?;

    let result = run_tvm(
        cli.clone(),
        ParamsOfRunTvm {
            message: encoded.message,
            account: account_boc.unwrap().to_string(),
            abi: Some(contract.abi.clone()),
            boc_cache: None,
            execution_options: None,
            return_updated_account: None,
        },
    )
    .await
    .map(|r| r.decoded.unwrap())
    .map(|r| r.output.unwrap())?;

    Ok(result)
}

async fn run_static(
    cli: &TonClient,
    contract: &mut GoshContract,
    function_name: &str,
    args: Option<serde_json::Value>,
) -> Result<serde_json::Value> {
    let (account, boc_cache) = if let Some(boc_ref) = contract.boc_ref.clone() {
        log::debug!("run_static: use cached boc ref");
        (boc_ref, Some(BocCacheType::Unpinned))
    } else {
        log::debug!("run_static: load account' boc");
        let filter = Some(serde_json::json!({
            "id": { "eq": contract.address }
        }));
        let query = query_collection(
            cli.clone(),
            ParamsOfQueryCollection {
                collection: "accounts".to_owned(),
                filter,
                result: "boc".to_owned(),
                limit: Some(1),
                order: None,
            },
        )
        .await
        .map(|r| r.result)?;

        if query.is_empty() {
            return Err(Box::new(RunLocalError::from(format!(
                "account with address {} not found. Was trying to call {}",
                contract.address, function_name
            ))));
        }
        let AccountBoc { boc, .. } = serde_json::from_value(query[0].clone())?;
        let ResultOfBocCacheSet { boc_ref } = cache_set(
            cli.clone(),
            ParamsOfBocCacheSet {
                boc,
                cache_type: BocCacheType::Pinned {
                    pin: CACHE_PIN_STATIC.to_string(),
                },
            },
        )
        .await?;
        contract.boc_ref = Some(boc_ref.clone());
        (boc_ref, None)
    };
    // ---------
    let call_set = match args {
        Some(value) => CallSet::some_with_function_and_input(function_name, value),
        None => CallSet::some_with_function(function_name),
    };

    let encoded = encode_message(
        cli.clone(),
        ParamsOfEncodeMessage {
            abi: contract.abi.clone(),
            address: Some(contract.address.to_owned()),
            call_set: call_set,
            signer: Signer::None,
            deploy_set: None,
            processing_try_index: None,
        },
    )
    .await
    .map_err(|e| Box::new(RunLocalError::from(&e)))?;
    // ---------
    let result = run_tvm(
        cli.clone(),
        ParamsOfRunTvm {
            message: encoded.message,
            account: account.clone(),
            abi: Some(contract.abi.clone()),
            boc_cache,
            execution_options: None,
            return_updated_account: None,
        },
    )
    .await
    .map(|r| r.decoded.unwrap())
    .map(|r| r.output.unwrap())?;

    Ok(result)
}

async fn default_callback(pe: ProcessingEvent) {
    log::debug!("cb: {:#?}", pe);
}

#[instrument(level = "debug", skip(cli))]
async fn call(
    cli: &TonClient,
    contract: &GoshContract,
    function_name: &str,
    args: Option<serde_json::Value>,
) -> Result<CallResult> {
    let call_set = match args {
        Some(value) => CallSet::some_with_function_and_input(function_name, value),
        None => CallSet::some_with_function(function_name),
    };
    let signer = match contract.keys.as_ref() {
        Some(key_pair) => Signer::Keys {
            keys: key_pair.clone(),
        },
        None => Signer::None,
    };

    let message_encode_params = ParamsOfEncodeMessage {
        abi: contract.abi.clone(),
        address: Some(contract.address.clone()),
        call_set,
        signer,
        deploy_set: None,
        processing_try_index: None,
    };

    let ResultOfProcessMessage {
        transaction, /* decoded, */
        ..
    } = ton_client::processing::process_message(
        cli.clone(),
        ParamsOfProcessMessage {
            send_events: false,
            message_encode_params,
        },
        default_callback,
    )
    .await?;

    let call_result: CallResult = serde_json::from_value(transaction)?;

    log::debug!("trx id: {}", call_result.trx_id);

    Ok(call_result)
}

#[instrument(level = "debug", skip(context))]
pub async fn get_repo_address(
    context: &TonClient,
    gosh_root_addr: &str,
    dao: &str,
    repo: &str,
) -> Result<String> {
    let contract = GoshContract::new(gosh_root_addr, gosh_abi::GOSH);

    let args = serde_json::json!({ "dao": dao, "name": repo });
    let result: GetRepoAddrResult = contract
        .run_local(context, "getAddrRepository", Some(args))
        .await?;
    Ok(result.address)
}

#[instrument(level = "debug", skip(context))]
pub async fn branch_list(context: &TonClient, repo_addr: &str) -> Result<GetAllAddressResult> {
    let contract = GoshContract::new(repo_addr, gosh_abi::REPO);

    let result: GetAllAddressResult = contract.run_local(context, "getAllAddress", None).await?;
    Ok(result)
}

#[instrument(level = "debug", skip(context))]
pub async fn is_branch_protected(
    context: &TonClient,
    repo_addr: &str,
    branch_name: &str,
) -> Result<bool> {
    let contract = GoshContract::new(repo_addr, gosh_abi::REPO);

    let params = serde_json::json!({ "branch": branch_name });
    let result: GetBoolResult = contract
        .run_local(context, "isBranchProtected", Some(params))
        .await?;
    Ok(result.is_ok)
}

pub async fn set_head(
    context: &TonClient,
    wallet_addr: &str,
    repo_name: &str,
    new_head: &str,
    keys: KeyPair,
) -> Result<()> {
    let contract = GoshContract::new_with_keys(wallet_addr, gosh_abi::WALLET, keys);
    let args = serde_json::json!({ "repoName": repo_name, "branchName": new_head });
    let result = call(context, &contract, "setHEAD", Some(args)).await?;

    Ok(())
}

#[instrument(level = "debug", skip(context))]
pub async fn remote_rev_parse(
    context: &TonClient,
    repository_address: &str,
    rev: &str,
) -> Result<Option<String>> {
    let contract = GoshContract::new(repository_address, gosh_abi::REPO);
    let args = serde_json::json!({ "name": rev });
    let result: GetAddrBranchResult = contract
        .run_local(context, "getAddrBranch", Some(args))
        .await?;
    if result.branch.branch_name != "" {
        return Ok(Some(result.branch.commit_sha));
    } else {
        return Ok(None);
    }
}

#[instrument(level = "debug", skip(context))]
pub async fn get_commit_address(
    context: &TonClient,
    repo_contract: &mut GoshContract,
    sha: &str,
) -> Result<String> {
    let result: GetCommitAddrResult = repo_contract
        .run_static(
            context,
            "getCommitAddr",
            gosh_abi::get_commit_addr_args(sha),
        )
        .await?;
    return Ok(result.address);
}

#[instrument(level = "debug", skip(context))]
pub async fn get_commit_by_addr(context: &TonClient, address: &str) -> Result<Option<GoshCommit>> {
    let commit = GoshCommit::load(context, address).await?;
    Ok(Some(commit))
}

pub async fn get_head(context: &TonClient, address: &str) -> Result<String> {
    let contract = GoshContract::new(address, gosh_abi::REPO);
    let result: GetHeadResult = contract.run_local(context, "getHEAD", None).await?;
    return Ok(result.head);
}

#[cfg(test)]
mod tests {

    use super::*;
    use crate::config;

    pub struct TestEnv {
        config: Config,
        client: TonClient,
        gosh: String,
        dao: String,
        repo: String,
    }

    impl TestEnv {
        fn new() -> Self {
            let cfg = config::Config::init().unwrap();
            let client = create_client(&cfg, "vps23.ton.dev").unwrap();
            TestEnv {
                config: cfg,
                client,
                gosh: "0:bb1ab825fe9fa51fb4eabb830347c7ee648951cb125182c793a0ca0f0b2cbe35"
                    .to_string(),
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

    #[derive(Deserialize, Debug)]
    struct GetHashResult {
        #[serde(rename = "value0")]
        hash: String,
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
        /*
        let args = serde_json::json!({
            "state": hex::encode(sample_string)
        });
        let logger = crate::logger::GitHelperLogger::init().ok().unwrap();

        let test_pubkey = "13f63ef393f3fc6c22a7faf629dca64df19ca0388cf1c8dd04c84ddf44d1e742";
        let test_secret = "80378dc53f9d6d27a69463d9e14a6ec867a08665faba96bec793ffa592b26d64";
        let contract = crate::blockchain::user_wallet::get_user_wallet(
            &te.client,
            &te.gosh,
            &te.dao,
            test_pubkey,
            test_secret
        ).await.ok().unwrap();
        let result: GetHashResult = contract
            .run_local(&te.client, "getHash", Some(args))
            .await
            .expect("ok");
        assert_eq!(result.hash, format!("0x{}", hash));
        */
    }

    // TODO:
    // Move into integration tests
    // As of now they're not following contract changes
    // therefore not adding a value
    #[tokio::test]
    async fn ensure_get_repo_address() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await;
        let expected = "0:4de6a95c7dbfebef9bad6ef7f34f6a31f62953f989a169e81ef71493332ac4a6";
        assert_eq!(expected, repo_addr.unwrap());
    }

    #[tokio::test]
    async fn ensure_run_static_correectly() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo)
            .await
            .unwrap();
        let address = "0:4de6a95c7dbfebef9bad6ef7f34f6a31f62953f989a169e81ef71493332ac4a6";
        let mut contract = GoshContract::new(address, gosh_abi::REPO);
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
