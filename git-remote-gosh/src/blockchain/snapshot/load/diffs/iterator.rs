use std::{error::Error, iter::Iterator};
use crate::blockchain::{
    get_commit_address,
    get_commit_by_addr,
    snapshot::diffs::Diff,
    Snapshot,
    TonClient,
};
use ton_client::net::ParamsOfQuery;
use ton_client::abi::{
    Abi,
    decode_message_body,
    ParamsOfDecodeMessageBody
};
use crate::abi as gosh_abi;

#[derive(Debug, Clone)]
pub struct DiffMessage {
    pub diff: Diff,
    pub created_at: u64,
    pub created_lt: u64,
}

#[derive(Debug)]
enum NextChunk {
    MessagesPage(String, Option<String>)
}

#[derive(Debug)]
pub struct DiffMessagesIterator {
    repo_addr: String,
    buffer: Vec<DiffMessage>,
    buffer_cursor: usize,
    next: Option<NextChunk>
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
    message: Message
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PageInfo {
    has_next_page: bool,
    end_cursor: String
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct Messages {
    edges: Vec<Node>,
    page_info: PageInfo
}


impl DiffMessagesIterator {
    #[instrument(level = "debug", skip(snapshot_address))]
    pub fn new(snapshot_address: impl Into<String>, repo_addr: String) -> Self {
        Self {
            repo_addr,
            buffer: vec![], 
            buffer_cursor: 0,
            next: Some(NextChunk::MessagesPage(snapshot_address.into(), None))
        }
    }

    #[instrument(level = "debug", skip(client))]
    pub async fn next(&mut self, client: &TonClient) -> Result<Option<DiffMessage>, Box<dyn Error>> {
        if !self.is_buffer_ready() {
            self.try_load_next_chunk(client).await?;
        }
        return Ok(self.try_take_next_item());
    }

    #[instrument(level = "debug", skip(client))]
    async fn try_load_next_chunk(&mut self, client: &TonClient) -> Result<(), Box<dyn Error>> {
        self.next = match &self.next {
            None => None,
            Some(NextChunk::MessagesPage(address, cursor)) => {
                let (buffer, next_page_info, stop_on) = load_messages_to(client, &address, cursor, None).await?;
                self.buffer = buffer;
                self.buffer_cursor = 0;
                match next_page_info {
                    Some(next_page_info) => Some(
                        NextChunk::MessagesPage(
                            address.to_string(),
                            Some(next_page_info)
                        )
                    ),
                    None => {
                        // find last commit
                        let Snapshot { original_commit, .. } = Snapshot::load(client, &address).await?;
                        let file_path = Snapshot::get_file_path(client, &address).await?;
                        let commit_addr = get_commit_address(client, &self.repo_addr, &original_commit).await?;
                        let commit_data = get_commit_by_addr(client, &commit_addr)
                            .await?
                            .expect("commit data should be here");
                        let original_branch = commit_data.branch;
                        // find what is it pointing to
                        let original_snapshot = Snapshot::calculate_address(
                            client,
                            &self.repo_addr,
                            &original_branch,
                            &file_path
                        ).await?;

                        // generate filter
                        Some(
                            NextChunk::MessagesPage(original_snapshot, None)
                        )
                    }
                }
            },
        };
        Ok(())
    }

    #[instrument(level = "debug")]
    fn is_buffer_ready(&self) -> bool {
        return self.buffer_cursor < self.buffer.len();
    }

    #[instrument(level = "debug")]
    fn try_take_next_item(&mut self) -> Option<DiffMessage> {
        if self.buffer_cursor >= self.buffer.len() {
            return None;
        }
        let item = self.buffer[self.buffer_cursor].clone();
        self.buffer_cursor += 1;
        return Some(item);
    }
    
}

#[instrument(level = "debug", skip(context))]
pub async fn load_messages_to(
    context: &TonClient,
    address: &str,
    cursor: &Option<String>,
    stop_on: Option<u64>,
) -> Result<(Vec<DiffMessage>, Option<String>, Option<u64>), Box<dyn Error>> {
    let mut next_page_info: Option<String> = None;
    let query = r#"query($addr: String!, $after: String){
      blockchain{
        account(address:$addr) {
          messages(msg_type:[IntIn], after:$after) {
            edges {
              node{ id body created_at created_lt status bounced }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }"#
    .to_string();

    let after = match cursor.as_ref() {
        Some(page_info) => page_info,
        None => ""
    };
    
    let result = ton_client::net::query(
        context.clone(),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({ 
                "addr": address, 
                "after": after
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
    if edges.page_info.has_next_page {
        next_page_info = Some(edges.page_info.end_cursor);
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
        }
    }

    let oldest_timestamp = match messages.len() {
        0 => None,
        n => Some(messages[n - 1].created_at)
    };
    Ok((messages, next_page_info, oldest_timestamp))
}
