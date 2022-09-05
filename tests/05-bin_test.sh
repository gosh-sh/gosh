#!/bin/bash
set -e 
set -o pipefail

# create repo
REPO_NAME=repo5

[ -d $REPO_NAME ] && rm -rf $REPO_NAME 
[ -d $REPO_NAME"-clone" ] && rm -rf $REPO_NAME"-clone"

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository "{\"nameRepo\":\"$REPO_NAME\"}" || exit 10
REPO_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

sleep 120

# clone repo
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME

cd $REPO_NAME

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

CHANGE=$(date +%s)
BRANCH_NAME=branch-$CHANGE

# create branch
git checkout -b $BRANCH_NAME

# copy file #1
cp ../artifacts/eversdk.node .

# create commit and push
git add .
git commit -m "added eversdk.node-$CHANGE"
git push -u origin $BRANCH_NAME

sleep 120

cd ..
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 20

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #2
cp ../artifacts/favicon.ico .

# create commit and push
git add .
git commit -m "added favicon.ico-$CHANGE"
git push -u origin $BRANCH_NAME

sleep 120

cd ..
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 30

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #3
cp ../artifacts/gosh.tvc .

# create commit and push
git add .
git commit -m "added gosh.tvc-$CHANGE"
git push -u origin $BRANCH_NAME

sleep 120

cd ..
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 40

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #4
cp ../artifacts/grg.shar .

# create commit and push
git add .
git commit -m "added grg.shar-$CHANGE"
git push -u origin $BRANCH_NAME

sleep 120

cd ..
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 50

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #5
cp ../artifacts/LICENSE .

# create commit and push
git add .
git commit -m "added LICENSE-$CHANGE"
git push -u origin $BRANCH_NAME

sleep 120

cd ..
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 60

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #6
cp ../artifacts/mixed-512.file .

# create commit and push
git add .
git commit -m "added mixed-512.file-$CHANGE"
git push -u origin $BRANCH_NAME

sleep 120

cd ..
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 70

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #7
cp ../artifacts/mixed-1024.file .

# create commit and push
git add .
git commit -m "added mixed-1024.file-$CHANGE"
git push -u origin $BRANCH_NAME

sleep 120

cd ..
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 80

rm -rf $REPO_NAME"-clone"

cd $REPO_NAME

# copy file #8
cp ../artifacts/mixed-1025.file .

# create commit and push
git add .
git commit -m "added mixed-1025.file-$CHANGE"
git push -u origin $BRANCH_NAME

sleep 120

cd ..
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"

# check
diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git" || exit 90

# rm -rf $REPO_NAME"-clone"
