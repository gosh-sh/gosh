#!/bin/bash
set -e
set -o pipefail
. ./util.sh

REPO_NAME="repo1_$(date +%s)"

[ -d $REPO_NAME ] && rm -rf $REPO_NAME

deploy_repo
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

# check
cd $REPO_NAME
REPO_STATUS=1
if git status | grep 'No commits yet'; then
    REPO_STATUS=0
fi

echo ================== REPOSITORY ===================
echo "     REPO_NAME:" $REPO_NAME
echo "     REPO_ADDR:" $REPO_ADDR

echo gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

exit $REPO_STATUS
