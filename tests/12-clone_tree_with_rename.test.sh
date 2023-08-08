#!/bin/bash
set -e
set -o pipefail
. ./util.sh

REPO_NAME="repo12_$(date +%s)"
CLONE_REPO_NAME=repo12_clone

# echo "Test ignored need to find alternative to command tree"
# exit 0

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
git push -u origin main

for i in {1..5}
do
  echo mv "$i" "$i$i"
  git mv "$i" "$i$i"
  cd "$i$i"
done

cd ../../../../../

git add *
git commit -m blabla
git push

INIT_TREE=$(tree)
echo $INIT_TREE

cd ..

sleep 60

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME $CLONE_REPO_NAME

cd $CLONE_REPO_NAME

CLONE_TREE=$(tree)
echo $CLONE_TREE

if [ "$INIT_TREE" != "$CLONE_TREE" ]; then
  echo Fail
  exit 1
fi

echo Success
exit 0