#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

# Test 28 - ensure that content from ipfs loaded once per blob.

if [[ "$VERSION" == *"v1_x"* ]]; then
  echo "Test is ignored for v1"
  exit 0
fi

REPO_NAME="repo28_$(date +%s)"

[ -d $REPO_NAME ] && rm -rf $REPO_NAME

deploy_repo
REPO_ADDR=$(get_repo_addr)

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
file_name=big_file.dat

for n in $(seq 1 $max_files); do
    dd if=/dev/urandom of=$file_name bs=16K count=10
    git add $file_name
    git commit -m "main: update '$file_name' ($n)"
    git push -u origin main
    delay 10
done

cd ..

GOSH_TRACE=5 git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME "${REPO_NAME}-clone" &> trace-clone.log

set +o pipefail
cnt=$(grep "load_data_from_ipfs: ipfs_address=" trace-clone.log | wc -l)

if (( $cnt == $max_files )); then
    echo "TEST FAILED"
    exit 1
fi

echo "TEST SUCCEEDED"
