#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

# Test 26 checks that git-remote-gosh can work with the error it tree objects order.
# Objects with names like "foo" and "foo.bar" can be sorted differently in git and git libs.
# 1. Create a repo with files "file.toml" and dir "file" with some files.
# 2. Push it to the remote
# 3. Clone the repo and compare it with the original one

REPO_NAME="repo26_$(date +%s)"

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

echo file1 > file.toml
echo file4 > file0
mkdir file
echo blabla > file/1.txt
echo blablabla > file/2.txt
echo bla > bin
echo foo > bin.d
git add *
git commit -m main
git push -u origin main

cd ..
sleep 30

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"

echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
    echo "TEST SUCCEEDED"
fi

exit $DIFF_STATUS
