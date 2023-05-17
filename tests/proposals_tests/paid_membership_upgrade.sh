#!/bin/bash
set -e
set -o pipefail
set -x

FIRST_VERSION=v5_x
SECOND_VERSION=v6_x
#./node_se_scripts/deploy.sh $FIRST_VERSION
#. set-vars.sh $FIRST_VERSION
#./upgrade_tests/set_up.sh $FIRST_VERSION $SECOND_VERSION

. ./util.sh

DAO_NAME="dao-prop_$(date +%s)"

deploy_DAO

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

VALUE_PER_SUB=1
start_paid_membership

sleep 60

ACCESS_KEY=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq '.paidMembership."1".accessKey' | cut -d '"' -f 2)
if [ "$ACCESS_KEY" != "$KEY_FOR_SERVICE" ]; then
  echo Wrong access key
  exit 1
fi

VALUE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq '.paidMembership."1".paidMembershipValue' | cut -d '"' -f 2)
if [ "$VALUE" != "25" ]; then
  echo Wrong paid mem value
  exit 1
fi

get_number_of_members

if [ "$MEMBERS_LEN" != "1" ]; then
  echo Wrong number of members
  exit 1
fi

tonos-cli -j callx --addr $DAO_ADDR --abi $DAO_ABI --keys $WALLET_KEYS -m deployMemberFromSubs "{\"pubaddr\":\"0:654ad35f0efac1f781994b62e49968b947bb646319ef6ab5732ea66bd2c17451\",\"isdao\":null,\"Programindex\":1}"
tonos-cli -j callx --addr $DAO_ADDR --abi $DAO_ABI --keys $WALLET_KEYS -m deployMemberFromSubs "{\"pubaddr\":\"0:654ad35f0efac1f781994b62e49968b947bb646319ef6ab5732ea66bd2c17450\",\"isdao\":null,\"Programindex\":1}"

sleep 30

get_number_of_members

if [ "$MEMBERS_LEN" != "3" ]; then
  echo Wrong number of members
  exit 1
fi

OLD_WALLET_ADDR=$WALLET_ADDR
upgrade_DAO

tonos-cli runx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" -m m_pseudoDAOBalance
tonos-cli runx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" -m m_pseudoDAOVoteBalance



tonos-cli callx --addr $WALLET_ADDR --abi $WALLET_ABI_1 --keys $WALLET_KEYS -m sendTokenToNewVersionAuto

sleep 30

tonos-cli callx --addr $WALLET_ADDR --abi $WALLET_ABI_1 --keys $WALLET_KEYS -m sendTokenToNewVersionAuto

sleep 30

tonos-cli runx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" -m m_pseudoDAOBalance
tonos-cli runx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" -m m_pseudoDAOVoteBalance

tonos-cli callx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m lockVoting --amount 0

sleep 30

tonos-cli runx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" -m m_pseudoDAOBalance
tonos-cli runx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" -m m_pseudoDAOVoteBalance


ACCESS_KEY=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq '.paidMembership."1".accessKey' | cut -d '"' -f 2)
if [ "$ACCESS_KEY" != "$KEY_FOR_SERVICE" ]; then
  echo Wrong access key
  exit 1
fi

VALUE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq '.paidMembership."1".paidMembershipValue' | cut -d '"' -f 2)
if [ "$VALUE" != "23" ]; then
  echo Wrong paid mem value
  exit 1
fi

get_number_of_members

if [ "$MEMBERS_LEN" != "3" ]; then
  echo Wrong number of members
  exit 1
fi

tonos-cli -j callx --addr $WALLET_ADDR --abi $WALLET_ABI --keys $WALLET_KEYS -m startCheckPaidMembership

get_number_of_members

if [ "$MEMBERS_LEN" != "1" ]; then
  echo Wrong number of members
  exit 1
fi

stop_paid_membership

ACCESS_KEY=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq '.paidMembership."1".accessKey' )
if [ "$ACCESS_KEY" != "null" ]; then
  echo Wrong access key
  exit 1
fi

RESERVE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq .reserve | cut -d '"' -f 2)
if [ "$RESERVE" != "98" ]; then
  echo Wrong amount of tokens in reserve
  exit 1
fi

echo "TEST SUCCEEDED"