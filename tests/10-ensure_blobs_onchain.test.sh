#!/bin/bash

# 1. create repo
# 2. clone repo into repo10-clone1
# 3. add new file in repo10-clone1
# 4. push changes and ensure that blob goes onchain
# 5. update file (1) in repo10-clone1 
# 6. push changes and ensure that blob goes onchain
# 7. update file (2) in repo10-clone1
# 8. push changes and ensure that blob goes onchain
# 9. clone repo in repo10-clone2
# 10. comparing repositories repo10-clone1 and repo10-clone2 (similar)


set -e
set -o pipefail
. ./util.sh

REPO_NAME=repo10

[ -d $REPO_NAME"-clone1" ] && rm -rf $REPO_NAME"-clone1"
[ -d $REPO_NAME"-clone2" ] && rm -rf $REPO_NAME"-clone2"

#1-2
tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":null}" || exit 1
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
git push -u origin $BRANCH_NAME 2>&1 | grep "inner_push_diff->save_data_to_ipfs" && exit 127

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

# 5-6
echo "Hello again A! it changed #1 time $CHANGE now" > $FILE1

git add $FILE1
git commit -m "push (1)-$CHANGE"

echo "***** awaiting push (1) $FILE1 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME 2>&1 | grep "inner_push_diff->save_data_to_ipfs" && exit 127

# echo "***** awaiting set commit (1) into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

# 7-8
echo "Hello again Aa! it changed #2 time $CHANGE now" > $FILE1

git add $FILE1
git commit -m "push (2)-$CHANGE"

echo "***** awaiting push (2) $FILE1 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME 2>&1 | grep "inner_push_diff->save_data_to_ipfs" && exit 127

# echo "***** awaiting set commit (2) into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

cd ..

# 9
echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone2"

# 10
echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME"-clone1" $REPO_NAME"-clone2" --exclude ".git"; then
    DIFF_STATUS=0
fi

exit $DIFF_STATUS

