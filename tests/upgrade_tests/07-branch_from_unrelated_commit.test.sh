#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

if [ "$1" = "ignore" ]; then
  echo "Test $0 ignored"
  exit 0
fi

REPO_NAME=upgrade_repo07
DAO_NAME="dao-upgrade-test07_$RANDOM"

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
echo cur_ver > 1.txt
git add 1.txt
git commit -m test
git push

cd ..

echo "Upgrade DAO"
upgrade_DAO

echo "***** new repo07 deploy *****"
gosh-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$TEST_VERSION1\"}}" || exit 1
MIDDLE_REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $MIDDLE_REPO_ADDR
sleep 3

cd $REPO_NAME
echo "**** Fetch repo *****"
git fetch
echo middle_ver > 1.txt
git add 1.txt
git commit -m test2
git push
PARENT_COMMIT_ID=$(git rev-parse --short HEAD)

cd ..

echo "Upgrade DAO 2"
upgrade_DAO 2

echo "***** new repo07 deploy *****"
gosh-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$TEST_VERSION2\"}}" || exit 1
REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR_2 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

cd $REPO_NAME
echo "**** Fetch repo *****"
git fetch

cur_ver=$(cat 1.txt)
if [ $cur_ver != "cur_ver" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

echo new_ver > 1.txt
git add 1.txt
git commit -m test2
git push

git checkout -b parent_branch $PARENT_COMMIT_ID || true
if [ $? = 0 ]; then
  echo "Branch created from wrong commit id"
  exit 1
fi

cd ..

echo "TEST SUCCEEDED"
