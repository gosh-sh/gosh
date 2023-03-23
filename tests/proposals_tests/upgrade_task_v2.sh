#!/bin/bash
set -e
set -o pipefail
set -x
. ./util.sh

#Deploy DAO v2
#creat task
#solve task
#get first reward
#upgrade DAO to v3
#redeploy task
#get second part of reward

#./node_se_scripts/deploy.sh v2_x
#. set-vars.sh v2_x
#./upgrade_tests/set_up.sh v2_x v3_x

REPO_NAME=prop_repo01
DAO_NAME="dao-prop-test01_$(date +%s)"
NEW_REPO_PATH=prop_repo01_v2

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $NEW_REPO_PATH ] && rm -rf $NEW_REPO_PATH

#echo "0:427957f83cc1b7691afe6a23b37995e3a94a91dbd87ae272d67ab663e19507cf" | sed -r "s/:/x/"
#gosh-cli runx -m getWalletsFull | jq '.value0."0x3523b82fc597261e996f63ac0da83418447311f323e6cb3151b315bdfc39de38".count'

# deploy new DAO that will be upgraded
deploy_DAO_and_repo

mint_tokens

TASK_NAME="task1"
deploy_task_with_proposal

TASK_ADDR=$(tonos-cli -j runx --addr $WALLET_ADDR -m getTaskAddr --abi $WALLET_ABI --nametask $TASK_NAME --repoName $REPO_NAME | sed -n '/value0/ p' | cut -d'"' -f 4)
wait_account_active $TASK_ADDR

#DAO_ADDR=0:95fe284617d1637872fd6d481b638ae6f123b9934f7a05fb520f21de3004c3a3

USER_ADDR=$(echo $USER_PROFILE_ADDR | sed -r "s/:/x/")
DAO_ADDR=0:95fe284617d1637872fd6d481b638ae6f123b9934f7a05fb520f21de3004c3a3
TOKEN_CNT=$(tonos-cli -j runx --abi $DAO_ABI --addr $DAO_ADDR -m getWalletsFull | jq '.value0."'$USER_ADDR'".count' | cut -d'"' -f 2)

