#!/bin/bash
set -e
set -o pipefail
. ./util.sh

REPO_NAME="repo31_$(date +%s)"
REAL_REPO=https://github.com/DeSciWorld/awesome-desci.git

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

deploy_repo
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

echo "***** cloning repo *****"
git clone $REAL_REPO $REPO_NAME

#check
cd $REPO_NAME

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

git remote add gosh gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME
git remote -v

timeout 2s GOSH_TRACE=5 git push --all gosh &> ../trace_31.log

echo "***** cloning repo *****"
cd ..

sleep 10

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    echo "Success"
    DIFF_STATUS=0
fi

exit $DIFF_STATUS
