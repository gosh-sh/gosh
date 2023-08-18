#!/bin/bash
set -e
set -o pipefail
. ./util.sh

REPO_NAME="repo4_$(date +%s)"

[ -d $REPO_NAME ] && rm -rf $REPO_NAME 
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

deploy_repo
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

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
GOSH_TRACE=5 git push -u origin $BRANCH_NAME &> ../trace_04.log
delay 10

echo "***** cloning repo *****"
cd ..

sleep 10

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    echo "Success"
    DIFF_STATUS=0
fi

exit $DIFF_STATUS
