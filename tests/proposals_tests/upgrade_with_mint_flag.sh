#!/bin/bash
set -e
set -o pipefail
set -x

FIRST_VERSION=v4_x
SECOND_VERSION=v5_x
./node_se_scripts/deploy.sh $FIRST_VERSION
. set-vars.sh $FIRST_VERSION
./upgrade_tests/set_up.sh $FIRST_VERSION $SECOND_VERSION

. ./util.sh

REPO_NAME=prop_repo06
DAO_NAME="dao-prop_$(date +%s)"

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

get_number_of_members
if [ "$MEMBERS_LEN" != "1" ]; then
  echo "Wrong number of members"
  exit 1
fi

MEMBERS_CNT=59
TOTAL_CNT=$((MEMBERS_CNT + 1))
add_members_to_dao

iter=1
while [[ $MEMBERS_LEN -lt $TOTAL_CNT ]]
do
  sleep 60
  get_number_of_members
  if [ "$MEMBERS_LEN" == "$TOTAL_CNT" ]; then
    break
  fi
  echo "MEMBERS_LEN=$MEMBERS_LEN"
  ((iter = iter + 1))
  if [ "$iter" == "20" ]; then
    echo "Failed to deploy members"
    exit 1
  fi
done

echo "Upgrade DAO"
upgrade_DAO

ALLOW_MINT=$(tonos-cli -j runx --abi "$DAO_ABI" --addr "$DAO_ADDR" -m _allowMint | jq '._allowMint')
if [ "$ALLOW_MINT" != "false" ]; then
  echo Mint flag is wrong
  exit 1
fi
MEMBERS_LEN=0
iter=1
while [[ $MEMBERS_LEN -lt $TOTAL_CNT ]]
do
  sleep 60
  get_number_of_members
  if [ "$MEMBERS_LEN" == "$TOTAL_CNT" ]; then
    break
  fi
  echo "MEMBERS_LEN=$MEMBERS_LEN"
  ((iter = iter + 1))
  if [ "$iter" == "100" ]; then
    echo "Failed to deploy members"
    exit 1
  fi
done

echo "TEST SUCCEEDED"
