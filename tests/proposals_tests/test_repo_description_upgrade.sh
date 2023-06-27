#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

#FIRST_VERSION=v4_x
#SECOND_VERSION=v5_x
#./node_se_scripts/deploy.sh $FIRST_VERSION
#. set-vars.sh $FIRST_VERSION
#./upgrade_tests/set_up.sh $FIRST_VERSION $SECOND_VERSION

REPO_NAME=prop_repo07
DAO_NAME="dao-prop_$(date +%s)"

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME

deploy_DAO

DESCRIPTION="superpupperrepo"

echo "***** repo deploy *****"
tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
  "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"$DESCRIPTION\",\"previous\":null}" || exit 1


REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "REPO_ADDR=$REPO_ADDR"

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

DESC=$(tonos-cli -j runx --abi $REPO_ABI --addr $REPO_ADDR -m _description | jq '._description' | cut -d'"' -f 2)
if [ "$DESC" != "$DESCRIPTION" ]; then
  echo Wrong repo description
  exit 1
fi

echo "Upgrade DAO"
upgrade_DAO

echo "***** new repo02 deploy *****"
tonos-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI_1 | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "REPO_ADDR=$REPO_ADDR"

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

DESC=$(tonos-cli -j runx --abi $REPO_ABI_1 --addr $REPO_ADDR -m _description | jq '._description' | cut -d'"' -f 2)
if [ "$DESC" != "$DESCRIPTION" ]; then
  echo Wrong repo description
  exit 1
fi

echo "TEST SUCCEEDED"
