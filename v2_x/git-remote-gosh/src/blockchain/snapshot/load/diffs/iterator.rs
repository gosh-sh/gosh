use crate::abi as gosh_abi;
use crate::blockchain::get_commit_by_addr;
use crate::blockchain::{
    get_commit_address, snapshot::diffs::Diff, BlockchainContractAddress, EverClient, GoshContract,
    Snapshot,
};
use std::iter::Iterator;
use std::sync::Arc;
use ton_client::abi::{decode_message_body, Abi, ParamsOfDecodeMessageBody};
use ton_client::net::ParamsOfQuery;

#[derive(Debug, Clone, PartialEq)]
pub struct DiffMessage {
    pub diff: Diff,
    pub created_at: u64,
    pub created_lt: u64,
}

#[derive(Debug)]
enum NextChunk {
    MessagesPage(BlockchainContractAddress, Option<String>),
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
}

#[derive(Deserialize, Debug, Clone)]
struct Message {
    id: String,
    body: Option<String>,
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

#[derive(PartialEq)]
enum LoadStatus {
    Success,
    StopSearch,
}

impl DiffMessagesIterator {
    #[instrument(level = "info", skip_all, name = "new_DiffMessagesIterator")]
    pub fn new(
        snapshot_address: impl Into<BlockchainContractAddress>,
        repo_contract: &mut GoshContract,
    ) -> Self {
        tracing::trace!(
            "new_DiffMessagesIterator: repo_contract.address={}",
            repo_contract.address
        );
        Self {
            repo_contract: repo_contract.clone(),
            buffer: vec![],
            buffer_cursor: 0,
            next: Some(NextChunk::MessagesPage(snapshot_address.into(), None)),
        }
    }

    #[instrument(level = "info", skip_all)]
    pub async fn next(&mut self, client: &EverClient) -> anyhow::Result<Option<DiffMessage>> {
        while !self.is_buffer_ready() && self.next.is_some() {
            if self.try_load_next_chunk(client).await? == LoadStatus::StopSearch {
                break;
            };
        }
        Ok(self.try_take_next_item())
    }

    async fn into_next_page(
        client: &EverClient,
        current_snapshot_address: &BlockchainContractAddress,
        repo_contract: &mut GoshContract,
        next_page_info: Option<String>,
    ) -> anyhow::Result<Option<NextChunk>> {
        let address = current_snapshot_address;
        Ok(match next_page_info {
            Some(next_page_info) => Some(NextChunk::MessagesPage(
                address.clone(),
                Some(next_page_info),
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
                let snapshot_contract =
                    GoshContract::new(original_snapshot.clone(), crate::abi::SNAPSHOT);
                let snapshot_is_active = snapshot_contract.is_active(client).await?;
                tracing::trace!(
                    "snap={original_snapshot} is {}",
                    if snapshot_is_active {
                        "ACTIVE"
                    } else {
                        "NON_ACTIVE"
                    }
                );
                tracing::info!(
                    "First commit in this branch to the file {} is {} and it was branched from {} -> snapshot addr: {}",
                    file_path,
                    original_commit,
                    original_branch,
                    original_snapshot
                );
                // generate filter
                let created_at: u64 = if snapshot_is_active {
                    crate::blockchain::commit::get_set_commit_created_at_time(
                        client,
                        repo_contract,
                        &original_commit,
                        &original_branch,
                    )
                    .await?
                } else {
                    0u64
                };
                Some(NextChunk::JumpToAnotherBranchSnapshot(
                    original_snapshot,
                    created_at,
                ))
            }
        })
    }

    #[instrument(level = "info", skip_all)]
    async fn try_load_next_chunk(&mut self, client: &EverClient) -> anyhow::Result<LoadStatus> {
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
                while index.is_none() {
                    tracing::info!("loading messages");
                    let (buffer, page) = load_messages_to(client, &address, &cursor, None).await?;
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
                            // Do not panic but stop search, because this commit can be found in the other branch
                            tracing::info!("We reached the end of the messages queue to a snapshot and were not able to find original commit there.");
                            self.buffer_cursor = 0;
                            return Ok(LoadStatus::StopSearch);
                        }
                    } else {
                        tracing::info!("Commit found at {}", index.unwrap());
                        next_page_info = page.cursor;
                    }
                }
                self.buffer_cursor = index.unwrap();
                DiffMessagesIterator::into_next_page(
                    client,
                    &address,
                    &mut self.repo_contract,
                    next_page_info,
                )
                .await?
            }
            Some(NextChunk::MessagesPage(address, cursor)) => {
                let (buffer, page) = load_messages_to(client, &address, cursor, None).await?;
                self.buffer = buffer;
                self.buffer_cursor = 0;
                DiffMessagesIterator::into_next_page(
                    client,
                    &address,
                    &mut self.repo_contract,
                    page.cursor,
                )
                .await?
            }
        };
        Ok(LoadStatus::Success)
    }

    #[instrument(level = "info", skip_all)]
    fn is_buffer_ready(&self) -> bool {
        self.buffer_cursor < self.buffer.len()
    }

    #[instrument(level = "info", skip_all)]
    fn try_take_next_item(&mut self) -> Option<DiffMessage> {
        tracing::trace!("try_take_next_item = {:?}", self);
        if self.buffer_cursor >= self.buffer.len() {
            return None;
        }
        let item = self.buffer[self.buffer_cursor].clone();
        self.buffer_cursor += 1;
        Some(item)
    }
}

#[instrument(level = "info", skip_all)]
pub async fn load_messages_to(
    context: &EverClient,
    address: &BlockchainContractAddress,
    cursor: &Option<String>,
    stop_on: Option<u64>,
) -> anyhow::Result<(Vec<DiffMessage>, PageIterator)> {
    tracing::trace!("address={address}, cursor={cursor:?}, stop_on={stop_on:?}");
    let mut subsequent_page_info: Option<String> = None;
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
    let edges: Messages = serde_json::from_value(nodes.clone())?;
    if edges.page_info.has_previous_page {
        subsequent_page_info = Some(edges.page_info.start_cursor);
    }

    tracing::debug!("snap={address} Loaded {} message(s)", edges.edges.len());
    for elem in edges.edges.iter().rev() {
        let raw_msg = &elem.message;
        if stop_on != None && raw_msg.created_at >= stop_on.unwrap() {
            subsequent_page_info = None;
            break;
        }
        if raw_msg.status != 5 || raw_msg.bounced || raw_msg.body.is_none() {
            continue;
        }

        tracing::trace!("snap={address} Decoding message {:?}", raw_msg.id);
        let decoding_result = decode_message_body(
            Arc::clone(context),
            ParamsOfDecodeMessageBody {
                abi: Abi::Json(gosh_abi::SNAPSHOT.1.to_string()),
                body: raw_msg.body.clone().unwrap(),
                is_internal: true,
                ..Default::default()
            },
        )
        .await;

        if let Err(ref e) = decoding_result {
            tracing::trace!("snap={address} decode_message_body error: {:#?}", e);
            tracing::trace!("snap={address} undecoded message: {:#?}", raw_msg);
            continue;
        }

        let decoded = decoding_result?;

        if decoded.name == "approve" {
            let value = decoded.value.unwrap();
            let diff: Diff = serde_json::from_value(value["diff"].clone()).unwrap();
            messages.push(DiffMessage {
                diff,
                created_at: raw_msg.created_at,
                created_lt: raw_msg.created_lt,
            });
        }
    }

    tracing::trace!("snap={address} Passed {} message(s)", messages.len());
    let oldest_timestamp = match messages.len() {
        0 => None,
        n => Some(messages[n - 1].created_at),
    };
    let page = PageIterator {
        cursor: subsequent_page_info,
        stop_on: oldest_timestamp,
    };
    Ok((messages, page))
}
