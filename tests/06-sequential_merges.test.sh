#!/bin/bash
# TODO this test passes locally but in ci cd takes too much time
#exit 0

# 1 create repo
# 2 create branch dev from main
# 3 new file
# 4 push changes
# 5 clone repo

# 6 Create branch dev2 from dev 
# 7 Update file in dev2
# 8 push changes
# 9 fetch changes

# 10 merge dev2 into dev
# 11 push changes
# 12 fetch changes

# 13 merge dev into main
# 14 push changes
# 15 fetch changes

set -e
set -o pipefail
. ./util.sh
set -x
REPO_NAME=repo6

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":null}" || exit 1
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

# create branch
BRANCH_NAME=dev

git checkout -b $BRANCH_NAME

# create new file
CHANGE=$(date +%s)
echo "foo" > foo-$CHANGE.txt

# create commit and push
git add .
git commit -m "foo-$CHANGE"

echo "***** awaiting push in dev *****"
git push -u origin $BRANCH_NAME
delay 60

# echo "***** awaiting set commit in dev *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi

cd $REPO_NAME
# create branch #2
git checkout -b $BRANCH_NAME"2"

# update file
echo "fooFOO" > foo-$CHANGE.txt

# create commit and push
git add .
git commit -m "foo-$CHANGE v2"

echo "***** awaiting push in dev2 *****"
git push -u origin $BRANCH_NAME"2"
delay 60

# echo "***** awaiting set commit in dev2 *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME"2"

cd ../$REPO_NAME"-clone"
git pull

git checkout $BRANCH_NAME"2"

cd ..

# check
echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi

cd $REPO_NAME

git checkout $BRANCH_NAME
git merge $BRANCH_NAME"2"

echo "***** awaiting push in dev *****"
git push
delay 60

# echo "***** awaiting set commit in dev *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

cd ../$REPO_NAME"-clone"
git pull

git checkout $BRANCH_NAME
cd ..

# check
echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi

cd $REPO_NAME
git checkout -b main
git merge $BRANCH_NAME
echo "***** awaiting push in main *****"
git push -u origin main
delay 60

# echo "***** awaiting set commit in main *****"
# wait_set_commit $REPO_ADDR main

cd ../$REPO_NAME"-clone"
git pull

git checkout main

cd ..

# check
echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi
exit $DIFF_STATUS