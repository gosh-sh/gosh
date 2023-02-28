#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

if [ "$1" = "ignore" ]; then
  echo "Test $0 ignored"
  exit 0
fi

REPO_NAME=repo14
BRANCH_NAME=tester

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":null}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
 
echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

export OLD_LINK="gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "OLD_LINK=$OLD_LINK"

echo "***** cloning old version repo *****"
git clone $OLD_LINK

# push 1 file
echo "***** Pushing file to old repo *****"
cd $REPO_NAME
git config user.email "foo@bar.com"
git config user.name "My name"
git branch -m main

echo start > 1.txt
git add 1.txt
git commit -m test
git push -u origin main

git checkout -b $BRANCH_NAME
echo branch > 1.txt
git add 1.txt
git commit -m test
git push --set-upstream origin $BRANCH_NAME

git request-pull -p main $OLD_LINK $BRANCH_NAME

echo "TEST SUCCEEDED"