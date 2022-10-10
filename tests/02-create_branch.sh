#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

REPO_NAME=repo2

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository "{\"nameRepo\":\"$REPO_NAME\"}" || exit 1
REPO_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 60

echo "***** cloning repo *****"
git clone gosh::$NETWORK://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME

#check
cd $REPO_NAME

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

# create branch
CHANGE=$(date +%s)
BRANCH_NAME=branch-$CHANGE

git checkout -b $BRANCH_NAME

# create new file
echo "foo" > foo-$CHANGE.txt

# create commit and push
git add .
git commit -m "foo-$CHANGE"
echo "***** awaiting push into $BRANCH_NAME *****"
git push --set-upstream origin $BRANCH_NAME

echo "***** awaiting set commit into $BRANCH_NAME *****"
wait_set_commit $REPO_ADDR $BRANCH_NAME
sleep 120

echo "***** cloning repo *****"
cd ..
git clone gosh::$NETWORK://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi

exit $DIFF_STATUS