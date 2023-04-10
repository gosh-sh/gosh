#!/bin/bash

# 1. create repo
# 2. clone repo into repo9-clone1
# 3. add new file in repo9-clone1
# 4. push changes
# 5. update file (1) in repo9-clone1 
# 6. push changes
# 7. update file (2) in repo9-clone1
# 8. push changes
# 9. update file (3) in repo9-clone1 (with data size 160Kb)
# 10. push changes
# 11. clone repo in repo9-clone2
# 12. comparing repositories repo9-clone1 and repo9-clone2 (similar)

set -e
set -o pipefail
. ./util.sh

REPO_NAME="repo9_$(date +%s)"

[ -d $REPO_NAME"-clone1" ] && rm -rf $REPO_NAME"-clone1"
[ -d $REPO_NAME"-clone2" ] && rm -rf $REPO_NAME"-clone2"

#1-2
deploy_repo
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone1"

cd $REPO_NAME"-clone1"

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

CHANGE=$(date +%s)
BRANCH_NAME=branch-$CHANGE

# create branch
git checkout -b $BRANCH_NAME

# 3-4
FILE1=a.txt
echo "Hello a! its $CHANGE now" > $FILE1

git add $FILE1
git commit -m "added-$FILE1-now-$CHANGE"

echo "***** awaiting push $FILE1 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

# 5-6
echo "Hello again A! it changed #1 time $CHANGE now" > $FILE1

git add $FILE1
git commit -m "push (1)-$CHANGE"

echo "***** awaiting push (1) $FILE1 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit (1) into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

# 7-8
echo "Hello again Aa! it changed #2 time $CHANGE now" > $FILE1

git add $FILE1
git commit -m "push (2)-$CHANGE"

echo "***** awaiting push (2) $FILE1 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit (2) into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

# 9-10
dd if=/dev/urandom of=$FILE1 bs=16K count=10

git add $FILE1
git commit -m "push (3)-$CHANGE"

echo "***** awaiting push (3) $FILE1 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit (3) into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

cd ..

sleep 10


# 11
echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone2"

# 12
echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME"-clone1" $REPO_NAME"-clone2" --exclude ".git"; then
    DIFF_STATUS=0
fi

exit $DIFF_STATUS

