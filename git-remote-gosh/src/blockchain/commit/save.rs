use crate::{
    abi as gosh_abi,
    blockchain::{
        call::BlockchainCall, user_wallet::BlockchainUserWalletService, BlockchainContractAddress,
        Everscale, get_commit_address, contract::{ContractInfo, GoshContract}
    },
    utilities::Remote,
};
use anyhow::bail;
use async_trait::async_trait;
use git_hash::ObjectId;
use ton_client::abi::{ParamsOfDecodeMessageBody, DecodedMessageBody};
use ton_client::net::ParamsOfQuery;
use std::ops::Deref;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;

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
    #[instrument(level = "debug")]
    async fn push_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        tree_addr: &BlockchainContractAddress,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
        raw_commit: &str,
        parents: &[BlockchainContractAddress],
    ) -> anyhow::Result<()> {
        let args = DeployCommitParams {
            repo_name: remote.repo.clone(),
            branch_name: branch.to_string(),
            commit_id: commit_id.to_string(),
            raw_commit: raw_commit.to_owned(),
            parents: parents.to_owned(),
            tree_addr: tree_addr.clone(),
            upgrade: false,
        };
        tracing::debug!("deployCommit params: {:?}", args);

        let wallet = self.user_wallet(&dao_addr, &remote.network).await?;
        let params = serde_json::to_value(args)?;
        let wallet_contract = wallet.take_one().await?;
        tracing::debug!("Acquired wallet: {}", wallet_contract.get_address());
        let result = self
            .call(wallet_contract.deref(), "deployCommit", Some(params))
            .await?;
        drop(wallet_contract);
        tracing::debug!("deployCommit result: {:?}", result);
        Ok(())
    }

    #[instrument(level = "debug", skip(self))]
    async fn notify_commit(
        &self,
        commit_id: &ObjectId,
        branch: &str,
        number_of_files_changed: u32,
        number_of_commits: u64,
        remote: &Remote,
        dao_addr: &BlockchainContractAddress,
    ) -> anyhow::Result<()> {
        let wallet = self.user_wallet(&dao_addr, &remote.network).await?;
        let params = serde_json::json!({
            "repoName": remote.repo.clone(),
            "branchName": branch.to_string(),
            "commit": commit_id.to_string(),
            "numberChangedFiles": number_of_files_changed,
            "numberCommits": number_of_commits,
        });
        let wallet_contract = wallet.take_one().await?;
        tracing::debug!("Acquired wallet: {}", wallet_contract.get_address());
        let result = self
            .call(wallet_contract.deref(), "setCommit", Some(params))
            .await?;
        drop(wallet_contract);
        tracing::debug!("setCommit trx id: {:?}", result.trx_id);

        let start = Instant::now();
        let timeout = Duration::from_secs(*crate::config::SET_COMMIT_TIMEOUT);

        let mut repo_contract = self.repo_contract.clone();
        let commit_address =
            get_commit_address(&self.ever_client, &mut repo_contract, &commit_id.to_string())
            .await?;
        let commit_contract = GoshContract::new(commit_address.clone(), gosh_abi::COMMIT);

        let filter = vec!["allCorrect".to_owned(), "cancelCommit".to_owned(), "NotCorrectRepo".to_owned()];
        let mut from_lt = 0;

        loop {
            let found = find_messages(
                self,
                &commit_contract,
                &filter,
                from_lt,
            ).await?;
            if let Some(message) = found.0 {
                match message.name.as_str() {
                    "allCorrect" => break,
                    "cancelCommit" => bail!("Push failed. Fix and retry"),
                    "NotCorrectRepo" => bail!("Push failed. Fetch first"),
                    _ => from_lt = found.1,
                };
            } else {
                from_lt = found.1;
            }

            if start.elapsed() > timeout {
                break;
            }
            sleep(Duration::from_secs(10)).await;
        }
        tracing::info!("Time spent on `set_commit` is: {:?}", start.elapsed());
        Ok(())
    }
}

#[instrument(level = "debug", skip(context))]
pub async fn find_messages(
    context: &Everscale,
    contract: &GoshContract,
    filter: &Vec<String>,
    from_lt: u64,
) -> anyhow::Result<(Option<DecodedMessageBody>, u64)> {
    let query = r#"query($contract: String!, $from: String) {
        messages(filter: {
            dst: { eq: $contract },
            created_lt: { gt: $from }
        }) {
            id body created_lt bounced
        }
    }"#
    .to_string();
    let dst_address = String::from(contract.get_address().clone());
    let result = ton_client::net::query(
        Arc::clone(&context.ever_client),
        ParamsOfQuery {
            query,
            variables: Some(serde_json::json!({
                "contract": dst_address,
                "from": from_lt.to_string()
            })),
            ..Default::default()
        },
    )
    .await
    .map(|r| r.result)?;
    let raw_messages = result["data"]["messages"].clone();
    let messages: Vec<Message> = serde_json::from_value(raw_messages)?;

    let mut last_lt = 0u64;
    for message in messages.iter() {
        if message.bounced || message.body.is_none() {
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

        if let Err(ref e) = decoding_result {
            tracing::debug!("decode_message_body error: {:#?}", e);
            tracing::debug!("undecoded message: {:#?}", message);
            continue;
        }

        let decoded = decoding_result?;
        tracing::debug!("... decoded message: {:#?}", decoded);

        if filter.contains(&decoded.name) {
            let trx_status = is_transaction_ok(context, &message.id).await?;
            if trx_status {
                return Ok((Some(decoded.clone()), message.created_lt));
            }
        }
        last_lt = message.created_lt;
    }
    Ok((None, last_lt))
}

#[instrument(level = "debug", skip(context))]
pub async fn is_transaction_ok(
    context: &Everscale,
    msg_id: &String,
) -> anyhow::Result<bool> {
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

    let trx: Vec<TrxInfo> =
        serde_json::from_value(result["data"]["transactions"].clone())?;

    let status = trx.len() > 0 && trx[0].status == 3 && trx[0].compute.exit_code == 0;

    Ok(status)
}