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
DAO_NAME="dao-upgrade-test06a_$(date +%s)"
REPO_PATH_CHECK=upgrade_repo06a_check

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $REPO_PATH_CHECK ] && rm -rf $REPO_PATH_CHECK

# deploy new DAO that will be upgraded
deploy_DAO_and_repo

export REPO_LINK="gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "REPO_LINK=$REPO_LINK"

echo "***** cloning old version repo *****"
git clone $REPO_LINK

cd $REPO_NAME
git config user.email "foo@bar.com"
git config user.name "My name"
git branch -m main
echo "***** Pushing file to the repo *****"
echo main > 1.txt
git add 1.txt
git commit -m test
git push -u origin main

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
tonos-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

echo "***** push to new version *****"
cd $REPO_NAME
echo middle_ver > 2.txt
git add 2.txt
git commit -m test2
git push

cd ..

echo "Upgrade DAO 2"
upgrade_DAO_2

echo "***** new repo06a deploy *****"
tonos-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$TEST_VERSION1\"}}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR_2 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

echo "***** push to latest version *****"
cd $REPO_NAME
echo new_ver > 2.txt
git add 2.txt
git commit -m test2
git push

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "main" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

echo "**** Merge grandparent branch *****"
git merge grandparent_branch -m merge
git push

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "grandparent" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

cd ..

git clone $NEW_LINK $REPO_PATH_CHECK


echo "TEST SUCCEEDED"
