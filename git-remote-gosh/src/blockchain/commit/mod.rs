use crate::abi as gosh_abi;
use crate::blockchain::TonClient;
use ton_client::abi::{decode_message_body, Abi, ParamsOfDecodeMessageBody};
use ton_client::net::ParamsOfQuery;
mod save;

use crate::blockchain::serde_number::NumberU64;
use crate::blockchain::Result;
pub use save::{notify_commit, push_commit};

use super::GoshContract;

#[derive(Deserialize, Debug, DataContract)]
#[abi = "commit.abi.json"]
#[abi_data_fn = "getCommit"]
pub struct GoshCommit {
    repo: String,
    pub branch: String,
    pub sha: String,
    parents: Vec<String>,
    pub content: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Message {
    id: String,
    src: String,
    created_at: u64,
    body: String,
    status: u8,
    bounced: bool,
}

#[derive(Deserialize, Debug)]
struct Node {
    #[serde(rename = "node")]
    message: Message,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PageInfo {
    has_next_page: bool,
    end_cursor: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct Messages {
    edges: Vec<Node>,
    page_info: PageInfo,
}

#[derive(Deserialize, Debug)]
struct SetCommitArgs {
    #[serde(rename = "nameBranch")]
    branch: String,
    #[serde(rename = "oldcommit")]
    prev_commit: String,
    #[serde(rename = "namecommit")]
    commit_id: String,
    #[serde(rename = "number")]
    num_of_files: NumberU64,
}

#[instrument(level = "debug", skip(context))]
pub async fn get_set_commit_created_at_time(
    context: &TonClient,
    repo_contract: &mut GoshContract,
    commit_id: &str,
    branch_name: &str,
) -> Result<u64> {
    let mut created_at = 0u64;
    let mut next_page_info: Option<String> = None;
    let query = r#"query($repo_address: String!, $after: String){
        blockchain{
          account(address: $repo_address) {
            messages(msg_type: [IntIn], after: $after) {
              edges {
                node { id src status bounced created_at body }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
    }"#
    .to_string();

    let result = ton_client::net::query(
        context.clone(),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({
                "repo_address": repo_contract.address,
                "after": ""
            })),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)?;

    let extracted_messages = &result["data"]["blockchain"]["account"]["messages"];
    let messages: Messages = serde_json::from_value(extracted_messages.clone())?;
    if messages.page_info.has_next_page {
        next_page_info = Some(messages.page_info.end_cursor);
    }

    log::debug!(
        "Loaded {} message(s) to {}",
        messages.edges.len(),
        repo_contract.address
    );

    let commit_address =
        crate::blockchain::get_commit_address(context, repo_contract, commit_id).await?;
    let expected_src = commit_address.to_string();
    for node in messages.edges {
        let raw_msg = node.message;
        if raw_msg.status != 5 || raw_msg.bounced || raw_msg.src != expected_src {
            continue;
        }
        log::debug!("Decoding message {:?}", raw_msg.id);
        let decoded = decode_message_body(
            context.clone(),
            ParamsOfDecodeMessageBody {
                abi: Abi::Json(gosh_abi::REPO.1.to_string()),
                body: raw_msg.body,
                is_internal: true,
                ..Default::default()
            },
        )
        .await?;

        log::debug!("Decoded message `{}`", decoded.name);
        if decoded.name == "setCommit" {
            let value = decoded.value.unwrap();
            let args: SetCommitArgs = serde_json::from_value(value)?;
            log::debug!("branch name: {}", args.branch);
            if args.branch == branch_name && args.commit_id == commit_id {
                created_at = raw_msg.created_at;
                break;
            }
        }
    }

    Ok(created_at)
}

#[cfg(test)]
mod tests {

    use super::*;
    use crate::config;

    pub struct TestEnv {
        config: config::Config,
        client: TonClient,
    }

    impl TestEnv {
        fn new() -> Self {
            let cfg = config::Config::init().unwrap();
            let client = crate::blockchain::create_client(&cfg, "vps23.ton.dev").unwrap();
            TestEnv {
                config: cfg,
                client,
            }
        }
    }
/*
    #[tokio::test]
    async fn ensure_get_created_at_of_set_commit() {
        // TODO fix type
        //
        // let te = TestEnv::new();
        // let repo_address = "0:5c359ebadfd4e452a973a43752d6b26ee1eabd977518b396309f1cc047569af3";
        // let commit_id = "ef0dca1e128e44ab2f68b9c6e9da491f230a5d9c";
        // let branch_name = "";
        // let ts = get_set_commit_created_at_time(&te.client, repo_address, commit_id, branch_name)
        //     .await
        //     .unwrap();
        // eprintln!("created_at: {}", ts);
    }
*/
}
