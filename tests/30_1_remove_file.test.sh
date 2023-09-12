#!/bin/bash
set -e
set -o pipefail
. ./util.sh

REPO_NAME="repo30_1_$(date +%s)"

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
date +%s > last
echo main1 > 1.txt
git add 1.txt
git add last
git commit -m main1

echo "***** Update file *****"
echo main2 > 1.txt
git add 1.txt
git commit -m main2

echo "***** Update file *****"
echo main3 > 1.txt
git add 1.txt
git commit -m main3

echo "***** Update file *****"
echo main4 > 1.txt
git add 1.txt
git commit -m main4

echo "***** Update file *****"
echo main5 > 1.txt
git add 1.txt
git commit -m main5

echo "***** Delete file *****"
git rm 1.txt
git commit -m "remove 1.txt"
git push -u origin main

echo "***** cloning repo *****"
cd ..

sleep 10

GOSH_TRACE=5 git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME "${REPO_NAME}-clone" &> trace-clone-$REPO_NAME.log

echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME "${REPO_NAME}-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi

exit $DIFF_STATUS
