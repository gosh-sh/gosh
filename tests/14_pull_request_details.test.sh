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
DAO_NAME="dao-test14_$RANDOM"
BRANCH_NAME=tester

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME

# deploy new DAO that will be upgraded
deploy_DAO_and_repo

export OLD_LINK="gosh::$NETWORK://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "OLD_LINK=$OLD_LINK"

echo "***** cloning old version repo *****"
git clone $OLD_LINK

# push 1 file
echo "***** Pushing file to old repo *****"
cd $REPO_NAME
echo start > 1.txt
git add 1.txt
git commit -m test
git push

git checkout -b $BRANCH_NAME
echo branch > 1.txt
git add 1.txt
git commit -m test
git push --set-upstream origin $BRANCH_NAME

git request-pull -p main $OLD_LINK $BRANCH_NAME

echo "TEST SUCCEEDED"