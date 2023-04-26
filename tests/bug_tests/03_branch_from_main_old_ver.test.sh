#!/bin/bash
set -e
set -o pipefail
set -x

# Test description
#start a repo v2
#upgrade dao to v4
#start a branch from main v2
#push the branch
#last commit of main should be upgraded and pushed with branch main but not the new branch

FIRST_VERSION=v2_x
SECOND_VERSION=v4_x
#./node_se_scripts/deploy.sh $FIRST_VERSION
#. set-vars.sh $FIRST_VERSION
#./upgrade_tests/set_up.sh $FIRST_VERSION $SECOND_VERSION

. ./util.sh

REPO_NAME="repo_bug_03_$(date +%s)"
DAO_NAME="dao_$(date +%s)"

deploy_DAO_and_repo

export LINK="gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "LINK=$LINK"

echo "***** cloning old version repo *****"
git clone "$LINK"

# check
cd "$REPO_NAME"
git config user.email "foo@bar.com"
git config user.name "My name"
git branch -m main

echo "***** Create initial commits in old version *****"
echo init > init.txt
git add init.txt
git commit -m init

git checkout -b dev
echo dev > dev.txt
git add dev.txt
git commit -m dev0
echo dev > init.txt
git add init.txt
git commit -m dev1

git checkout main
git merge dev --no-ff -m merge
git branch --delete dev

git push -u origin main

cd ..

upgrade_DAO

echo "***** upgrade repo *****"
tonos-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI_1 | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "REPO_ADDR=$REPO_ADDR"

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

cd "$REPO_NAME"

git checkout -b dev2

echo dev2 > dev.txt
git add dev.txt
git commit -m dev2

git log --pretty=oneline

git push -u origin dev2

cd ..

echo "***** cloning old version repo *****"
git clone "$LINK" "${REPO_NAME}_clone"

echo "TEST_SUCCEEDED"
