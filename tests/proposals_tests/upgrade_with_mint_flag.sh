#!/bin/bash
set -e
set -o pipefail
set -x

#Deploy DAO v3
#creat task
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
. ./util.sh

REPO_NAME=prop_repo03
DAO_NAME="dao-prop-test03_$(date +%s)"

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME

# deploy new DAO that will be upgraded
deploy_DAO_and_repo

ALLOW_MINT=$(tonos-cli -j runx --abi "$DAO_ABI" --addr "$DAO_ADDR" -m _allowMint | jq '._allowMint')
if [ "$ALLOW_MINT" != "true" ]; then
  echo Mint flag is wrong
  exit 1
fi

tonos-cli callx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m AloneNotAllowMint

sleep 10

ALLOW_MINT=$(tonos-cli -j runx --abi "$DAO_ABI" --addr "$DAO_ADDR" -m _allowMint | jq '._allowMint')
if [ "$ALLOW_MINT" != "false" ]; then
  echo Mint flag is wrong
  exit 1
fi

echo "Upgrade DAO"
upgrade_DAO

ALLOW_MINT=$(tonos-cli -j runx --abi "$DAO_ABI" --addr "$DAO_ADDR" -m _allowMint | jq '._allowMint')
if [ "$ALLOW_MINT" != "false" ]; then
  echo Mint flag is wrong
  exit 1
fi

echo "TEST SUCCEEDED"
