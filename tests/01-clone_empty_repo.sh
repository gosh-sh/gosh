#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

REPO_NAME=repo1

[ -d $REPO_NAME ] && rm -rf $REPO_NAME

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository "{\"nameRepo\":\"$REPO_NAME\"}" || exit 1
REPO_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 120

sleep 60

echo "***** cloning repo *****"
git clone gosh::$NETWORK://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME

# check
cd $REPO_NAME
REPO_STATUS=1
if git status | grep 'No commits yet'; then
    REPO_STATUS=0
fi

echo ================== REPOSITORY ===================
echo "     REPO_NAME:" $REPO_NAME
echo "     REPO_ADDR:" $REPO_ADDR

exit $REPO_STATUS
