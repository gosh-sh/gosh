#!/bin/bash

set -e
set -o pipefail
. ./util.sh

REPO_NAME=repo5

[ -d $REPO_NAME ] && rm -rf $REPO_NAME 
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

cd $REPO_NAME

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

CHANGE=$(date +%s)
BRANCH_NAME=branch-$CHANGE

# create branch
git checkout -b $BRANCH_NAME

# copy file #1
FILE1=eversdk.node
cp ../artifacts/$FILE1 .

# create commit and push
git add .
git commit -m "added $FILE1-$CHANGE"

echo "***** awaiting push $FILE1 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 20

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #2
FILE2=favicon.ico
cp ../artifacts/$FILE2 .

# create commit and push
git add .
git commit -m "added $FILE2-$CHANGE"

echo "***** awaiting push $FILE2 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 30

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #3
FILE3=gosh.tvc
cp ../artifacts/$FILE3 .

# create commit and push
git add .
git commit -m "added $FILE3-$CHANGE"

echo "***** awaiting push $FILE3 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 40

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #4
FILE4=grg.shar
cp ../artifacts/$FILE4 .

# create commit and push
git add .
git commit -m "added $FILE4-$CHANGE"

echo "***** awaiting push $FILE4 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 50

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #5
FILE5=LICENSE
cp ../artifacts/$FILE5 .

# create commit and push
git add .
git commit -m "added $FILE5-$CHANGE"

echo "***** awaiting push $FILE5 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 60

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #6
FILE6=mixed-512.file
cp ../artifacts/$FILE6 .

# create commit and push
git add .
git commit -m "added $FILE6-$CHANGE"

echo "***** awaiting push $FILE6 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 70

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #7
FILE7=mixed-1024.file
cp ../artifacts/$FILE7 .

# create commit and push
git add .
git commit -m "added $FILE7-$CHANGE"

echo "***** awaiting push $FILE7 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 80

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #8
FILE8=mixed-1025.file
cp ../artifacts/$FILE8 .

# create commit and push
git add .
git commit -m "added $FILE8-$CHANGE"

echo "***** awaiting push $FILE8 into $BRANCH_NAME *****"
git push -u origin $BRANCH_NAME

# echo "***** awaiting set commit into $BRANCH_NAME *****"
# wait_set_commit $REPO_ADDR $BRANCH_NAME

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** comparing repositories *****"
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 90

# rm -rf $REPO_NAME"-clone"
