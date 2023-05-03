#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

REPO_NAME="repo24_$(date +%s)"

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
echo 1 > 1.txt
git add 1.txt
git commit -m init
git push -u origin main

git checkout -b dev1
echo 2 > 2.txt
git add 2.txt
git commit -m dev1
git push -u origin dev1

git checkout main

git checkout -b dev2
echo 3 > 2.txt
git add 2.txt
git commit -m dev2
git push -u origin dev2
cd ..

sleep 60

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
cd "$REPO_NAME-clone"

git checkout dev1

cur_ver=$(cat 2.txt)
if [ "$cur_ver" != "2" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

git checkout dev2

cur_ver=$(cat 2.txt)
if [ "$cur_ver" != "3" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

echo "TEST SUCCEEDED"

