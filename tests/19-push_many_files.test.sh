#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

REPO_NAME="repo19_$(date +%s)"

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

echo "***** Generating files *****"
for n in {1..300}; do
    dd if=/dev/urandom of=file$( printf %03d "$n" ).bin bs=1 count=$(( RANDOM % 8192 ))
done

echo $(ls -la | wc -l)

echo "***** Pushing file to the repo *****"
git add *
git commit -m push
git push -u origin main

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
cd "$REPO_NAME-clone"

cur_ver=$(ls -la | wc -l)
if [ "$cur_ver" != "304" ]; then
  echo "WRONG NUMBER OF FILES"
  exit 1
fi
echo "GOOD NUMBER OF FILES"

echo "TEST SUCCEEDED"

