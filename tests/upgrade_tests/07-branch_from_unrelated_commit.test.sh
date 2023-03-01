#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

if [ "$1" = "ignore" ]; then
  echo "Test $0 ignored"
  exit 0
fi

REPO_NAME=upgrade_repo07
DAO_NAME="dao-upgrade-test07_$(date +%s)"
NEW_REPO_PATH=upgrade_repo07_v2

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $NEW_REPO_PATH ] && rm -rf $NEW_REPO_PATH

# deploy new DAO that will be upgraded
deploy_DAO_and_repo

export REPO_LINK="gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "REPO_LINK=$REPO_LINK"

echo "***** cloning old version repo *****"
git clone $REPO_LINK

cd $REPO_NAME
echo "***** Pushing file to the repo *****"
echo cur_ver > 1.txt
git add 1.txt
git commit -m test
git push

cd ..

echo "Upgrade DAO"
upgrade_DAO

echo "***** new repo07 deploy *****"
gosh-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
MIDDLE_REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $MIDDLE_REPO_ADDR
sleep 3

cd $REPO_NAME
echo "**** Fetch repo *****"
git fetch
echo middle_ver > 1.txt
git add 1.txt
git commit -m test2
git push
PARENT_COMMIT_ID=$(git rev-parse --short HEAD)

cd ..

echo "Upgrade DAO 2"
upgrade_DAO_2

echo "***** new repo07 deploy *****"
gosh-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$CUR_VERSION\"}}" || exit 1
REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR_2 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

export NEW_LINK="gosh://$SYSTEM_CONTRACT_ADDR_2/$DAO_NAME/$REPO_NAME"
echo "NEW_LINK=$NEW_LINK"

echo "***** cloning repo with new link *****"
git clone $NEW_LINK $NEW_REPO_PATH

echo "***** push to new version *****"
cd $NEW_REPO_PATH

cur_ver=$(cat 1.txt)
if [ "$cur_ver" != "cur_ver" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

echo new_ver > 1.txt
git add 1.txt
git commit -m test2
git push

if git checkout -b parent_branch $PARENT_COMMIT_ID; then
  echo "Branch created from wrong commit id"
  exit 1
fi

cd ..

echo "TEST SUCCEEDED"
