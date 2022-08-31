use crate::abi as gosh_abi;
use crate::blockchain::GoshContract;
use crate::blockchain::{
    get_commit_address, get_commit_by_addr, snapshot::diffs::Diff, BlockchainContractAddress,
    Snapshot, TonClient,
};
use std::{error::Error, iter::Iterator};
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
    JumpToAnotherBranchSnapshot(BlockchainContractAddress, u64)
}

#[derive(Debug)]
pub struct DiffMessagesIterator {
    repo_contract: GoshContract,
    buffer: Vec<DiffMessage>,
    buffer_cursor: usize,
    next: Option<NextChunk>,
}

#[derive(Deserialize, Debug)]
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
    start_cursor: String
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct Messages {
    edges: Vec<Node>,
    page_info: PageInfo,
}

impl DiffMessagesIterator {
    #[instrument(level = "debug", skip(snapshot_address))]
    pub fn new(
        snapshot_address: impl Into<BlockchainContractAddress>,
        repo_contract: &mut GoshContract,
    ) -> Self {
        Self {
            repo_contract: repo_contract.clone(),
            buffer: vec![],
            buffer_cursor: 0,
            next: Some(NextChunk::MessagesPage(snapshot_address.into(), None, false))
        }
    }

    #[instrument(level = "debug", skip(client))]
    pub async fn next(
        &mut self,
        client: &TonClient,
    ) -> Result<Option<DiffMessage>, Box<dyn Error>> {
        while !self.is_buffer_ready() && self.next.is_some() {
            self.try_load_next_chunk(client).await?;
        }
        Ok(self.try_take_next_item())
    }

    async fn into_next_page(
        client: &TonClient,
        current_snapshot_address: &BlockchainContractAddress,
        repo_contract: &mut GoshContract,
        next_page_info: Option<String>,
        skip_series: bool,
    ) -> Result<Option<NextChunk>, Box<dyn Error>> {
        let address = current_snapshot_address;
        Ok(match next_page_info {
            Some(next_page_info) => Some(NextChunk::MessagesPage(
                    address.clone(),
                    Some(next_page_info),
                    skip_series,
                )
            ),
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
                log::info!("First commit in this branch to the file {} is {} and it was branched from {} -> snapshot addr: {}", file_path, original_commit, original_branch, original_snapshot);
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
    async fn try_load_next_chunk(&mut self, client: &TonClient) -> Result<(), Box<dyn Error>> {
        log::info!("loading next chunk -> {:?}", self.next);
        self.next = match &self.next {
            None => None,
            Some(NextChunk::JumpToAnotherBranchSnapshot(
                snapshot_address,
                ignore_commits_created_after,
            )) => {
                log::info!(
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
                    log::info!("loading messages");
                    let (buffer, possible_next_page_info, stop_on, skip) =
                        load_messages_to(client, &address, &cursor, None, false).await?;
                    log::info!("messages: {:?}", buffer);
                    for (i, item) in buffer.iter().enumerate() {
                        if &item.created_at <= ignore_commits_created_after {
                            index = Some(i);
                            break;
                        }
                    }
                    self.buffer = buffer;
                    if index.is_none() {
                        log::info!("Expected commit was not found");
                        if possible_next_page_info.is_some() {
                            cursor = possible_next_page_info;
                        } else {
                            panic!("We reached the end of the messages queue to a snapshot and were not able to find original commit there.")
                        }
                    } else {
                        log::info!("Commit found at {}", index.unwrap());
                        next_page_info = possible_next_page_info;
                    }
                    skip_series = skip;
                }
                self.buffer_cursor = index.unwrap();
                DiffMessagesIterator::into_next_page(
                    client,
                    &address,
                    &mut self.repo_contract,
                    next_page_info,
                    skip_series
                )
                .await?
            },
            Some(NextChunk::MessagesPage(address, cursor, skip)) => {
                let (buffer, next_page_info, stop_on, skip) =
                    load_messages_to(client, &address, cursor, None, *skip).await?;
                self.buffer = buffer;
                self.buffer_cursor = 0;
                DiffMessagesIterator::into_next_page(
                    client,
                    &address,
                    &mut self.repo_contract,
                    next_page_info,
                    skip,
                )
                .await?
            },
        };
        Ok(())
    }

    #[instrument(level = "debug")]
    fn is_buffer_ready(&self) -> bool {
        self.buffer_cursor < self.buffer.len()
    }

    #[instrument(level = "debug")]
    fn try_take_next_item(&mut self) -> Option<DiffMessage> {
        log::debug!("try_take_next_item = {:?}", self);
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
    context: &TonClient,
    address: &BlockchainContractAddress,
    cursor: &Option<String>,
    stop_on: Option<u64>,
    skip_series: bool,
) -> Result<(Vec<DiffMessage>, Option<String>, Option<u64>, bool), Box<dyn Error>> {
    let mut next_page_info: Option<String> = None;
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
        context.clone(),
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
    log::trace!("trying to decode: {:?}", nodes);
    let edges: Messages = serde_json::from_value(nodes.clone())?;
    if edges.page_info.has_previous_page {
        next_page_info = Some(edges.page_info.start_cursor);
    }

    log::debug!("Loaded {} message(s) to {}", edges.edges.len(), address);
    for elem in edges.edges {
        let raw_msg = elem.message;
        if stop_on != None && raw_msg.created_at >= stop_on.unwrap() {
            next_page_info = None;
            break;
        }
        if raw_msg.status != 5 || raw_msg.bounced {
            continue;
        }
        log::debug!("Decoding message {:?}", raw_msg.id);
        let decoded = decode_message_body(
            context.clone(),
            ParamsOfDecodeMessageBody {
                abi: Abi::Json(gosh_abi::SNAPSHOT.1.to_string()),
                body: raw_msg.body,
                is_internal: true,
                ..Default::default()
            },
        )
        .await?;

        log::debug!("Decoded message `{}`", decoded.name);
        if decoded.name == "applyDiff" {
            if skip { continue };
            let value = decoded.value.unwrap();
            let diff: Diff = serde_json::from_value(value["diff"].clone()).unwrap();
            messages.insert(
                0,
                DiffMessage {
                    diff,
                    created_at: raw_msg.created_at,
                    created_lt: raw_msg.created_lt,
                },
            );
        } else if decoded.name == "cancelDiff" {
            skip = true;
        } else if decoded.name == "approve" {
            skip = false;
        }
    }

    let oldest_timestamp = match messages.len() {
        0 => None,
        n => Some(messages[n - 1].created_at),
    };
    Ok((messages, next_page_info, oldest_timestamp, skip))
}
