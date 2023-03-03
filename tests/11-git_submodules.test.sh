#!/bin/bash

# 1. create main repo
# 2. clone main repo
# 3. create local repo (submodule)
# 4. add file to main repo
# 5. add submodule to main repo
# 6. push changes
# 7. clone main repo into repo11-clone
# 8. comparing repositories

set -e
set -o pipefail
. ./util.sh

REPO_NAME=repo11
BRANCH_NAME=main
TESTS_DIR=`pwd`

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

# rename branch
git branch -m $BRANCH_NAME

CHANGE=$(date +%s)

# create new file
echo "foo" > foo-$CHANGE.txt

# create commit
git add foo-$CHANGE.txt
git commit -m "foo-$CHANGE"

SUBMODULE_DEST=from-github

git submodule add https://github.com/gosh-sh/test-repo.git SUBMODULE_DEST
git commit -m "Added github submodule"
echo "***** awaiting push into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo (2) *****"
cd ..
git clone --recurse-submodules \
    gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** comparing repositories (2) *****"

DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi

exit $DIFF_STATUS