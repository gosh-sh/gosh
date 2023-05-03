#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

REPO_NAME="repo25_$(date +%s)"

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

cmd="git checkout main"
echo $cmd
if eval $cmd; then
  echo "main should be invalid ref"
  exit 1
fi
echo "main is not valid (as expected)"

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"
git branch -m main

git commit --allow-empty -m main
git push -u origin main

cd ..
sleep 30

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
cd "$REPO_NAME-clone"

git checkout main
echo "TEST SUCCEEDED"
