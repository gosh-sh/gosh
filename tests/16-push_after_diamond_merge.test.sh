#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

REPO_NAME="repo16"
CHECK_REPO_PATH="$REPO_NAME""_check"

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"
[ -d $CHECK_REPO_PATH ] && rm -rf $CHECK_REPO_PATH

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":null}" || exit 1
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

echo "***** Pushing file to the repo *****"
echo main > 1.txt
git add 1.txt
git commit -m test
git push

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
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME "$CHECK_REPO_PATH"

echo "***** check repo *****"
cd "$CHECK_REPO_PATH"

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "after_merge" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

cur_ver=$(cat 2.txt)
if [ "$cur_ver" != "after_merge" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"


cd ..
echo "TEST SUCCEEDED"

