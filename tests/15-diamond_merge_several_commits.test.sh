#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

REPO_NAME="repo15"

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
git branch -m main
echo "***** Pushing file to the repo *****"
echo main > 1.txt
git add 1.txt
git commit -m test
git push -u origin main

echo "***** Create parent branch *****"
git checkout -b parent_branch

echo preparent > 1.txt
git add 1.txt
git commit -m testbranch

echo parent > 1.txt
git add 1.txt
git commit -m testbranch2

git push --set-upstream origin parent_branch

echo "***** Switch back to main *****"
git checkout main

echo "***** push to main *****"
echo new_ver > 2.txt
git add 2.txt
git commit -m test2
git push

echo "**** Merge parent branch *****"
git merge parent_branch -m merge
git push

#git log

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "parent" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

sleep 60

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
cd "$REPO_NAME-clone"

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "parent" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

cur_ver=$(cat 2.txt)
if [ "$cur_ver" != "new_ver" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

echo "TEST SUCCEEDED"

