#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

REPO_NAME="repo22_$(date +%s)"

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
git checkout -b master

for n in {1..10}; do
    echo "11111$n$n" > "$n".txt
done

echo $(ls -la | wc -l)

echo "***** Pushing file to the repo *****"
echo 111 > 1.txt
git add *
git commit -m push1

git checkout -b dev

echo 222 > 1.txt
git add *
git commit -m dev1

for i in {1..4}; do
  for n in {1..10}; do
      echo "11111$n$n$i" > "$n$i".txt
  done
  git add *
  git commit -m "dev$i"
done

git checkout master
git merge dev --no-ff -m merge
git branch --delete dev

for i in {1..4}; do
  for n in {1..10}; do
      echo "2222$n$n$i" > "2$n$i".txt
  done
  git add *
  git commit -m "main$i"
done
git remote add gosh gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME
GOSH_TRACE=5 git push --all gosh &> ../trace2.log

echo "***** cloning repo *****"
cd ..

sleep 30

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
DIFF_STATUS=1
if  diff --brief --recursive $REPO_NAME $REPO_NAME"-clone" --exclude ".git"; then
    DIFF_STATUS=0
fi


echo "TEST SUCCEEDED"

