use std::iter::Iterator;
use std::error::Error;
use crate::blockchain::{
    TonClient,
    snapshot::diffs::Diff
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
    pub created_lt: u64,
}

enum NextChunk {
    Snapshot(String),
    MessagesPage(String)
}

pub struct DiffMessagesIterator {
    buffer: Vec<DiffMessage>,
    buffer_cursor: usize,
    next: Option<NextChunk>
}

impl DiffMessagesIterator {

    pub fn new(snapshot_address: impl Into<String>) -> Self {
        Self { 
            buffer: vec![], 
            buffer_cursor: 0,
            next: Some(NextChunk::Snapshot(snapshot_address.into()))
        }
    }

    pub async fn next(&mut self, client: &TonClient) -> Result<Option<DiffMessage>, Box<dyn Error>> {
        if !self.is_buffer_ready() {
            self.try_load_next_chunk(client).await?;
        }
        return Ok(self.try_take_next_item());
    }

    async fn try_load_next_chunk(&mut self, client: &TonClient) -> Result<(), Box<dyn Error>> {
        match &self.next {
            None => {},
            Some(NextChunk::Snapshot(address)) => {
                let (buffer, next_page_info) = load_messages_to(client, &address).await?;
                self.buffer = buffer;
                self.buffer_cursor = 0;
                self.next = match next_page_info {
                    Some(next_page_info) => Some(
                        NextChunk::MessagesPage(next_page_info)
                    ),
                    None => {
                        // find last commit
                        // find what is it pointing to
                        // generate filter
                        todo!();
                    }
                };
                
            },
            Some(NextChunk::MessagesPage(next_page_info)) => {
                  
            }
        }
        Ok(())
    }
    
    fn is_buffer_ready(&self) -> bool {
        return self.buffer_cursor < self.buffer.len();
    }

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
) -> Result<(Vec<DiffMessage>, Option<String>), Box<dyn Error>> {
    let mut next_page_info: Option<String> = None;
    let query = r#"query($addr: String!){
      blockchain{
        account(address:$addr) {
          messages(msg_type:[IntIn]) {
            edges {
              node{ id body created_lt status bounced }
              cursor
            }
            pageInfo { hasNextPage }
          }
        }
      }
    }"#
    .to_string();

    let result = ton_client::net::query(
        context.clone(),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({ "addr": address })),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)?;

    #[derive(Deserialize, Debug)]
    struct Message {
        id: String,
        body: String,
        #[serde(with = "ton_sdk::json_helper::uint")]
        created_lt: u64,
        status: u8,
        bounced: bool,
    }

    let mut messages: Vec<DiffMessage> = Vec::new();
    let nodes = result["data"]["blockchain"]["account"]["messages"]["edges"]
        .as_array()
        .unwrap();

    log::debug!("Loaded {} message(s) to {}", nodes.len(), address);
    for message in nodes {
        let raw_msg: Message = serde_json::from_value(message["node"].clone()).unwrap();
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
                    created_lt: raw_msg.created_lt,
                },
            );
        }
    }

    Ok((messages, next_page_info))
}
