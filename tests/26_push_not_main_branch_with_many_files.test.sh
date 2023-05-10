#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

# Test 26 based on bug from onboarding
# it pushes files to branch different from main and check that clone works after it.
# 1. Deploy repo and clone it
# 2. Create branch master
# 3. Push file .gitignore and commit it
# 4. Add several commits with many files
# 5. Clone the repo

REPO_NAME="repo26_$(date +%s)"
BRANCH_NAME=master

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
git branch -m $BRANCH_NAME

echo "bin
*.class
keys
logs
" > .gitignore
git add .gitignore
git commit -m init

echo "***** Generating files *****"
FILES_CNT=205
for n in {1..200}; do
  echo "$n$n$n" > "$n.txt"
done
echo "bin
*.class
keys
logs
data
" > .gitignore

echo "***** Pushing file to the repo *****"
git add *
git add .gitignore
git commit -m push

echo "***** Generating files *****"
FILES_CNT=225
for n in {201..220}; do
  echo "$n$n$n" > "$n.txt"
done
echo "bin
*.class
logs
data
" > .gitignore

echo "***** Pushing file to the repo *****"
git add *
git add .gitignore
git commit -m push2

FILES_CNT=226
echo 1111 > file.txt
git add *
git commit -m push3

echo 2222 > file.txt
git add *
git commit -m push4
git push --all


echo "***** cloning repo *****"
cd ..

sleep 60

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
cd "$REPO_NAME-clone"
git checkout $BRANCH_NAME
cur_ver=$(ls -la | wc -l)
if [ "$cur_ver" != "$FILES_CNT" ]; then
  echo "WRONG NUMBER OF FILES"
  exit 1
fi
echo "GOOD NUMBER OF FILES"

echo "TEST SUCCEEDED"

