#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x
export RUST_LOG=debug

REPO_NAME="repo2_$(date +%s)"

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

deploy_repo
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
# wait_account_active $REPO_ADDR

sleep 3

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

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
GOSH_TRACE=5 git push -u origin $BRANCH_NAME &> ../trace_02.log

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..

sleep 1

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    echo "Success"
    DIFF_STATUS=0
fi

exit $DIFF_STATUS