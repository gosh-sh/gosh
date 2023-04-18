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

TOKEN=100
mint_tokens_3

RESERVE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq .reserve | cut -d '"' -f 2)
if [ "$RESERVE" != "100" ]; then
  echo Wrong amount of tokens in reserve
  exit 1
fi

ACCESS_KEY=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq .accessKey)
if [ "$ACCESS_KEY" != "null" ]; then
  echo Wrong access key
  exit 1
fi

start_paid_membership

sleep 60

ACCESS_KEY=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq .accessKey)
if [ "$ACCESS_KEY" != "$KEY_FOR_SERVICE" ]; then
  echo Wrong access key
  exit 1
fi

VALUE=$(tonos-cli -j runx --addr $DAO_ADDR --abi $DAO_ABI -m getDetails | jq .paidMembershipValue)
if [ "$VALUE" != "25" ]; then
  echo Wrong paid mem value
  exit 1
fi


echo "TEST SUCCEEDED"