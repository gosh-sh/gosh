use crate::abi as gosh_abi;
use crate::blockchain::{AddrVersion, EverClient};
use ton_client::abi::{decode_message_body, Abi, ParamsOfDecodeMessageBody};
use ton_client::net::ParamsOfQuery;
pub mod save;

use crate::blockchain::serde_number::NumberU64;
use std::sync::Arc;

use super::contract::GoshContract;

#[derive(Deserialize, Debug, DataContract)]
#[abi = "commit.abi.json"]
#[abi_data_fn = "getCommit"]
pub struct GoshCommit {
    #[serde(rename = "time")]
    _time: String,
    #[serde(rename = "repo")]
    _repo: String,
    pub sha: String,
    pub parents: Vec<AddrVersion>,
    pub content: String,
    pub initupgrade: bool,
    #[serde(rename = "isCorrectCommit")]
    pub is_correct_commit: bool,
    #[serde(rename = "isPinned")]
    _is_pinned: bool,
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
    _prev_commit: String,
    #[serde(rename = "namecommit")]
    commit_id: String,
    #[serde(rename = "number")]
    _num_of_files: NumberU64,
}

#[instrument(level = "info", skip_all)]
pub async fn get_set_commit_created_at_time(
    context: &EverClient,
    repo_contract: &mut GoshContract,
    commit_id: &str,
    branch_name: &str,
) -> anyhow::Result<u64> {
    tracing::trace!("get_set_commit_created_at_time: repo_contract_address={}, commit_id={commit_id}, branch_name={branch_name}", repo_contract.address);
    let mut created_at = 0u64;
    let mut cursor: Option<String> = None;
    let query = r#"query($repo_address: String!, $after: String){
        blockchain {
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

    loop {
        let after = match cursor.as_ref() {
            Some(value) => value,
            None => "",
        };

        let result = ton_client::net::query(
            Arc::clone(context),
            ParamsOfQuery {
                query: query.clone(),
                variables: Some(serde_json::json!({
                    "repo_address": repo_contract.address,
                    "after": after
                })),
                ..Default::default()
            },
        )
        .await
        .map(|r| r.result)
        .map_err(|e| anyhow::format_err!("query error: {e}"))?;

        let extracted_messages = &result["data"]["blockchain"]["account"]["messages"];
        let messages: Messages = serde_json::from_value(extracted_messages.clone())?;
        cursor = if messages.page_info.has_next_page {
            Some(messages.page_info.end_cursor)
        } else {
            None
        };

        tracing::trace!(
            "Loaded {} message(s) to repo contract {}",
            messages.edges.len(),
            repo_contract.address
        );

        let commit_address =
            crate::blockchain::get_commit_address(context, repo_contract, commit_id).await?;
        let expected_src = String::from(commit_address);
        for node in messages.edges {
            let raw_msg = node.message;
            if raw_msg.status != 5 || raw_msg.bounced || raw_msg.src != expected_src {
                continue;
            }
            tracing::trace!("Decoding message {:?}", raw_msg.id);
            let decoded = decode_message_body(
                Arc::clone(context),
                ParamsOfDecodeMessageBody {
                    abi: Abi::Json(gosh_abi::REPO.1.to_string()),
                    body: raw_msg.body,
                    is_internal: true,
                    ..Default::default()
                },
            )
            .await?;

            tracing::trace!("Decoded message `{}`", decoded.name);
            if decoded.name == "setCommit" {
                let value = decoded.value.unwrap();
                let args: SetCommitArgs = serde_json::from_value(value)?;
                tracing::trace!("branch name: {}", args.branch);
                if args.branch == branch_name && args.commit_id == commit_id {
                    created_at = raw_msg.created_at;
                    break;
                }
            }
        }
        if created_at > 0 || cursor == None {
            break;
        }
    }
    tracing::trace!("set_commit' created_at: {created_at}");
    Ok(created_at)
}

#[cfg(test)]
mod tests {
    /*
    use super::*;
    use crate::config;

    pub struct TestEnv {
        config: config::Config,
        client: EverClient,
    }

    impl TestEnv {
        fn new() -> Self {
            let cfg = config::Config::init().unwrap();
            let client =
                crate::git_helper::ever_client::create_client(&cfg, "vps23.ton.dev").unwrap();
            TestEnv {
                config: cfg,
                client,
            }
        }
    }

        #[tokio::test]
        async fn ensure_get_created_at_of_set_commit() {
            let te = TestEnv::new();
            let repo_address = "0:5c359ebadfd4e452a973a43752d6b26ee1eabd977518b396309f1cc047569af3";
            let commit_id = "ef0dca1e128e44ab2f68b9c6e9da491f230a5d9c";
            let branch_name = "";
            let ts = get_set_commit_created_at_time(&te.client, repo_address, commit_id, branch_name).await.unwrap();
            eprintln!("created_at: {}", ts);
        }
    */
}
