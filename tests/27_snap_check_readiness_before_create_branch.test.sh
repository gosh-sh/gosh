#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

# Test 27 - checks that git-remote-gosh checks of snapshots status before branch creation.
#           This is a prerequisite for the successful creation of a branch.
# works only for versions greater than 1

if [[ "$VERSION" == *"v1_x"* ]]; then
  echo "Test is ignored for v1"
  exit 0
fi

if [[ "$VERSION" == *"v6_x"* ]]; then
  echo "Test is ignored for v6 because in v6 we don't deploy snapshots for a new branch"
  exit 0
fi

REPO_NAME="repo27_$(date +%s)"

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

max_files=10

for n in $(seq 1 $max_files); do
    echo "$n$n$n" > "$n.txt"
done

git add *.txt
git commit -m "main: Added files"
GOSH_TRACE=5 git push -u origin main 2>&1 | tee trace-push-main.log

delay 10

git checkout -b test
date +%s > now
git add now
git commit -m "test: Added file"
GOSH_TRACE=5 git push -u origin test &> trace-push-test.log

set +o pipefail
cnt=$(grep "Snap ready:" trace-push-test.log | wc -l)

if (( $cnt < $max_files )); then
    echo "TEST FAILED"
    exit 1
fi

echo "TEST SUCCEEDED"
