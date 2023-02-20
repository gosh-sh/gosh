#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

if [ "$1" = "ignore" ]; then
  echo "Test $0 ignored"
  exit 0
fi

REPO_NAME=upgrade_repo05
DAO_NAME="dao-upgrade-test05_$(date +%s)"
NEW_REPO_PATH=upgrade_repo05_v2
REPO_PATH_CHECK=upgrade_repo05_v2_check

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $NEW_REPO_PATH ] && rm -rf $NEW_REPO_PATH
[ -d $REPO_PATH_CHECK ] && rm -rf $REPO_PATH_CHECK

# deploy new DAO that will be upgraded
deploy_DAO_and_repo

export REPO_LINK="gosh::$NETWORK://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "REPO_LINK=$REPO_LINK"

echo "***** cloning old version repo *****"
git clone $REPO_LINK

cd $REPO_NAME
echo "***** Pushing file to the repo *****"
echo main > 1.txt
git add 1.txt
git commit -m test
git push

echo "***** Create parent branch *****"
git checkout -b parent_branch

echo parent > 1.txt
git add 1.txt
git commit -m testbranch
git push --set-upstream origin parent_branch

echo "***** Switch back to main *****"
git checkout main

cd ..

echo "Upgrade DAO"
upgrade_DAO

echo "***** new repo05a deploy *****"
gosh-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

export NEW_LINK="gosh::$NETWORK://$SYSTEM_CONTRACT_ADDR_1/$DAO_NAME/$REPO_NAME"
echo "NEW_LINK=$NEW_LINK"

git clone $NEW_LINK $NEW_REPO_PATH
cd $NEW_REPO_PATH

echo "***** push to the new repo *****"
echo new_ver > 2.txt
git add 2.txt
git commit -m test2
git push

cur_ver=$(cat 1.txt)
if [ $cur_ver != "main" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"
#exit 0

git checkout -b parent_branch origin/parent_branch
git checkout main

echo "**** Merge parent branch *****"
git merge parent_branch -m merge
git push

git log

cur_ver=$(cat 1.txt)
if [ $cur_ver != "parent" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

cd ..

GOSH_TRACE=5 git clone $NEW_LINK $REPO_PATH_CHECK

echo "TEST SUCCEEDED"
