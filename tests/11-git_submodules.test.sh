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
SUBMODULE=~/sm-local
BRANCH_NAME=main
TESTS_DIR=`pwd`

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $SUBMODULE ] && rm -rf $SUBMODULE
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

# create local repo (local submodule)
mkdir $SUBMODULE
cd $SUBMODULE

git init
git branch -m main

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

date +%s > file.txt
git add file.txt
git commit -m "Added file.txt"

cd $TESTS_DIR

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 30

echo "***** cloning repo *****"
git clone gosh::$NETWORK://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

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

SUBMODULE_DEST=from-local

# add submodule to repo and push it
git submodule add $SUBMODULE $SUBMODULE_DEST
git commit -m "Added local submodule"
echo "***** awaiting push into $BRANCH_NAME *****"
git push --set-upstream origin $BRANCH_NAME

echo "***** awaiting set commit into $BRANCH_NAME *****"
wait_set_commit $REPO_ADDR $BRANCH_NAME
sleep 30

echo "***** cloning repo *****"
cd ..
git clone --recurse-submodules \
    gosh::$NETWORK://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** comparing repositories *****"
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 20

rm -fr $REPO_NAME"-clone"

cd $REPO_NAME

SUBMODULE_DEST=from-github

git submodule add https://github.com/gosh-sh/test-repo.git SUBMODULE_DEST
git commit -m "Added github submodule"
echo "***** awaiting push into $BRANCH_NAME *****"
git push

echo "***** awaiting set commit into $BRANCH_NAME *****"
wait_set_commit $REPO_ADDR $BRANCH_NAME
sleep 30

echo "***** cloning repo (2) *****"
cd ..
git clone --recurse-submodules \
    gosh::$NETWORK://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** comparing repositories (2) *****"

DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi

exit $DIFF_STATUS