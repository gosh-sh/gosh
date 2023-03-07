#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

if [ "$1" = "ignore" ]; then
  echo "Test $0 ignored"
  exit 0
fi

REPO_NAME=upgrade_repo03
DAO_NAME="dao-upgrade-test03_$(date +%s)"

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME

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

# push 1 file
echo "***** Pushing file to the repo *****"
echo old_ver > 1.txt
git add 1.txt
git commit -m test
git push -u origin main
PARENT_COMMIT_ID=$(git rev-parse --short HEAD)

cd ..

echo "Upgrade DAO"
upgrade_DAO

echo "***** new repo03 deploy *****"
tonos-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

cd $REPO_NAME
echo "**** Fetch repo *****"
git fetch
echo new_ver > 1.txt
git add 1.txt
git commit -m test2
git push

echo "***** create branch heading to old commit *****"
git checkout -b parent_branch $PARENT_COMMIT_ID
cur_ver=$(cat 1.txt)
if [ $cur_ver != "old_ver" ]; then
  echo "WRONG VERSION"
  exit 1
fi
echo "GOOD VERSION"

echo branch > 1.txt
git add 1.txt
git commit -m test2
git push --set-upstream origin parent_branch

cd ..

echo "TEST SUCCEEDED"
