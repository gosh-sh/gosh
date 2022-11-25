use crate::abi as gosh_abi;
use crate::blockchain::get_commit_by_addr;
use crate::blockchain::{
    get_commit_address, snapshot::diffs::Diff, BlockchainContractAddress, EverClient, GoshContract,
    Snapshot,
};
use std::collections::HashMap;
use std::iter::Iterator;
use std::sync::Arc;
use ton_client::abi::{decode_message_body, Abi, ParamsOfDecodeMessageBody};
use ton_client::net::ParamsOfQuery;

#[derive(Debug, Clone)]
pub struct DiffMessage {
    pub diff: Diff,
    pub created_at: u64,
    pub created_lt: u64,
}

#[derive(Debug)]
enum NextChunk {
    MessagesPage(BlockchainContractAddress, Option<String>, bool),
    JumpToAnotherBranchSnapshot(BlockchainContractAddress, u64),
}

#[derive(Debug)]
pub struct DiffMessagesIterator {
    repo_contract: GoshContract,
    buffer: Vec<DiffMessage>,
    buffer_cursor: usize,
    next: Option<NextChunk>,
}

#[derive(Debug, Clone)]
pub struct PageIterator {
    cursor: Option<String>,
    stop_on: Option<u64>,
    skip_series: bool,
}

#[derive(Deserialize, Debug, Clone)]
struct Message {
    id: String,
    body: String,
    created_at: u64,
    #[serde(with = "ton_sdk::json_helper::uint")]
    created_lt: u64,
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
    has_previous_page: bool,
    start_cursor: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct Messages {
    edges: Vec<Node>,
    page_info: PageInfo,
}

#[derive(Deserialize, Debug)]
struct TrxCompute {
    exit_code: u32,
}

#[derive(Deserialize, Debug)]
struct TrxInfo {
    status: u32,
    in_msg: String,
    out_msgs: Vec<String>,
    compute: TrxCompute,
}

impl DiffMessagesIterator {
    #[instrument(level = "debug", skip(snapshot_address), name = "new_DiffMessagesIterator")]
    pub fn new(
        snapshot_address: impl Into<BlockchainContractAddress>,
        repo_contract: &mut GoshContract,
    ) -> Self {
        Self {
            repo_contract: repo_contract.clone(),
            buffer: vec![],
            buffer_cursor: 0,
            next: Some(NextChunk::MessagesPage(
                snapshot_address.into(),
                None,
                false,
            )),
        }
    }

    #[instrument(level = "debug", skip(client))]
    pub async fn next(&mut self, client: &EverClient) -> anyhow::Result<Option<DiffMessage>> {
        while !self.is_buffer_ready() && self.next.is_some() {
            self.try_load_next_chunk(client).await?;
        }
        Ok(self.try_take_next_item())
    }

    async fn into_next_page(
        client: &EverClient,
        current_snapshot_address: &BlockchainContractAddress,
        repo_contract: &mut GoshContract,
        next_page_info: Option<String>,
        skip_series: bool,
    ) -> anyhow::Result<Option<NextChunk>> {
        let address = current_snapshot_address;
        Ok(match next_page_info {
            Some(next_page_info) => Some(NextChunk::MessagesPage(
                address.clone(),
                Some(next_page_info),
                skip_series,
            )),
            None => {
                // find last commit
                let Snapshot {
                    original_commit, ..
                } = Snapshot::load(client, address).await?;
                let file_path = Snapshot::get_file_path(client, address).await?;
                let commit_addr =
                    get_commit_address(client, repo_contract, &original_commit).await?;
                let commit_data = get_commit_by_addr(client, &commit_addr)
                    .await?
                    .expect("commit data should be here");
                let original_branch = commit_data.branch;
                // find what is it pointing to
                let original_snapshot = Snapshot::calculate_address(
                    client,
                    repo_contract,
                    &original_branch,
                    &file_path,
                )
                .await?;
                tracing::info!(
                    "First commit in this branch to the file {} is {} and it was branched from {} -> snapshot addr: {}",
                    file_path,
                    original_commit,
                    original_branch,
                    original_snapshot
                );
                // generate filter
                let created_at: u64 = crate::blockchain::commit::get_set_commit_created_at_time(
                    client,
                    repo_contract,
                    &original_commit,
                    &original_branch,
                )
                .await?;
                Some(NextChunk::JumpToAnotherBranchSnapshot(
                    original_snapshot,
                    created_at,
                ))
            }
        })
    }

    #[instrument(level = "debug", skip(client))]
    async fn try_load_next_chunk(&mut self, client: &EverClient) -> anyhow::Result<()> {
        tracing::info!("loading next chunk -> {:?}", self.next);
        self.next = match &self.next {
            None => None,
            Some(NextChunk::JumpToAnotherBranchSnapshot(
                snapshot_address,
                ignore_commits_created_after,
            )) => {
                tracing::info!(
                    "Jumping to another branch: {} - commit {}",
                    snapshot_address,
                    ignore_commits_created_after
                );
                let address = snapshot_address;
                // Now we will be loading page by page till
                // we find a message with the expected commit
                // Fail if not found: it must be there
                let mut cursor = None;
                let mut index = None;
                let mut next_page_info = None;
                let mut skip_series = false;
                while index.is_none() {
                    tracing::info!("loading messages");
                    let (buffer, page) =
                        load_messages_to(client, &address, &cursor, None, false).await?;
                    tracing::info!("messages: {:?}", buffer);
                    for (i, item) in buffer.iter().enumerate() {
                        if &item.created_at <= ignore_commits_created_after {
                            index = Some(i);
                            break;
                        }
                    }
                    self.buffer = buffer;
                    if index.is_none() {
                        tracing::info!("Expected commit was not found");
                        if page.cursor.is_some() {
                            cursor = page.cursor;
                        } else {
                            panic!(
                                "We reached the end of the messages queue to a snapshot and were not able to find original commit there."
                            )
                        }
                    } else {
                        tracing::info!("Commit found at {}", index.unwrap());
                        next_page_info = page.cursor;
                    }
                    skip_series = page.skip_series;
                }
                self.buffer_cursor = index.unwrap();
                DiffMessagesIterator::into_next_page(
                    client,
                    &address,
                    &mut self.repo_contract,
                    next_page_info,
                    skip_series,
                )
                .await?
            }
            Some(NextChunk::MessagesPage(address, cursor, skip)) => {
                let (buffer, page) =
                    load_messages_to(client, &address, cursor, None, *skip).await?;
                self.buffer = buffer;
                self.buffer_cursor = 0;
                DiffMessagesIterator::into_next_page(
                    client,
                    &address,
                    &mut self.repo_contract,
                    page.cursor,
                    page.skip_series,
                )
                .await?
            }
        };
        Ok(())
    }

    #[instrument(level = "debug")]
    fn is_buffer_ready(&self) -> bool {
        self.buffer_cursor < self.buffer.len()
    }

    #[instrument(level = "debug")]
    fn try_take_next_item(&mut self) -> Option<DiffMessage> {
        tracing::debug!("try_take_next_item = {:?}", self);
        if self.buffer_cursor >= self.buffer.len() {
            return None;
        }
        let item = self.buffer[self.buffer_cursor].clone();
        self.buffer_cursor += 1;
        Some(item)
    }
}

#[instrument(level = "debug", skip(context))]
pub async fn load_messages_to(
    context: &EverClient,
    address: &BlockchainContractAddress,
    cursor: &Option<String>,
    stop_on: Option<u64>,
    skip_series: bool,
) -> anyhow::Result<(Vec<DiffMessage>, PageIterator)> {
    let mut subsequent_page_info: Option<String> = None;
    let mut skip = skip_series;
    let query = r#"query($addr: String!, $before: String){
      blockchain {
        account(address: $addr) {
          messages(msg_type: [IntIn], before: $before, last: 50) {
            edges {
              node { id body created_at created_lt status bounced }
            }
            pageInfo { hasPreviousPage startCursor }
          }
        }
      }
    }"#
    .to_string();

    let before = match cursor.as_ref() {
        Some(page_info) => page_info,
        None => "",
    };

    let result = ton_client::net::query(
        Arc::clone(context),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({
                "addr": address,
                "before": before
            })),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)?;

    let mut messages: Vec<DiffMessage> = Vec::new();
    let nodes = &result["data"]["blockchain"]["account"]["messages"];
    tracing::trace!("trying to decode: {:?}", nodes);
    let edges: Messages = serde_json::from_value(nodes.clone())?;
    if edges.page_info.has_previous_page {
        subsequent_page_info = Some(edges.page_info.start_cursor);
    }

    tracing::debug!("Loaded {} message(s) to {}", edges.edges.len(), address);
    let mut passed_msgs: Vec<Message> = Vec::new();
    for elem in edges.edges.iter().rev() {
        let raw_msg = &elem.message;
        if stop_on != None && raw_msg.created_at >= stop_on.unwrap() {
            subsequent_page_info = None;
            break;
        }
        if raw_msg.status != 5 || raw_msg.bounced {
            continue;
        }
        let msg = Message {
            id: raw_msg.id[8..].to_owned(), // strip prefix `message/`
            ..raw_msg.clone()
        };
        passed_msgs.push(msg);
    }

    let ids: Vec<String> = passed_msgs.iter().map(|x| x.id.clone()).collect();
    let passed_trx: HashMap<String, Vec<String>> =
        load_transactions(&Arc::clone(context), &ids).await?;
    let filter: Vec<&String> = passed_trx.keys().collect();
    let msgs: Vec<&Message> = passed_msgs
        .iter()
        .filter(|m| filter.contains(&&m.id))
        .map(|m| m)
        .collect();

    for raw_msg in msgs {
        tracing::debug!("Decoding message {:?}", raw_msg.id);
        let decoded = decode_message_body(
            Arc::clone(context),
            ParamsOfDecodeMessageBody {
                abi: Abi::Json(gosh_abi::SNAPSHOT.1.to_string()),
                body: raw_msg.body.clone(),
                is_internal: true,
                ..Default::default()
            },
        )
        .await?;

        tracing::debug!("Decoded message `{}`", decoded.name);
        if decoded.name == "applyDiff" {
            if skip {
                continue;
            };

            let out_msg_ids = passed_trx.get(&raw_msg.id).unwrap();
            let caused_out_msg = &out_msg_ids[0];
            let is_approved = match check_approve_result(context, caused_out_msg).await? {
                Some(approve) => approve,
                None => false,
            };

            if !is_approved {
                continue;
            };

            let value = decoded.value.unwrap();
            let diff: Diff = serde_json::from_value(value["diff"].clone()).unwrap();
            messages.push(DiffMessage {
                diff,
                created_at: raw_msg.created_at,
                created_lt: raw_msg.created_lt,
            });
        } else if decoded.name == "cancelDiff" {
            skip = true;
        } else if decoded.name == "approve" {
            skip = false;
        }
    }

    tracing::debug!("Passed {} message(s)", messages.len());
    let oldest_timestamp = match messages.len() {
        0 => None,
        n => Some(messages[n - 1].created_at),
    };
    let page = PageIterator {
        cursor: subsequent_page_info,
        stop_on: oldest_timestamp,
        skip_series: skip,
    };
    Ok((messages, page))
}

pub async fn load_transactions(
    context: &EverClient,
    msg_ids: &Vec<String>,
) -> anyhow::Result<HashMap<String, Vec<String>>> {
    let query = r#"query($msg_ids: [String!]) {
        transactions(filter: {
          in_msg: { in: $msg_ids }
        }) {
          id status in_msg out_msgs compute { exit_code }
        }
      }"#
    .to_string();

    let result = ton_client::net::query(
        Arc::clone(context),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({
                "msg_ids": msg_ids,
            })),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)?;

    let transactions: Vec<TrxInfo> =
        serde_json::from_value(result["data"]["transactions"].clone())?;
    let passed_trx = transactions
        .iter()
        .filter(|x| x.status == 3 && x.compute.exit_code == 0)
        .map(|x| (x.in_msg.clone(), x.out_msgs.clone()))
        .collect::<HashMap<_, _>>();

    Ok(passed_trx)
}

pub async fn check_approve_result(
    context: &EverClient,
    msg_id: &str,
) -> anyhow::Result<Option<bool>> {
    let query = r#"query($msg_id: String!) {
        messages(filter: {
          id: { eq: $msg_id }
        }) {
          id body
        }
      }"#
    .to_string();

    let result = ton_client::net::query(
        Arc::clone(context),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({
                "msg_id": msg_id,
            })),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)?;

    let body: String = serde_json::from_value(result["data"]["messages"][0]["body"].clone())?;

    let decoded = decode_message_body(
        Arc::clone(context),
        ParamsOfDecodeMessageBody {
            abi: Abi::Json(gosh_abi::DIFF.1.to_string()),
            body: body.clone(),
            is_internal: true,
            ..Default::default()
        },
    )
    .await?;

    if decoded.name != "approveDiff" {
        return Ok(None);
    }

    let result = match decoded.value {
        Some(value) => {
            let approve_result = serde_json::from_value::<bool>(value["res"].clone())?;
            Some(approve_result)
        }
        _ => None,
    };
    Ok(result)
}
