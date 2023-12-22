use crate::blockchain::AddrVersion;
use crate::config::Config;
use crate::database::GoshDB;
use crate::{
    abi as gosh_abi,
    blockchain::{
        self,
        call::BlockchainCall,
        contract::{ContractInfo, GoshContract},
        get_commit_address,
        user_wallet::BlockchainUserWalletService,
        BlockchainContractAddress, Everscale,
    },
    utilities::Remote,
};
use anyhow::bail;
use async_trait::async_trait;
use git_hash::ObjectId;
use std::collections::HashMap;
use std::ops::Deref;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use ton_client::abi::{DecodedMessageBody, ParamsOfDecodeMessageBody};
use ton_client::net::ParamsOfQuery;

const GOSH_REMOTE_WAIT_TIMEOUT_ENV: &str = "GOSH_REMOTE_WAIT_TIMEOUT";

#[derive(Serialize, Debug, Deserialize)]
pub struct DeployCommitParams {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "commitName")]
    pub commit_id: String,
    #[serde(rename = "fullCommit")]
    pub raw_commit: String,
    pub parents: Vec<AddrVersion>,
    #[serde(rename = "shainnertree")]
    pub tree_sha: String,
    pub upgrade: bool,
}

#[derive(Deserialize, Debug)]
struct TrxCompute {
    exit_code: u32,
}

#[derive(Deserialize, Debug)]
struct TrxInfo {
    status: u32,
    compute: TrxCompute,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Message {
    pub id: String,
    pub body: Option<String>,
    #[serde(with = "ton_sdk::json_helper::uint")]
    pub created_lt: u64,
    pub bounced: bool,
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

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait BlockchainCommitPusher {
    async fn push_commit(
        &self,
        commit_address: &str,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
        database: Arc<GoshDB>,
    ) -> anyhow::Result<()>;
    async fn notify_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        number_of_files_changed: u32,
        number_of_commits: u64,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
        is_upgrade: bool,
        config: &Config,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl BlockchainCommitPusher for Everscale {
    #[instrument(level = "info", skip_all)]
    async fn push_commit(
        &self,
        commit_address: &str,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
        database: Arc<GoshDB>,
    ) -> anyhow::Result<()> {
        let bc_commit_address = BlockchainContractAddress::new(commit_address);
        let commit_contract = GoshContract::new(&bc_commit_address, gosh_abi::COMMIT);
        match commit_contract.is_active(&self.ever_client).await {
            Ok(true) => { return Ok(()) },
            _ => {}
        }

        let commit = database.get_commit(commit_address)?;
        let args = DeployCommitParams {
            repo_name: remote.repo.clone(),
            commit_id: commit.commit_id.clone(),
            raw_commit: commit.raw_commit,
            parents: commit.parents,
            tree_sha: commit.tree_sha,
            upgrade: commit.upgrade_commit,
        };
        tracing::trace!("push_commit: dao_addr={dao_addr}");
        tracing::trace!("deployCommit params: {:?}", args);

        let wallet = self.user_wallet(&dao_addr, &remote.network).await?;
        let params = serde_json::to_value(args)?;
        let wallet_contract = wallet.take_one().await?;
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());

        // let mut repo_contract = self.repo_contract.clone();
        let repo_contract = &mut self.repo_contract.clone();
        let expected_address =
            blockchain::get_commit_address(&self.ever_client, repo_contract, &commit.commit_id)
                .await?;

        let result = self
            .send_message(
                wallet_contract.deref(),
                "deployCommit",
                Some(params),
                Some(expected_address),
            )
            .await?;
        drop(wallet_contract);
        tracing::trace!("deployCommit result: {:?}", result);
        Ok(())
    }

    #[instrument(level = "info", skip_all)]
    async fn notify_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        number_of_files_changed: u32,
        number_of_commits: u64,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
        is_upgrade: bool,
        config: &Config,
    ) -> anyhow::Result<()> {
        tracing::trace!("notify_commit: commit_id={commit_id}, branch={branch}, number_of_files_changed={number_of_files_changed}, number_of_commits={number_of_commits}, remote={remote:?}, dao_addr={dao_addr}, is_upgrade={is_upgrade}");
        let wallet = self.user_wallet(&dao_addr, &remote.network).await?;
        let params = serde_json::json!({
            "repoName": remote.repo.clone(),
            "branchName": branch.to_string(),
            "commit": commit_id.to_string(),
            "isUpgrade": is_upgrade,
            "numberChangedFiles": number_of_files_changed,
            "numberCommits": number_of_commits,
        });
        let wallet_contract = wallet.take_zero_wallet().await?;
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());
        let result = self
            .send_message(&wallet_contract, "setCommit", Some(params), None)
            .await?;
        // drop(wallet_contract);
        tracing::trace!("setCommit msg id: {:?}", result.message_id);

        let mut start = Instant::now();
        let timeout = std::env::var(GOSH_REMOTE_WAIT_TIMEOUT_ENV)
            .ok()
            .map(|time| u64::from_str_radix(&time, 10).ok())
            .flatten()
            .unwrap_or(config.get_primary_network_timeout());
        tracing::trace!("Set commit timeout: {} sec", timeout);
        let timeout = Duration::from_secs(timeout);

        let mut repo_contract = self.repo_contract.clone();
        let commit_address = get_commit_address(
            &self.ever_client,
            &mut repo_contract,
            &commit_id.to_string(),
        )
        .await?;
        let commit_contract = GoshContract::new(commit_address.clone(), gosh_abi::COMMIT);

        let mut filter = vec![
            "allCorrect".to_owned(),
            "cancelCommit".to_owned(),
            "NotCorrectRepo".to_owned(),
        ];
        if is_upgrade {
            filter.push("treeAccept".to_owned());
        }
        let mut processed_messages = HashMap::new();
        loop {
            let found =
                find_messages(self, &commit_contract, &filter, &mut processed_messages).await?;
            tracing::trace!(
                "did find new messages for {}: {}",
                commit_contract.address,
                found.1
            );
            if let Some(message) = found.0 {
                match message.name.as_str() {
                    "allCorrect" => {
                        tracing::trace!("allCorrect params: {:?}", message.value);
                        if let Some(value) = message.value {
                            let accepted_branch = value
                                .as_object()
                                .unwrap()
                                .get("branch")
                                .unwrap()
                                .as_str()
                                .unwrap();
                            tracing::trace!("allCorrect branch: {}", accepted_branch);
                            if accepted_branch == branch {
                                break;
                            }
                        }
                        tracing::trace!("Wrong branch accepted, continue search");
                    }
                    "treeAccept" => break,
                    "cancelCommit" => bail!("Push failed. Fix and retry"),
                    "NotCorrectRepo" => bail!("Push failed. Fetch first"),
                    _ => {}
                };
            } else {
                if found.1 {
                    tracing::debug!("Reset timer");
                    start = Instant::now();
                }
            }

            if start.elapsed() > timeout {
                bail!("Time is up. Fix and retry");
            }
            sleep(Duration::from_secs(1)).await;
        }
        tracing::info!("Branch `{branch}` has been updated");
        Ok(())
    }
}

pub async fn query_all_messages(
    context: &Everscale,
    contract: &GoshContract,
) -> anyhow::Result<Vec<Message>> {
    tracing::trace!("find_messages: contract.address={}", contract.address);

    let query = r#"query($addr: String!, $after: String){
      blockchain {
        account(address: $addr) {
          messages(msg_type: [IntIn], after: $after, first: 50) {
            edges {
              node {  id body created_lt bounced }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }"#
    .to_string();

    let mut after = "0".to_string();
    let dst_address = String::from(contract.get_address().clone());
    let mut result_messages = vec![];

    loop {
        let result = ton_client::net::query(
            Arc::clone(&context.ever_client),
            ParamsOfQuery {
                query: query.clone(),
                variables: Some(serde_json::json!({
                    "addr": dst_address.clone(),
                    "after": after.to_string()
                })),
                ..Default::default()
            },
        )
        .await
        .map(|r| r.result)
        .map_err(|e| anyhow::format_err!("query error: {e}"))?;

        let nodes = &result["data"]["blockchain"]["account"]["messages"];
        let edges: Messages = serde_json::from_value(nodes.clone())?;
        let mut messages: Vec<Message> = edges
            .edges
            .iter()
            .map(|node| Message {
                id: node.message.id.split('/').last().unwrap().to_string(),
                body: node.message.body.clone(),
                created_lt: node.message.created_lt,
                bounced: node.message.bounced,
            })
            .collect();

        after = edges.page_info.end_cursor;
        result_messages.append(&mut messages);

        if !edges.page_info.has_next_page {
            break;
        }
    }
    tracing::trace!(
        "Found {} messages to {}",
        result_messages.len(),
        dst_address
    );
    Ok(result_messages)
}

#[instrument(level = "info", skip_all)]
pub async fn find_messages(
    context: &Everscale,
    contract: &GoshContract,
    filter: &Vec<String>,
    already_processed_messages: &mut HashMap<String, bool>,
) -> anyhow::Result<(Option<DecodedMessageBody>, bool)> {
    tracing::trace!(
        "find_messages start contract:{}, processed_len:{}",
        contract.address,
        already_processed_messages.len()
    );
    let messages = query_all_messages(context, contract).await?;
    let mut got_new_messages = false;
    for message in messages.iter() {
        if message.bounced || message.body.is_none() {
            continue;
        }
        if already_processed_messages.contains_key(&message.id) {
            continue;
        }

        let decoding_result = ton_client::abi::decode_message_body(
            Arc::clone(&context.ever_client),
            ParamsOfDecodeMessageBody {
                abi: contract.get_abi().clone(),
                body: message.body.clone().unwrap(),
                is_internal: true,
                ..Default::default()
            },
        );
        got_new_messages = true;
        already_processed_messages.insert(message.id.clone(), true);

        if let Err(ref e) = decoding_result {
            tracing::trace!("decode_message_body error: {:#?}", e);
            tracing::trace!("undecoded message: {:#?}", message);
            continue;
        }

        let decoded = decoding_result?;
        tracing::trace!("... decoded message: {:#?}", decoded);

        if filter.contains(&decoded.name) {
            let trx_status = is_transaction_ok(context, &message.id).await?;
            if trx_status {
                return Ok((Some(decoded.clone()), got_new_messages));
            }
        }
    }
    Ok((None, got_new_messages))
}

#[instrument(level = "info", skip_all)]
pub async fn is_transaction_ok(context: &Everscale, msg_id: &String) -> anyhow::Result<bool> {
    tracing::trace!("is_transaction_ok: msg_id={msg_id}");
    let query = r#"query($msg_id: String!) {
        transactions(filter: {
          in_msg: { eq: $msg_id }
        }) {
          status compute { exit_code }
        }
      }"#
    .to_string();

    let result = ton_client::net::query(
        Arc::clone(&context.ever_client),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({
                "msg_id": msg_id,
            })),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)
    .map_err(|e| anyhow::format_err!("query error: {e}"))?;

    let trx: Vec<TrxInfo> = serde_json::from_value(result["data"]["transactions"].clone())?;

    let status = trx.len() > 0 && trx[0].status == 3 && trx[0].compute.exit_code == 0;

    Ok(status)
}
