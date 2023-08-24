#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

if [[ "$VERSION" == *"v6_x"* ]]; then
  echo "Test is ignored for v6 because in v6 we don't delete snapshots"
  exit 0
fi

# Create repo
# Create branch 'test'
# Squash 'test' into 'main' using "their"-strategy
# Create branch 'dev' from 'test'
# Delete branch 'test' from remote
# Delete snapshots belonging to the 'test'
# Squash 'dev' into 'main' using "their"-strategy
# Despite the removal of snapshots (branch 'test'), the cloning of the repository should pass

NOW=$(date +%s)
REPO_NAME="repo23_1_$NOW"
BRANCH_1=test
BRANCH_2=dev
FILE=ctime

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d "${REPO_NAME}-clone" ] && rm -rf "${REPO_NAME}-clone"

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

echo "main[1]: $(date +%s)" > last
git add last
git commit -m "main[1]: created 'last'"

git push -u origin main

git checkout -b $BRANCH_1

echo "${BRANCH_1}[1]: $(date +%s)" > $FILE
git add $FILE
git commit -m "$BRANCH_1[1]: added '$FILE'"

delay 5

echo "${BRANCH_1}[2]: $(date +%s)" > $FILE
git add $FILE
git commit -m "$BRANCH_1[2]: updated '$FILE'"

git push -u origin $BRANCH_1

git checkout main
git merge --squash -Xtheirs $BRANCH_1
git commit -m "main[2]: Squash $BRANCH_1 to main"
git push

git checkout -b $BRANCH_2 $BRANCH_1

git push origin :$BRANCH_1
delete_snapshot $REPO_ADDR $BRANCH_1 $FILE

echo "${BRANCH_2}[1]: $(date +%s)" > $FILE
git add $FILE
git commit -m "$BRANCH_2[1]: updated '$FILE'"

git push -u origin $BRANCH_2

git checkout main
git merge --squash -Xtheirs $BRANCH_2
git commit -m "main[3]: Squash $BRANCH_2 to main"
git push

cd ..

sleep 30
GOSH_TRACE=5 \
    git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME "${REPO_NAME}-clone" &> "clone-${REPO_NAME}.log"
mv "clone-${REPO_NAME}.log" $REPO_NAME

diff --brief --recursive $REPO_NAME "${REPO_NAME}-clone" --exclude ".git" --exclude "*.log"

cd $REPO_NAME
git checkout $BRANCH_2

cd ../"${REPO_NAME}-clone"
git checkout $BRANCH_2

cd ..
diff --brief --recursive $REPO_NAME "${REPO_NAME}-clone" --exclude ".git" --exclude "*.log"

echo "TEST SUCCEEDED"
