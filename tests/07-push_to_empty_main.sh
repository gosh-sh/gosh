#!/bin/bash

# 1 create repo
# 2 new file
# 3 push changes
# 4 clone repo

set -e 
set -o pipefail
. ./util.sh

REPO_NAME=repo7

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1
REPO_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 30

# clone repo
echo "***** cloning repo *****"
git clone gosh::$NETWORK://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME

#check
cd $REPO_NAME

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

git branch -m main
# create new file
CHANGE=$(date +%s)
echo "foo" > foo-$CHANGE.txt

# create commit and push
git add .
git commit -m "foo-$CHANGE"

echo "***** awaiting push into main *****"
git push --set-upstream origin main

echo "***** awaiting set commit in main *****"
wait_set_commit $REPO_ADDR main
sleep 30

echo "***** cloning repo *****"
cd ..
git clone gosh::$NETWORK://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi

exit $DIFF_STATUS