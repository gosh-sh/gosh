#!/bin/bash
set -e
set -o pipefail
. ./util.sh

REPO_NAME=repo1

[ -d $REPO_NAME ] && rm -rf $REPO_NAME

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":null}" || exit 1
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

exit $REPO_STATUS
