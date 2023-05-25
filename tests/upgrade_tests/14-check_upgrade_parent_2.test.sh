#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

# Test 13.
# This test checks that several commits uploads successfully with several of commits having parents from the previous version.
# 1. Deploy repo
# 2. Push several commits
# 3. Upgrade the repo
# 4. Create the following structure of commits
#   new3
#  /    \
# new1 new2
#  \    /
#   old

if [ "$1" = "ignore" ]; then
  echo "Test $0 ignored"
  exit 0
fi

REPO_NAME=upgrade_repo14
DAO_NAME="dao-upgrade-test14_$(date +%s)"
NEW_REPO_PATH=upgrade_repo14_v2

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $NEW_REPO_PATH ] && rm -rf $NEW_REPO_PATH

# deploy new DAO that will be upgraded
deploy_DAO_and_repo

export OLD_LINK="gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "OLD_LINK=$OLD_LINK"

echo "***** cloning old version repo *****"
git clone $OLD_LINK

# check
cd $REPO_NAME
git config user.email "foo@bar.com"
git config user.name "My name"
git branch -m main

echo 1111 > 1.txt
git add 1.txt
git commit -m old_main1
COMMIT_ID=$(git rev-parse --short HEAD)

echo 2222 > 1.txt
git add 1.txt
git commit -m old_main2

git push -u origin main

cd ..

echo "Upgrade DAO"
upgrade_DAO

echo "***** new repo02 deploy *****"
tonos-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI_1 | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "REPO_ADDR=$REPO_ADDR"

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

export NEW_LINK="gosh://$SYSTEM_CONTRACT_ADDR_1/$DAO_NAME/$REPO_NAME"
echo "NEW_LINK=$NEW_LINK"

cd $REPO_NAME
git checkout -b dev
echo 3333 > 3.txt
git add 3.txt
git commit -m dev1

git checkout main

echo 1111 > 1.txt
git add 1.txt
git commit -m main4

git merge dev -m merge

git push -u origin main

cd ..

echo "***** cloning repo with new link *****"
git clone $NEW_LINK $NEW_REPO_PATH

echo "***** push to new version *****"
cd $NEW_REPO_PATH

cur_ver=$(cat 3.txt)
if [ $cur_ver != "3333" ]; then
  echo "WRONG VERSION"
  exit 1
fi
echo "GOOD VERSION"

cur_ver=$(cat 1.txt)
if [ $cur_ver != "1111" ]; then
  echo "WRONG VERSION"
  exit 1
fi
echo "GOOD VERSION"

echo "TEST SUCCEEDED"
