#!/bin/bash
set -e 
set -o pipefail
. ./util.sh
#set -x

REPO_NAME=repo4

[ -d $REPO_NAME ] && rm -rf $REPO_NAME 
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository "{\"nameRepo\":\"$REPO_NAME\"}" || exit 1
REPO_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 30

echo "***** cloning repo *****"
git clone gosh::$NETWORK://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME

#check
cd $REPO_NAME

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

CHANGE=$(date +%s)
BRANCH_NAME=branch-$CHANGE

# create branch
git checkout -b $BRANCH_NAME

# create new files
echo "Hello a! its $CHANGE now" > a-$CHANGE.txt
echo "Hello b! its $CHANGE now" > b.txt

mkdir dir
echo "Hello Bar! its $CHANGE now" > dir/bar-$CHANGE.txt

git add .
git commit -m "test-push-$CHANGE"

# rewrite files
echo "Hello again A! its $CHANGE now" > a-$CHANGE.txt
echo "Hello again! its $CHANGE now" > dir/bar-$CHANGE.txt

git add .
git commit -m "test-push-again-$CHANGE"

# rewrite files
echo "Now b! its $CHANGE now" > b.txt
echo "Now Bar! its $CHANGE now" > dir/bar-$CHANGE.txt

git add .
git commit -m "test-push-now-$CHANGE"

echo "***** awaiting push into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

echo "***** awaiting set commit into $BRANCH_NAME *****"
wait_set_commit $REPO_ADDR $BRANCH_NAME
sleep 30

echo "***** cloning repo *****"
cd ..
git clone gosh::$NETWORK://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi

exit $DIFF_STATUS

