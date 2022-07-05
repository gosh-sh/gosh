#![allow(unused_variables)]
use base64;
use base64_serde::base64_serde_type;

use std::borrow::Borrow;
use std::os::raw;
use std::{env, fmt, sync::Arc, error::Error};
use serde_json;
use serde::{Deserialize, Deserializer, Serialize};
use serde::de::Visitor;
use serde::de::Error as SerdeError;

mod error;
use error::RunLocalError;

use ton_client::{
    ClientConfig,
    ClientContext,
    abi::{
        Abi,
        CallSet,
        ParamsOfDecodeMessageBody,
        ParamsOfEncodeMessage,
        Signer,
        decode_message_body,
        encode_message,
    },
    crypto::KeyPair,
    net::{
        NetworkQueriesProtocol,
        ParamsOfQuery,
        ParamsOfQueryCollection,
        ParamsOfQueryTransactionTree,
        query_collection,
        query_transaction_tree,
    },
    processing::{ParamsOfProcessMessage, ProcessingEvent, ResultOfProcessMessage},
    tvm::{ParamsOfRunTvm, run_tvm},
};

mod tree;
mod commit;
mod snapshot;
mod serde_number;
pub use snapshot::Snapshot;
pub use tree::Tree;
pub use commit::GoshCommit;
use serde_number::Number;

use crate::abi as gosh_abi;
use crate::config::Config;
use crate::ipfs::IpfsService;

pub const ZERO_ADDRESS: &str = "0:0000000000000000000000000000000000000000000000000000000000000000";
pub const MAX_ONCHAIN_FILE_SIZE: u32 = 15360;

const BLOB_FLAG_BINARY: u8 = 1;
const BLOB_FLAG_COMPRESSED: u8 = 2;
const BLOB_FLAG_IPFS: u8 = 4;

base64_serde_type!(Base64Standard, base64::STANDARD);

#[derive(Debug)]
struct GoshContract {
    address: String,
    abi: Abi,
    keys: Option<KeyPair>,
}

impl GoshContract {
    pub fn new(address: &str, abi: &str) -> Self {
        GoshContract {
            address: address.to_owned(),
            abi: Abi::Json(abi.to_string()),
            keys: None,
        }
    }

    pub fn new_with_keys(address: &str, abi: &str, keys: KeyPair) -> Self {
        GoshContract {
            address: address.to_owned(),
            abi: Abi::Json(abi.to_string()),
            keys: Some(keys),
        }
    }

    pub async fn run_local(
        &self,
        context: &TonClient,
        function_name: &str,
        args: Option<serde_json::Value>
    ) -> Result<serde_json::Value, Box<dyn Error>> {
        let result = run_local(context, self, function_name, args).await?;
        Ok(result)
    }
}

#[derive(Deserialize, Debug)]
pub struct GoshBlob {
    sha: String,
    commit: String,
    #[serde(with = "Base64Standard")]
    pub content: Vec<u8>,
    pub ipfs: String,
    pub flags: Number
}

#[derive(Deserialize, Debug)]
struct CallResult {
    #[serde(rename = "id")]
    trx_id: String,
    status: u8,
    #[serde(with = "ton_sdk::json_helper::uint")]
    total_fees: u64,
    in_msg: String,
    out_msgs: Vec<String>
}

#[derive(Debug)]
pub struct DiffMessage {
    pub diff: Diff,
    pub created_lt: u64
}

#[derive(Deserialize, Debug)]
pub struct Diff {
    snap: String,
    commit: String,
    patch: String,
    ipfs: String
}

pub type TonClient = Arc<ClientContext>;

pub fn create_client(config: &Config, network: &str) -> Result<TonClient, String> {
    let endpoints = config.find_network_endpoints(network).unwrap();
    let proto = env::var("GOSH_PROTO").unwrap_or(".git".to_string()).to_lowercase();

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
    context: &TonClient,
    contract: &GoshContract,
    function_name: &str,
    args: Option<serde_json::Value>
) -> Result<serde_json::Value, Box<dyn Error>> {
    let filter = Some(serde_json::json!({
        "id": { "eq": contract.address }
    }));
    let query = query_collection(
        context.clone(),
        ParamsOfQueryCollection {
            collection: "accounts".to_owned(),
            filter,
            result: "boc".to_owned(),
            limit: Some(1),
            order: None,
        },
    )
    .await
    .map(|r| r.result)
    .unwrap();

    if query.is_empty() {
        return Err(Box::new(RunLocalError::from(format!("account with address {} not found", contract.address))));
    }
    let account_boc = &query[0]["boc"].as_str();
    let call_set = match args {
        Some(value) => CallSet::some_with_function_and_input(function_name, value),
        None => CallSet::some_with_function(function_name)
    };

    let encoded = encode_message(
        context.clone(),
        ParamsOfEncodeMessage {
            abi: contract.abi.clone(),
            address: Some(contract.address.to_owned()),
            call_set: call_set,
            signer: Signer::None,
            deploy_set: None,
            processing_try_index: None,
        }
    )
    .await
    .map_err(|e| Box::new(RunLocalError::from(&e)))?;
    //log::info!("run_local: {} -> {:?}", function_name, encoded);

    let result = run_tvm(
        context.clone(),
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
    .map(|r| r.output.unwrap())
    .unwrap();

    Ok(result)
}

async fn default_callback(pe: ProcessingEvent) {
    eprintln!("cb: {:#?}", pe);
}

async fn call(
    context: &TonClient,
    contract: GoshContract,
    function_name: &str,
    args: Option<serde_json::Value>
) -> Result<CallResult, String> {
    let call_set = match args {
        Some(value) => CallSet::some_with_function_and_input(function_name, value),
        None => CallSet::some_with_function(function_name)
    };
    let signer = match contract.keys {
        Some(key_pair) => Signer::Keys { keys: key_pair },
        None => Signer::None,
    };

    let message_encode_params = ParamsOfEncodeMessage {
        abi: contract.abi,
        address: Some(contract.address),
        call_set,
        signer,
        deploy_set: None,
        processing_try_index: None,
    };

    let result = ton_client::processing::process_message(
        context.clone(),
        ParamsOfProcessMessage { send_events: false, message_encode_params },
        default_callback,
    )
    .await;

    let ResultOfProcessMessage { transaction,/* decoded, */..} = result.unwrap();
    let call_result: CallResult = serde_json::from_value(transaction).unwrap();

    Ok(call_result)
}

pub async fn get_repo_address(context: &TonClient, gosh_root_addr: &str, dao: &str, repo: &str) -> Result<String, Box<dyn Error>> {
    let contract = GoshContract::new(gosh_root_addr, gosh_abi::GOSH);

    let args = serde_json::json!({ "dao": dao, "name": repo });
    let _repo_addr_result = contract.run_local(context, "getAddrRepository", Some(args)).await?;
    let repo_addr = _repo_addr_result["value0"].as_str().unwrap().to_owned();

    Ok(repo_addr)
}

pub async fn branch_list(context: &TonClient, repo_addr: &str) -> Result<Vec<(String, String)>, Box<dyn Error>> {
    let contract = GoshContract::new(repo_addr, gosh_abi::REPO);

    let list_result = contract.run_local(context, "getAllAddress", None).await?;

    let list = list_result.get("value0").unwrap().as_array().unwrap();
    let mut branches: Vec<(String, String)> = Vec::new();
    for branch in list {
        branches.push((
            branch["key"].as_str().unwrap().to_string(),
            branch["value"].as_str().unwrap().to_string()
        ));
    }
    Ok(branches)
}

pub async fn set_head(
    context: &TonClient,
    wallet_addr: &str,
    repo_name: &str,
    new_head: &str,
    keys: KeyPair
) -> Result<(), Box<dyn Error>> {
    let contract = GoshContract::new_with_keys(wallet_addr, gosh_abi::WALLET, keys);
    let args = serde_json::json!({ "repoName": repo_name, "branchName": new_head });
    let result = call(context, contract, "setHEAD", Some(args)).await?;

    Ok(())
}

pub async fn remote_rev_parse(context: &TonClient, repository_address: &str, rev: &str) -> Result<Option<String>, Box<dyn Error>> {
    let contract = GoshContract::new(repository_address, gosh_abi::REPO);
    let args = serde_json::json!({ "name": rev });
    let branch_addr = contract.run_local(context, "getAddrBranch", Some(args)).await?;

    match &branch_addr["value0"]["key"] {
        branch_name if branch_name == "" => Ok(None),
        branch_name => Ok(Some(branch_addr["value0"]["value"].as_str().unwrap().to_owned())),
    }
}

pub async fn get_commit_address(context: &TonClient, repository_address: &str, sha: &str) -> Result<String, Box<dyn Error>> {
    let contract = GoshContract::new(repository_address, gosh_abi::REPO);
    let result = contract.run_local(context, "getCommitAddr", gosh_abi::get_commit_addr_args(sha)).await?; 
    return Ok(result.get("value0").unwrap().as_str().unwrap().to_owned());
}

pub async fn get_commit_by_addr(context: &TonClient, address: &str) -> Result<Option<GoshCommit>, Box<dyn Error>> {
    let commit = GoshCommit::load(context, address).await?;
    Ok(Some(commit))
}

pub async fn get_blob_address(context: &TonClient, repository_address: &str, kind: &str, sha: &str) -> Result<String, Box<dyn Error>> {
    let contract = GoshContract::new(repository_address, gosh_abi::REPO);
    let result = contract.run_local(context, "getBlobAddr", gosh_abi::get_blob_addr_args(kind, sha)).await?;
    return Ok(result.get("value0").unwrap().as_str().unwrap().to_owned());
}

pub async fn get_blob_by_addr(context: &TonClient, ipfs_client: &IpfsService, address: &str) -> Result<Option<GoshBlob>, Box<dyn Error>> {
    unimplemented!();
    /*
    let contract = GoshContract::new(address, gosh_abi::BLOB);

    let result = contract.run_local(context, "getBlob", None).await?;
    log::info!("blob> {}", result);
    let mut blob: GoshBlob = serde_json::from_value(result).unwrap();
    let content = {
        if blob.ipfs != "" && blob.content.is_empty() {
            let data = ipfs_client.load(&blob.ipfs).await?;
            base64::decode(data)?
        } else {
            blob.content
        }
    };
    log::info!("Parsed");
    blob.content = ton_client::utils::decompress_zstd(&content)?;
    log::info!("decompressed. Content");
    Ok(Some(blob))
    */
}

pub async fn get_head(context: &TonClient, address: &str) -> Result<String, Box<dyn Error>> {
    let contract = GoshContract::new(address, gosh_abi::REPO);
    let _head_result = contract.run_local(context, "getHEAD", None).await?;
    match &_head_result["value0"] {
        serde_json::Value::String(value) => Ok(value.to_string()),
        _ => unreachable!()
    }
}

pub async fn load_messages_to(context: &TonClient, address: &str) -> Result<Vec<DiffMessage>, Box<dyn Error>> {
    let query = r#"query($addr: String!){
      blockchain{
        account(address:$addr) {
          messages(msg_type:[IntIn]) {
            edges {
              node{ body created_lt status }
              cursor
            }
            pageInfo { hasNextPage }
          }
        }
      }
    }"#.to_string();

    let result = ton_client::net::query(
        context.clone(),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({"addr": address})),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)?;

    #[derive(Deserialize, Debug)]
    struct Message {
        body: String,
        #[serde(with = "ton_sdk::json_helper::uint")]
        created_lt: u64,
        status: u8
    }

    let mut messages: Vec<DiffMessage> = Vec::new();
    let nodes = result["data"]["blockchain"]["account"]["messages"]["edges"].as_array().unwrap();
    for message in nodes {
        let raw_msg: Message = serde_json::from_value(message["node"].clone()).unwrap();
        if raw_msg.status != 5 {
            continue;
        }
        let decoded = decode_message_body(
            context.clone(),
            ParamsOfDecodeMessageBody {
                abi: Abi::Json(gosh_abi::SNAPSHOT.to_string()),
                body: raw_msg.body,
                is_internal: true,
                ..Default::default()
            }
        )
        .await?;

        if decoded.name == "applyDiff" {
            let value = decoded.value.unwrap();
            let diff: Diff = serde_json::from_value(value["diff"]).unwrap();
            messages.insert(0, DiffMessage { diff, created_lt: raw_msg.created_lt });
        }
    }

    Ok(messages)
}

#[cfg(test)]
mod tests {
    use reqwest::header::TE;

    use super::*;
    use crate::{config, git::get_refs};

    struct TestEnv {
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
                gosh: "0:eef0faac2330d2608c725b32becc916dced505bdb88d84f18c222708a7fa8229".to_string(),
                dao: "teampre".to_string(),
                repo: "testme".to_string(),
            }
        }
    }

    #[test]
    fn ensure_context_can_be_decoded() {
        let blob: GoshBlob = serde_json::from_str(r#"{"sha":"tree 0ed805c960f4c12fd1cab8e6144978594469ecb1","commit":"0:6bb19a7ee94996f9e37f8859a0390e6ea842d2c0d239a30d0287f0f441d76000","content":"KLUv/QBYvQcAthM4HnBp0gFo/mC0kUVYBNkkf174wuRgs5vClfbv/415OC8ALgAvAO4GsxWt1DTrowEgCggQAQIDxzk9W5+yDyfE1vQJ9xrXE12zx/whZXTwRfEDolZZjU4H4ns8rrqkm4wy95pENW7VnJit6yTEj5YEBAEtFr7xR2+C8tReT3V3t/H+BQkWZyeXmc7Y2llm6DQYyMFiMTh+E52h70ySbtJVb++frBhRu+faHUO3nASSsJxEDAYG8oqCoheHW77m4jHnuPisI6Po2I83mjW6nmZqRdENyCuJZHzd/GqtjdlEkwcGAEa4A7hKBHFsIuLYVcSxG+DCHg==","ipfs":"","flags":"2"}"#).unwrap();
        let content = ton_client::utils::decompress_zstd(&blob.content).unwrap();
        assert_eq!(content, vec![49u8, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 100, 56, 54, 100, 50, 101, 51, 99, 55, 51, 55, 54, 57, 98, 55, 52, 97, 50, 55, 52, 102, 101, 102, 54, 97, 52, 52, 102, 56, 99, 97, 53, 102, 101, 48, 55, 99, 54, 50, 99, 9, 76, 73, 67, 69, 78, 83, 69, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 49, 52, 101, 54, 56, 97, 51, 54, 48, 49, 52, 54, 97, 53, 52, 51, 98, 98, 50, 101, 55, 56, 49, 97, 97, 97, 97, 97, 48, 99, 54, 101, 49, 54, 50, 53, 100, 57, 55, 97, 9, 101, 118, 101, 114, 115, 100, 107, 46, 110, 111, 100, 101, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 56, 100, 102, 99, 48, 97, 49, 56, 56, 102, 56, 97, 48, 49, 98, 51, 54, 52, 53, 51, 55, 97, 56, 56, 54, 51, 102, 55, 54, 102, 50, 48, 48, 56, 50, 52, 101, 50, 56, 100, 9, 102, 97, 118, 105, 99, 111, 110, 46, 105, 99, 111, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 50, 100, 49, 99, 50, 49, 55, 53, 98, 98, 97, 100, 52, 56, 48, 49, 102, 101, 98, 101, 49, 101, 48, 48, 97, 57, 55, 54, 102, 57, 53, 97, 101, 100, 49, 50, 100, 53, 55, 101, 9, 103, 111, 115, 104, 46, 116, 118, 99, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 100, 49, 49, 48, 53, 97, 54, 97, 52, 56, 98, 53, 53, 53, 50, 57, 97, 53, 56, 48, 52, 57, 98, 102, 54, 57, 55, 51, 51, 97, 49, 55, 48, 50, 98, 49, 98, 55, 98, 51, 9, 103, 111, 115, 104, 102, 105, 108, 101, 46, 121, 97, 109, 108, 10, 49, 48, 48, 54, 52, 52, 32, 98, 108, 111, 98, 32, 97, 102, 53, 54, 50, 54, 98, 52, 97, 49, 49, 52, 97, 98, 99, 98, 56, 50, 100, 54, 51, 100, 98, 55, 99, 56, 48, 56, 50, 99, 51, 99, 52, 55, 53, 54, 101, 53, 49, 98, 9, 115, 97, 109, 112, 108, 101, 46, 116, 120, 116]);
    }

    #[tokio::test]
    async fn ensure_get_repo_address() {
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await;
        let expected = "0:0453b13b3386a08e4f391a930b0d7689daf6c12aa73c6a51876d31acccc75dcc";
        assert_eq!(expected, repo_addr.unwrap());
    }

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
        let te = TestEnv::new();
        let repo_addr = get_repo_address(&te.client, &te.gosh, &te.dao, &te.repo).await.unwrap();
        let snapshot_addr = Snapshot::calculate_address(&te.client, &repo_addr, &"dev", &"src/some.txt").await.expect("must be there");
        //let snapshot_addr = "0:c191199824e37ac8aa4c4fdc900bdb00b85247d1a720c710fe56a36ebbb14038";
        let snapshot = Snapshot::load(&te.client, &snapshot_addr).await.expect("must load correctly");
        assert_eq!("", format!("{:?}", snapshot));
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
}
