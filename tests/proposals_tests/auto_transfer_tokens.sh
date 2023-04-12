#!/bin/bash
set -e
set -o pipefail
set -x

FIRST_VERSION=v4_x
SECOND_VERSION=v5_x
#./node_se_scripts/deploy.sh $FIRST_VERSION
#. set-vars.sh $FIRST_VERSION
#./upgrade_tests/set_up.sh $FIRST_VERSION $SECOND_VERSION

. ./util.sh

REPO_NAME=prop_repo02
DAO_NAME="dao-prop-child_$(date +%s)"

deploy_DAO

mint_tokens_3

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m _lockedBalance | jq '._lockedBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "20" ]; then
  echo Wrong amount of token
  exit 1
fi

tonos-cli -j runx --abi $DAO_ABI --addr $DAO_ADDR -m getWalletsFull

OLD_WALLET_ADDR=$WALLET_ADDR
OLD_DAO_ADDR=$DAO_ADDR

upgrade_DAO

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "0" ]; then
  echo Wrong amount of token
  exit 1
fi
tonos-cli -j runx --abi $DAO_ABI --addr $DAO_ADDR -m getWalletsFull

tonos-cli callx --addr $WALLET_ADDR --abi $WALLET_ABI --keys $WALLET_KEYS -m sendTokenToNewVersionAuto

sleep 30

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "0" ]; then
  echo Wrong amount of token
  exit 1
fi

tonos-cli -j runx --abi $DAO_ABI --addr $DAO_ADDR -m getWalletsFull

tonos-cli callx --addr $WALLET_ADDR --abi $WALLET_ABI --keys $WALLET_KEYS -m sendTokenToNewVersionAuto

sleep 30

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "20" ]; then
  echo Wrong amount of token
  exit 1
fi

echo "TEST SUCCEEDED"