#!/bin/bash
set -e
set -o pipefail
set -x

FIRST_VERSION=v5_x
#./node_se_scripts/deploy.sh $FIRST_VERSION
#. set-vars.sh $FIRST_VERSION

. ./util.sh

DAO_NAME="dao-prop_$(date +%s)"

deploy_DAO

OLD_WALLET_ADDR=$WALLET_ADDR

TOKEN=100
mint_tokens_3

RESERVE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq .reserve | cut -d '"' -f 2)
if [ "$RESERVE" != "100" ]; then
  echo Wrong amount of tokens in reserve
  exit 1
fi

ACCESS_KEY=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq '.paidMembership."1".accessKey')
if [ "$ACCESS_KEY" != "null" ]; then
  echo Wrong access key
  exit 1
fi

VALUE=50
VALUE_PER_SUB=50
TIME_FOR_SUB=100
start_paid_membership

sleep 30

ACCESS_KEY=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq '.paidMembership."1".accessKey' | cut -d '"' -f 2)
if [ "$ACCESS_KEY" != "$KEY_FOR_SERVICE" ]; then
  echo Wrong access key
  exit 1
fi

VALUE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq '.paidMembership."1".paidMembershipValue' | cut -d '"' -f 2)
if [ "$VALUE" != "50" ]; then
  echo Wrong paid mem value
  exit 1
fi

PUBKEY=$(cat $WALLET_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')
NEW_USER_PROFILE_NAME=paiduser
tonos-cli call --abi $SYSTEM_CONTRACT_ABI $SYSTEM_CONTRACT_ADDR deployProfile "{\"pubkey\":\"$PUBKEY\",\"name\":\"$NEW_USER_PROFILE_NAME\"}"
NEW_USER_PROFILE_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getProfileAddr "{\"name\":\"$NEW_USER_PROFILE_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
wait_account_active $NEW_USER_PROFILE_ADDR
echo "NEW_USER_PROFILE_ADDR=$NEW_USER_PROFILE_ADDR"

tonos-cli -j callx --addr $DAO_ADDR --abi $DAO_ABI --keys $WALLET_KEYS -m deployMemberFromSubs "{\"pubaddr\":\"$NEW_USER_PROFILE_ADDR\",\"isdao\":null,\"Programindex\":1}"

NEW_WALLET_ADDR=$(tonos-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$NEW_USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

tonos-cli callx --abi $USER_PROFILE_ABI --addr $NEW_USER_PROFILE_ADDR --keys $WALLET_KEYS -m turnOn --wallet $NEW_WALLET_ADDR --pubkey $PUBKEY

sleep 30

get_number_of_members

if [ "$MEMBERS_LEN" != "2" ]; then
  echo Wrong number of members
  exit 1
fi

RESERVE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq .reserve | cut -d '"' -f 2)
if [ "$RESERVE" != "50" ]; then
  echo Wrong amount of tokens in reserve
  exit 1
fi

WALLET_ADDR=$NEW_WALLET_ADDR
VOTE_TOKENS=50
TOKEN=10
mint_tokens_3

sleep 30

RESERVE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq .reserve | cut -d '"' -f 2)
if [ "$RESERVE" != "60" ]; then
  echo Wrong amount of tokens in reserve
  exit 1
fi

sleep 40

tonos-cli -j callx --addr $OLD_WALLET_ADDR --abi $WALLET_ABI --keys $WALLET_KEYS -m startCheckPaidMembership

get_number_of_members
if [ "$MEMBERS_LEN" != "1" ]; then
  echo Wrong number of members
  exit 1
fi

WALLET_ADDR=$OLD_WALLET_ADDR
VOTE_TOKENS=20
TOKEN=10
mint_tokens_3

sleep 30

RESERVE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq .reserve | cut -d '"' -f 2)
if [ "$RESERVE" != "70" ]; then
  echo Wrong amount of tokens in reserve
  exit 1
fi

echo "TEST SUCCEEDED"