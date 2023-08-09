#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

REPO_NAME="repo30_$(date +%s)"

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
git commit -m main
GOSH_TRACE=5 git push &> ../trace30_1.log

# echo "***** Create dev branch *****"
# git checkout -b dev
# echo dev > 1.txt
# git add 1.txt
# git commit -m dev
# GOSH_TRACE=5 git push  -u origin dev  &> ../trace30_dev.log

echo "***** Push to main branch *****"
git checkout main
echo main2 > 1.txt
git add 1.txt
git commit -m main2
GOSH_TRACE=5 git push &> ../trace30.log

# echo "***** Push to main branch *****"
# echo dev2 > 1.txt
# git add 1.txt
# git commit -m dev2
# git push


# echo "***** cloning repo *****"
cd ..

sleep 10

GOSH_TRACE=5 git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone" &> trace30_clone.log

echo "***** check repo *****"
cd "$REPO_NAME-clone"

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "main2" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

# cur_ver=$(cat 2.txt)
# if [ "$cur_ver" != "main" ]; then
#   echo "WRONG CONTENT"
#   exit 1
# fi
# echo "GOOD CONTENT"

echo "TEST SUCCEEDED"

