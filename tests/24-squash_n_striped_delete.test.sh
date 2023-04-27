#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

NOW=$(date +%s)
REPO_NAME="repo24_$NOW"
BRANCH_1=branch1
BRANCH_2=branch2
BRANCH_3=branch3
BRANCH_4=branch4
BRANCH_5=branch5
BRANCH_6=branch6
FILE=last

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

echo "main[1]: $(date +%s)" > $FILE
git add $FILE
git commit -m "created '$FILE'"

git push -u origin main

git checkout -b $BRANCH_1

echo "${BRANCH_1}[1]: $(date +%s)" > $FILE
git add $FILE
git commit -m "$BRANCH_1: added '$FILE'"

sleep 5

echo "${BRANCH_1}[2]: $(date +%s)" > $FILE
git add $FILE
git commit -m "$BRANCH_1: updated '$FILE'"

git push -u origin $BRANCH_1

git checkout -b $BRANCH_2
git checkout main
git merge --squash -Xtheirs $BRANCH_1
git commit -m "Squash $BRANCH_1 to main"
git push

git push origin :$BRANCH_1

git checkout $BRANCH_2

echo "${BRANCH_2}[1]: $(date +%s)" > $FILE
git add $FILE
git commit -m "$BRANCH_2: updated '$FILE'"

git push -u origin $BRANCH_2

git checkout main
git merge --squash -Xtheirs $BRANCH_2
git commit -m "Squash $BRANCH_2 to main"
git push

cd ..

GOSH_TRACE=5 \
    git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME "${REPO_NAME}-clone" &> "clone-${REPO_NAME}.log"

diff --brief --recursive $REPO_NAME "${REPO_NAME}-clone" --exclude ".git"

cd $REPO_NAME
git checkout $BRANCH_2

cd ../"${REPO_NAME}-clone"
git checkout $BRANCH_2

cd ..
diff --brief --recursive $REPO_NAME "${REPO_NAME}-clone" --exclude ".git"

echo "TEST SUCCEEDED"
