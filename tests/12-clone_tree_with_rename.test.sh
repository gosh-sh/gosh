#!/bin/bash
set -e
set -o pipefail
. ./util.sh

# if [[ "$VERSION" == *"v6_x"* ]]; then
  # echo "Test is ignored for v6 because in v6 we don't delete snapshots"
  # exit 0
# fi

REPO_NAME="repo12_$(date +%s)"
CLONE_REPO_NAME=repo12_clone

[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $CLONE_REPO_NAME ] && rm -rf $CLONE_REPO_NAME

deploy_repo
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR

echo "***** cloning repo *****"
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

cd $REPO_NAME
git config user.email "foo@bar.com"
git config user.name "My name"
git branch -m main

echo 0 > 0.txt
for i in {1..5}
do
   mkdir $i
   cd $i
   echo $i > $i.txt
done

cd ../../../../../

git add *
git commit -m blabla
GOSH_TRACE=5 git push -u origin main &> ../trace_12.log

for i in {1..5}
do
  echo mv "$i" "$i$i"
  git mv "$i" "$i$i"
  cd "$i$i"
done

cd ../../../../../

git add *
git commit -m blabla
GOSH_TRACE=5 git push &> ../trace_12.log

cd ..

sleep 60

GOSH_TRACE=5 git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $CLONE_REPO_NAME &> trace_12_clone.log

echo "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $CLONE_REPO_NAME --exclude ".git"; then
    echo "Success"
    DIFF_STATUS=0
fi

exit $DIFF_STATUS