#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

if [ "$1" = "ignore" ]; then
  echo "Test $0 ignored"
  exit 0
fi

REPO_NAME=upgrade_repo05_3
DAO_NAME="dao-upgrade-test05_3_$(date +%s)"
NEW_REPO_PATH=upgrade_repo05_3_v2
REPO_PATH_CHECK=upgrade_repo05_3_v2_check
REPO_PATH_CHECK2=upgrade_repo05_3_v2_check2

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $NEW_REPO_PATH ] && rm -rf $NEW_REPO_PATH
[ -d $REPO_PATH_CHECK ] && rm -rf $REPO_PATH_CHECK
[ -d $REPO_PATH_CHECK2 ] && rm -rf $REPO_PATH_CHECK2

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

echo "***** Create parent branch *****"
git checkout -b parent_branch

echo preparent > 2.txt
git add 2.txt
git commit -m testbranch

echo parent > 2.txt
git add 2.txt
git commit -m testbranch2

git push --set-upstream origin parent_branch

echo "***** Switch back to main *****"
git checkout main

cd ..

echo "Upgrade DAO"
upgrade_DAO

echo "***** new repo05a deploy *****"
tonos-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

export NEW_LINK="gosh://$SYSTEM_CONTRACT_ADDR_1/$DAO_NAME/$REPO_NAME"
echo "NEW_LINK=$NEW_LINK"

sleep 60

git clone $NEW_LINK $NEW_REPO_PATH
cd $NEW_REPO_PATH
git config user.email "foo@bar.com"
git config user.name "My name"
git branch -m main

echo "***** push to the new repo *****"
echo new_ver > 1.txt
git add 1.txt
git commit -m test2
git push -u origin main

git checkout -b parent_branch origin/parent_branch
git checkout main

echo "**** Merge parent branch *****"
git merge parent_branch -m merge
git push

#git log

cd ..

sleep 300

git clone $NEW_LINK $REPO_PATH_CHECK

cd $REPO_PATH_CHECK

cur_ver=$(cat 2.txt)
if [ "$cur_ver" != "parent" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

echo "after_merge" > 1.txt
git add 1.txt
git commit -m after_merge1
git push

echo "after_merge" > 2.txt
git add 2.txt
git commit -m after_merge2
git push

echo "***** cloning repo *****"
cd ..

sleep 300

git clone $NEW_LINK "$REPO_PATH_CHECK2"

echo "***** check repo *****"
cd "$REPO_PATH_CHECK2"

cur_ver=$(cat 2.txt)
if [ "$cur_ver" != "after_merge" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "after_merge" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

cd ..
echo "TEST SUCCEEDED"
