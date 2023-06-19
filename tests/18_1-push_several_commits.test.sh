#!/bin/bash
set -e
set -o pipefail
. ./util.sh
set -x

REPO_NAME="repo18_$(date +%s)"

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
echo "***** Pushing file to the repo *****"
echo main > 1.txt
git add 1.txt
git commit -m test

git checkout -b dev
echo main > 2.txt
git add 2.txt
git commit -m test2

git checkout main
git merge dev --no-ff -m "merge commit"

echo commit > 1.txt
git add 1.txt
git commit -m test3

echo blabla > 3.txt
git add 3.txt
git commit -m test4

for n in {1..50}; do
    echo "$n$n$n" > "ee$n.txt"
done
git add *
git commit -m test5

for n in {1..50}; do
#  for m in {1..10}; do
      echo "bla$n$n$n" > "aa$n.txt"
#  done
  git add *
  git commit -m "test_$n"
done

out="../test_18_$(date +%s).log"
{ time GOSH_TRACE=5 git push -u origin main &> $out ; } 2>> ../time.txt
grep Memory $out | tail -1 >> ../time.txt

sleep 10

echo "***** cloning repo *****"
cd ..
git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $REPO_NAME"-clone"

echo "***** check repo *****"
cd "$REPO_NAME-clone"

cur_ver=$(cat 3.txt)
if [ "$cur_ver" != "blabla" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

cur_ver=$(cat aa50.txt)
if [ "$cur_ver" != "bla505050" ]; then
  echo "WRONG CONTENT"
  exit 1
fi
echo "GOOD CONTENT"

echo "TEST SUCCEEDED"
