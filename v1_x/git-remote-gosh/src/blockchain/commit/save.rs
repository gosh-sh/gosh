use std::collections::HashMap;
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
use std::ops::Deref;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use ton_client::abi::{DecodedMessageBody, ParamsOfDecodeMessageBody};
use ton_client::net::ParamsOfQuery;

#[derive(Serialize, Debug)]
pub struct DeployCommitParams {
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "branchName")]
    pub branch_name: String,
    #[serde(rename = "commitName")]
    pub commit_id: String,
    #[serde(rename = "fullCommit")]
    pub raw_commit: String,
    pub parents: Vec<BlockchainContractAddress>,
    #[serde(rename = "tree")]
    pub tree_addr: BlockchainContractAddress,
    upgrade: bool,
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
    id: String,
    body: Option<String>,
    #[serde(with = "ton_sdk::json_helper::uint")]
    created_lt: u64,
    bounced: bool,
}

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait BlockchainCommitPusher {
    async fn push_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        tree_addr: &BlockchainContractAddress,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
        raw_commit: &str,
        parents: &[BlockchainContractAddress],
        upgrade_commit: bool,
    ) -> anyhow::Result<()>;
    async fn notify_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        number_of_files_changed: u32,
        number_of_commits: u64,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
    ) -> anyhow::Result<()>;
}

#[async_trait]
impl BlockchainCommitPusher for Everscale {
    #[instrument(level = "info", skip_all)]
    async fn push_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        tree_addr: &BlockchainContractAddress,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
        raw_commit: &str,
        parents: &[BlockchainContractAddress],
        upgrade_commit: bool,
    ) -> anyhow::Result<()> {
        let args = DeployCommitParams {
            repo_name: remote.repo.clone(),
            branch_name: branch.to_string(),
            commit_id: commit_id.clone().to_string(),
            raw_commit: raw_commit.to_owned(),
            parents: parents.to_owned(),
            tree_addr: tree_addr.clone(),
            upgrade: upgrade_commit,
        };
        tracing::trace!("push_commit: dao_addr={dao_addr}");
        tracing::trace!("deployCommit params: {:?}", args);

        let wallet = self.user_wallet(&dao_addr, &remote.network).await?;
        let params = serde_json::to_value(args)?;
        let wallet_contract = wallet.take_one().await?;
        tracing::trace!("Acquired wallet: {}", wallet_contract.get_address());

        // let mut repo_contract = self.repo_contract.clone();
        let repo_contract = &mut self.repo_contract.clone();
        let commit = commit_id.clone().to_string();
        let expected_address =
            blockchain::get_commit_address(&self.ever_client, repo_contract, &commit).await?;

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
    ) -> anyhow::Result<()> {
        tracing::trace!("notify_commit: commit_id={commit_id}, branch={branch}, number_of_files_changed={number_of_files_changed}, number_of_commits={number_of_commits}, remote={remote:?}, dao_addr={dao_addr}");
        let wallet = self.user_wallet(&dao_addr, &remote.network).await?;
        let params = serde_json::json!({
            "repoName": remote.repo.clone(),
            "branchName": branch.to_string(),
            "commit": commit_id.to_string(),
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
        let timeout = Duration::from_secs(*crate::config::SET_COMMIT_TIMEOUT);

        let mut repo_contract = self.repo_contract.clone();
        let commit_address = get_commit_address(
            &self.ever_client,
            &mut repo_contract,
            &commit_id.to_string(),
        )
        .await?;
        let commit_contract = GoshContract::new(commit_address.clone(), gosh_abi::COMMIT);

        let filter = vec![
            "allCorrect".to_owned(),
            "cancelCommit".to_owned(),
            "NotCorrectRepo".to_owned(),
        ];
        let mut processed_messages = HashMap::new();
        loop {
            let found = find_messages(self, &commit_contract, &filter, from_lt).await?;
            let found = find_messages(self, &commit_contract, &filter, &mut processed_messages).await?;
            tracing::trace!("did found new messages for {}: {}", commit_contract.address, found.1);
            if let Some(message) = found.0 {
                match message.name.as_str() {
                    "allCorrect" => break,
                    "treeAccept" => break,
                    "cancelCommit" => bail!("Push failed. Fix and retry"),
                    "NotCorrectRepo" => bail!("Push failed. Fetch first"),
                    _ => {},
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
            sleep(Duration::from_secs(5)).await;
        }
        tracing::info!("Branch `{branch}` has been updated");
        Ok(())
    }
}

pub async fn query_all_messages(
    context: &Everscale,
    contract: &GoshContract,
) -> anyhow::Result<Vec<Message>> {
    tracing::trace!(
        "find_messages: contract.address={}",
        contract.address
    );
    let query = r#"query($contract: String!, $from: String) {
        messages(filter: {
            dst: { eq: $contract },
            created_lt: { gt: $from }
        }
        orderBy: [
            {
                path: "created_lt"
                direction: ASC
            }
        ]
        limit: 50
        ) {
            id body created_lt bounced
        }
    }"#
        .to_string();
    let mut from = 0u64;
    let dst_address = String::from(contract.get_address().clone());
    let mut result_messages = vec![];

    loop {
        let result = ton_client::net::query(
            Arc::clone(&context.ever_client),
            ParamsOfQuery {
                query: query.clone(),
                variables: Some(serde_json::json!({
                "contract": dst_address.clone(),
                "from": from.to_string()
            })),
                ..Default::default()
            },
        )
            .await
            .map(|r| r.result)?;
        let raw_messages = result["data"]["messages"].clone();
        let mut messages: Vec<Message> = serde_json::from_value(raw_messages)?;
        if messages.is_empty() {
            break;
        }
        from = messages.last().unwrap().created_lt;
        result_messages.append(&mut messages);
    }
    tracing::trace!("Found {} messages to {}", result_messages.len(), dst_address);
    Ok(result_messages)
}


#[instrument(level = "info", skip_all)]
pub async fn find_messages(
    context: &Everscale,
    contract: &GoshContract,
    filter: &Vec<String>,
    already_processed_messages: &mut HashMap<String, bool>,
) -> anyhow::Result<(Option<DecodedMessageBody>, bool)> {
    tracing::trace!("find_messages start contract:{}, processed_len:{}", contract.address, already_processed_messages.len());
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
        )
            .await;
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
    .map(|r| r.result)?;

    let trx: Vec<TrxInfo> = serde_json::from_value(result["data"]["transactions"].clone())?;

    let status = trx.len() > 0 && trx[0].status == 3 && trx[0].compute.exit_code == 0;

    Ok(status)
}
