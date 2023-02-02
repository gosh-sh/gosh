#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

if [ "$1" = "ignore" ]; then
  echo "Test $0 ignored"
  exit 0
fi

REPO_NAME=upgrade_repo06a
DAO_NAME="dao-upgrade-test06a_$RANDOM"

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME

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

echo "***** Create grandparent branch *****"
git checkout -b grandparent_branch

echo grandparent > 1.txt
git add 1.txt
git commit -m test
git push --set-upstream origin grandparent_branch

echo "***** Switch back to main *****"
git checkout main

cd ..

echo "Upgrade DAO"
upgrade_DAO

echo "***** new repo06a deploy *****"
gosh-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

cd $REPO_NAME
echo "**** Fetch repo *****"
git fetch
echo middle_ver > 2.txt
git add 2.txt
git commit -m test2
git push

cd ..

echo "Upgrade DAO 2"
upgrade_DAO 2

echo "***** new repo06a deploy *****"
gosh-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$TEST_VERSION1\"}}" || exit 1
REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR_2 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

cd $REPO_NAME
echo "**** Fetch repo *****"
git fetch
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

echo "**** Merge grandparent branch *****"
git merge grandparent_branch

cur_ver=$(cat 1.txt)
if [ $cur_ver != "grandparent" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

cd ..

echo "TEST SUCCEEDED"
