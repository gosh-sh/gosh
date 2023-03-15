#!/bin/bash
set -e
set -o pipefail
. ./util.sh

set -x

REPO_NAME="repo_bug_02_create_branch_$(date +%s)"

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
deploy_repo
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

cd $REPO_NAME

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"
git branch -m main

echo "Init commit" > README.md
git add *
git commit -m "init"

mkdir "dir1"
cd dir1
echo 11111 > a.txt
echo 22222 > b.txt
cd ..

mkdir "dir2"
cd dir2
echo 33333 > c.txt
echo 44444 > d.txt
cd ..

git add *
git commit -m "upload"
git push -u origin main

git checkout -b dev
git push -u origin dev
cd ..

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME "$REPO_NAME"_clone
cd "$REPO_NAME"_clone
git checkout dev

cur_content=$(cat dir2/c.txt)
if [ $cur_content != "33333" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

cd ..

echo "TEST SUCCEEDED"
exit 0

