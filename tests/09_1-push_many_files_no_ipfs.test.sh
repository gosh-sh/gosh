#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

# Test 19_1 pushes many files not to ipfs
# It checks that contracts correctly work with big amount of files, especially that they don't exceed their balances
# while processing big amount of diffs (that's why it is important to have files not in ipfs) and correctly ask for
# balance top ups.
# 1. Create main branch and push init commit to it
# 2. Create dev branch and push a big amount of files to one commit
# 3. Clone the repo and check dev branch to have an appropriate number of files

REPO_NAME="repo19_$(date +%s)"

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

echo 1 > 1.txt
git add 1.txt
git commit -m init
git push -u origin main

git checkout -b dev
echo "***** Generating files *****"
if [[ "$VERSION" =~ "v4_x" ]]; then
  FILES_CNT=504
  for n in {1..500}; do
      echo "$n$n$n" > "$n.txt"
  done
else
  FILES_CNT=304
  for n in {1..300}; do
      echo "$n$n$n" > "$n.txt"
  done
fi

echo $(ls -la | wc -l)

echo "***** Pushing file to the repo *****"
git add *
git commit -m push
GOSH_TRACE=5 git push -u origin dev &> ../trace_09.log

echo "***** cloning repo *****"
cd ..

sleep 60

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
cd "$REPO_NAME-clone"
git checkout dev
cur_ver=$(ls -la | wc -l)
if [ "$cur_ver" != "$FILES_CNT" ]; then
  echo "WRONG NUMBER OF FILES"
  exit 1
fi
echo "GOOD NUMBER OF FILES"

echo "TEST SUCCEEDED"

