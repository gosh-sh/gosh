#!/bin/bash
set -e

# create repo

REPO_NAME=repo1

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository "{\"nameRepo\":\"$REPO_NAME\"}" || exit 1
REPO_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

sleep 10
# clone repo
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME

# check
cd $REPO_NAME
REPO_STATUS=1
if git status | grep 'No commits yet'; then
    REPO_STATUS=0
fi

# deleting repo
cd ..
rm -rf $REPO_NAME

echo ================== REPOSITORY ===================
echo "     REPO_NAME:" $REPO_NAME
echo "     REPO_ADDR:" $REPO_ADDR

exit $REPO_STATUS
