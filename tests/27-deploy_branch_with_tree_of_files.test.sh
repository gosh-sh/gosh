#!/bin/bash
set -e
set -o pipefail
. ./util.sh

REPO_NAME="repo27_$(date +%s)"
CLONE_REPO_NAME="$REPO_NAME"_clone

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $CLONE_REPO_NAME ] && rm -rf $CLONE_REPO_NAME

deploy_repo
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

cd $REPO_NAME
git config user.email "foo@bar.com"
git config user.name "My name"
git checkout -b dev

echo 0 > 0.txt
git add *
git commit -m dev1
git push -u origin dev

mkdir dir1
cd dir1
echo 1 > 1.txt
cd ..

git add *
git commit -m dev2
git push

cd dir1
mkdir dir2
cd dir2
echo 2 > 2.txt
cd ../..
git add *
git commit -m dev3
git push

git checkout -b test

echo test > branch.txt
git add *
git commit -m test
git push -u origin test

cd ..

sleep 60

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $CLONE_REPO_NAME

cd $CLONE_REPO_NAME
git checkout test
cd ..

echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $CLONE_REPO_NAME --exclude ".git"; then
    DIFF_STATUS=0
    echo "TEST SUCCEEDED"
fi

exit $DIFF_STATUS