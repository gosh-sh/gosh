#!/bin/bash
set -e
set -o pipefail
set -x

. ./util.sh

#Deploy DAO1 v3
#Deploy DAO2 v3
#create task
#solve task
#get first reward
#upgrade DAO to v4
#upgrade task
#get second part of reward


FIRST_VERSION=v3_x
SECOND_VERSION=v4_x
#./node_se_scripts/deploy.sh $FIRST_VERSION
#. set-vars.sh $FIRST_VERSION
#./upgrade_tests/set_up.sh $FIRST_VERSION $SECOND_VERSION
#exit 0

REPO_NAME=prop_repo03
DAO_NAME="dao-prop-child_$(date +%s)"
NEW_REPO_PATH=prop_repo03_v2
COMMIT_ABI="../$FIRST_VERSION/contracts/gosh/commit.abi.json"
SNAPSHOT_ABI="../$FIRST_VERSION/contracts/gosh/snapshot.abi.json"
TASK_ABI="../$FIRST_VERSION/contracts/gosh/task.abi.json"

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $NEW_REPO_PATH ] && rm -rf $NEW_REPO_PATH

#echo "0:427957f83cc1b7691afe6a23b37995e3a94a91dbd87ae272d67ab663e19507cf" | sed -r "s/:/x/"
#gosh-cli runx -m getWalletsFull | jq '.value0."0x3523b82fc597261e996f63ac0da83418447311f323e6cb3151b315bdfc39de38".count'

deploy_DAO

CHILD_DAO_NAME=$DAO_NAME
CHILD_DAO_ADDR=$DAO_ADDR
CHILD_WALLET_ADDR=$WALLET_ADDR

DAO_NAME="dao-prop_$(date +%s)"

deploy_DAO_and_repo

PARENT_DAO_NAME=$DAO_NAME
PARENT_DAO_ADDR=$DAO_ADDR
PARENT_WALLET_ADDR=$WALLET_ADDR

TOKEN=100
mint_tokens_3

CHILD_TOKEN=100
add_dao_to_dao

sleep 30

CHILD_ADDR=$(echo $CHILD_DAO_ADDR | sed -r "s/:/x/")
TOKEN_CNT=$(tonos-cli -j runx --abi $DAO_ABI --addr $PARENT_DAO_ADDR -m getWalletsFull | jq '.value0."'$CHILD_ADDR'".count' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "100" ]; then
  echo Wrong amount of token
  exit 1
fi

# wallet addr of child dao in parent dao
CHILD_DAO_WALLET_ADDR=$(tonos-cli -j runx --abi $DAO_ABI --addr $PARENT_DAO_ADDR -m getWalletsFull | jq '.value0."'$CHILD_ADDR'".member' | cut -d'"' -f 2)
echo "CHILD_DAO_WALLET_ADDR=$CHILD_DAO_WALLET_ADDR"



tonos-cli runx --abi $DAO_ABI --addr $PARENT_DAO_ADDR -m getTokenBalance
echo "***** start proposal for mint tokens deploy *****"
TOKEN=5
tonos-cli -j callx --abi $WALLET_ABI --addr $PARENT_WALLET_ADDR --keys $WALLET_KEYS -m startProposalForMintDaoReserve \
  --token $TOKEN --comment "" --num_clients 1 --reviewers []
NOW_ARG=$(tonos-cli -j account $PARENT_WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
echo "NOW_ARG=$NOW_ARG"
TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $PARENT_WALLET_ADDR -m getCellMintToken --token $TOKEN --comment "" --time $NOW_ARG | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "TVMCELL=$TVMCELL"

sleep 10

PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
  "{\"data\":\"$TVMCELL\"}" \
   --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "PROP_ID=$PROP_ID"
echo "***** get data for proposal *****"
tip3VotingLocker=$(tonos-cli -j run $PARENT_WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
echo "tip3VotingLocker=$tip3VotingLocker"

platform_id=$(tonos-cli -j runx --addr $PARENT_WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "platform_id=$platform_id"

# vote with dao in dao

tonos-cli -j callx --abi $WALLET_ABI --addr $CHILD_WALLET_ADDR --keys $WALLET_KEYS -m startProposalForDaoVote \
  --wallet $CHILD_DAO_WALLET_ADDR --platform_id $platform_id --choice true --amount 100 --num_clients_base 1 --note "" --comment "" --num_clients 1 --reviewers []
NOW_ARG=$(tonos-cli -j account $CHILD_WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
echo "NOW_ARG=$NOW_ARG"
TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $CHILD_WALLET_ADDR -m getCellDaoVote \
 --wallet $CHILD_DAO_WALLET_ADDR --platform_id $platform_id --choice true --amount 100 --num_clients_base 1 --note "" --comment "" --time $NOW_ARG | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "TVMCELL=$TVMCELL"

sleep 10

PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
  "{\"data\":\"$TVMCELL\"}" \
   --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)

WALLET_ADDR=$CHILD_WALLET_ADDR

vote_for_proposal

sleep 60

FREE_TOKEN_CNT=$(tonos-cli -j runx --abi $DAO_ABI --addr $PARENT_DAO_ADDR -m getTokenBalance | jq .value0 | cut -d'"' -f 2)
if [ "$FREE_TOKEN_CNT" != "5" ]; then
  echo Wrong amount of token
  exit 1
fi