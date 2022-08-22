#!/bin/bash
set -e
set -x
# create repo

REPO_NAME=repo2
WALLET_ABI=../contracts/gosh/goshwallet.abi.json

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository "{\"nameRepo\":\"$REPO_NAME\"}" || exit 1
REPO_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

sleep 10
# clone repo
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME

#check
cd $REPO_NAME
REPO_STATUS=1
if git status | grep 'No commits yet'; then
    REPO_STATUS=0
fi

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

# create branch
CHANGE=$(date +%s)
BRANCH_NAME=branch-$CHANGE

git checkout -b $BRANCH_NAME

# create new file
echo "foo" > foo-$CHANGE.txt

# create commit and push
git add .
git commit -m "foo-$CHANGE"
git push --set-upstream origin $BRANCH_NAME

sleep 50

cd ..
git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME $REPO_NAME"-clone"


# echo "  Gosh root:" $GOSH_ROOT_ADDR
# echo "DAO creator:" $DAO_CREATOR_ADDR
# echo ===================== DAO =====================
# echo "   DAO name:" $DAO1_NAME
# echo "DAO address:" $DAO1_ADDR
# echo "   DAO keys:" $(cat $DAO1_KEYS)
# echo ==================== WALLET ===================
# echo "WALLET address:" $WALLET_ADDR
# echo "   WALLET keys:" $(cat $WALLET_KEYS)
# echo ================== REPOSITORY ===================
# echo "     REPO_NAME:" $REPO_NAME
# echo "     REPO_ADDR:" $REPO_ADDR

# exit $REPO_STATUS
