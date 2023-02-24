#!/bin/bash

# 1. create repo
# 2. clone repo into repo8-clone1
# 3. new file in repo8-clone1
# 4. push changes
# 5. clone repo in repo8-clone2
# 6. rewrite file in repo8-clone1
# 7. push changes
# 8. new file in repo8-clone2
# 9. push changes
# 10. clone repo in repo8-clone3
# 11. comparing repositories repo8-clone1 and repo8-clone3 (similar)

set -e
. ./util.sh

#1
REPO_NAME=repo8

[ -d $REPO_NAME"-clone1" ] && rm -rf $REPO_NAME"-clone1"
[ -d $REPO_NAME"-clone2" ] && rm -rf $REPO_NAME"-clone2"
[ -d $REPO_NAME"-clone3" ] && rm -rf $REPO_NAME"-clone3"

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":null}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

# 2
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

# 3
FILE1=a.txt
echo "Hello a! its $CHANGE now" > $FILE1

# 4
git add .
git commit -m "added-$FILE1-now-$CHANGE"

echo "***** awaiting push $FILE1 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

cd ..

# 5
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone2"

cd $REPO_NAME"-clone1"

# 6
echo "Hello again A! its $CHANGE now" > $FILE1

# 7
git add .
git commit -m "rewrite-$FILE1-now-$CHANGE"

echo "***** awaiting push $FILE1 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

# 8
cd ../$REPO_NAME"-clone2"

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

FILE2=b.txt
echo "Hello b! its $CHANGE now" > $FILE2

# 9
git add .
git commit -m "added-$FILE2-now-$CHANGE"

echo "***** push $FILE2 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME 2>&1 | grep 'fetch first'

cd ..

# 10
echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone3"

# 11
echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME"-clone1" $REPO_NAME"-clone3" --exclude ".git"; then
    DIFF_STATUS=0
fi

exit $DIFF_STATUS
