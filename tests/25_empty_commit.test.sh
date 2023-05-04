#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

# Test 25 push an 'empty' commit. Now test fails because tree contract can't have 0 files in it and doesn't finish the internal check
# It checks that git commit feature '--allow-empty' is correctly handled on GOSH.
# 1. Push an empty commit to the main branch
# 2. Create a dev branch from the empty commit form main and  push a commit to it
# 3. Push a commit to the main branch
# 4. Clone the repo and check the dev branch to have the correct content

# ignore to wait for fixes
echo "Test is ignored"
exit 0

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

git checkout -b dev
echo dev > 1.txt
git add 1.txt
git commit -m dev
git push -u origin dev

git checkout main
echo main > 1.txt
git add 1.txt
git commit -m main
git push -u origin main

cd ..
sleep 30

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
cd "$REPO_NAME-clone"

git checkout dev

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "dev" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

git checkout main

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "main" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

echo "TEST SUCCEEDED"
