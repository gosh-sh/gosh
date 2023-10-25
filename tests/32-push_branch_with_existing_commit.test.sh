#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

REPO_NAME="repo32_$(date +%s)"

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
git commit -m main1
GOSH_TRACE=5 git push -u origin main &> ../trace32.log

git checkout -b dev
echo main > 2.txt
git add 2.txt
git commit -m dev2
git push -u origin dev

git checkout main
git merge dev --ff 

echo commit > 1.txt
git add 1.txt
git commit -m main3
GOSH_TRACE=5 git push -u origin main &> ../trace32.log

sleep 60

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
cd "$REPO_NAME-clone"

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "commit" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"


echo "TEST SUCCEEDED"

