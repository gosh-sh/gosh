#!/bin/bash
set -e
set -o pipefail
set -x

#FIRST_VERSION=v4_x
#SECOND_VERSION=v5_x
#./node_se_scripts/deploy.sh $FIRST_VERSION
#. set-vars.sh $FIRST_VERSION
#./upgrade_tests/set_up.sh $FIRST_VERSION $SECOND_VERSION

. ./util.sh

REPO_NAME=prop_repo02
DAO_NAME="dao-prop-child_$(date +%s)"

deploy_DAO

CHILD_DAO_NAME=$DAO_NAME
CHILD_DAO_ADDR=$DAO_ADDR
CHILD_WALLET_ADDR=$WALLET_ADDR

DAO_NAME="dao-prop_$(date +%s)"

deploy_DAO_and_repo

PARENT_DAO_NAME=$DAO_NAME
PARENT_DAO_ADDR=$DAO_ADDR
PARENT_WALLET_ADDR=$WALLET_ADDR

mint_tokens_3

add_dao_to_dao

sleep 30

CHILD_ADDR=$(echo $CHILD_DAO_ADDR | sed -r "s/:/x/")
CHILD_DAO_WALLET_ADDR=$(tonos-cli -j runx --abi $DAO_ABI --addr $PARENT_DAO_ADDR -m getWalletsFull | jq '.value0."'$CHILD_ADDR'".member' | cut -d'"' -f 2)
echo "CHILD_DAO_WALLET_ADDR=$CHILD_DAO_WALLET_ADDR"

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI --addr $CHILD_DAO_WALLET_ADDR -m _lockedBalance | jq '._lockedBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "1" ]; then
  echo Wrong amount of token
  exit 1
fi

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI --addr $PARENT_WALLET_ADDR -m _lockedBalance | jq '._lockedBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "20" ]; then
  echo Wrong amount of token
  exit 1
fi

echo "Upgrade parent DAO"
WALLET_ADDR=$PARENT_WALLET_ADDR
upgrade_DAO

NEW_PARENT_WALLET_ADDR=$WALLET_ADDR
NEW_PARENT_DAO_ADDR=$DAO_ADDR

echo "Upgrade child DAO"
WALLET_ADDR=$CHILD_WALLET_ADDR
DAO_NAME=$CHILD_DAO_NAME
upgrade_DAO

NEW_CHILD_WALLET_ADDR=$WALLET_ADDR
NEW_CHILD_DAO_ADDR=$DAO_ADDR

CHILD_ADDR=$(echo $NEW_CHILD_DAO_ADDR | sed -r "s/:/x/")
NEW_CHILD_DAO_WALLET_ADDR=$(tonos-cli -j runx --abi $DAO_ABI --addr $NEW_PARENT_DAO_ADDR -m getWalletsFull | jq '.value0."'$CHILD_ADDR'".member' | cut -d'"' -f 2)
echo "NEW_CHILD_DAO_WALLET_ADDR=$NEW_CHILD_DAO_WALLET_ADDR"


TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI_1 --addr $NEW_PARENT_WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "0" ]; then
  echo Wrong amount of token
  exit 1
fi

tonos-cli callx --addr $NEW_PARENT_WALLET_ADDR --abi $WALLET_ABI_1 --keys $WALLET_KEYS -m sendTokenToNewVersionAuto

sleep 30

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI_1 --addr $NEW_PARENT_WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "0" ]; then
  echo Wrong amount of token
  exit 1
fi

tonos-cli callx --addr $NEW_PARENT_WALLET_ADDR --abi $WALLET_ABI_1 --keys $WALLET_KEYS -m sendTokenToNewVersionAuto

sleep 30

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI_1 --addr $NEW_PARENT_WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "20" ]; then
  echo Wrong amount of token
  exit 1
fi


TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI_1 --addr $NEW_CHILD_DAO_WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "0" ]; then
  echo Wrong amount of token
  exit 1
fi

tonos-cli callx --addr $NEW_CHILD_WALLET_ADDR --abi $WALLET_ABI_1 --keys $WALLET_KEYS -m daoSendTokenToNewVersionAuto --wallet $NEW_CHILD_DAO_WALLET_ADDR

sleep 30

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI_1 --addr $NEW_CHILD_DAO_WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
echo "DAO_TOKEN_CNT=$TOKEN_CNT"


tonos-cli callx --addr $NEW_CHILD_WALLET_ADDR --abi $WALLET_ABI_1 --keys $WALLET_KEYS -m daoSendTokenToNewVersionAuto --wallet $NEW_CHILD_DAO_WALLET_ADDR

sleep 30

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI_1 --addr $NEW_CHILD_DAO_WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
echo "DAO_TOKEN_CNT=$TOKEN_CNT"

if [ "$TOKEN_CNT" != "1" ]; then
  echo Wrong amount of token
  exit 1
fi


echo "TEST SUCCEEDED"