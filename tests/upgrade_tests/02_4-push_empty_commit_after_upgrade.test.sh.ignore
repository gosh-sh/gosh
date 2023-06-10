#!/bin/bash
set -e
set -o pipefail
set -x

. ./util.sh

NOW=$(date +%s)
DAO_NAME="dao-${NOW}"
REPO_NAME="upgrade_repo09-${NOW}"

deploy_DAO_and_repo
# REPO_ADDR=$(get_repo_addr)

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

#check
cd $REPO_NAME

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

git branch -m main

CHANGE=$(date +%s)
echo $CHANGE > now
git add now
git commit -m "main: created file"
git push -u origin main

git commit --allow-empty -m "empty commit before upgrade"
git push

cd ..

echo "Upgrade DAO"
upgrade_DAO
SYSTEM_CONTRACT_ADDR=$SYSTEM_CONTRACT_ADDR_1
delay 10

# upgrade repo
params=$(jq << JSON
{
    "nameRepo": "$REPO_NAME",
    "descr": "",
    "previous": {"addr": "$REPO_ADDR", "version": "$CUR_VERSION"}
}
JSON
)
tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "$params" || exit 1

REPO_ADDR_PREV=$REPO_ADDR
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI_1 | jq -r .value0)
echo "upgraded REPO_ADDR=$REPO_ADDR"

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

# transfer tokens from the old DAO to the new one
EXPECTED_WALLET_TOKEN_BALANCE=0
WALLET_TOKEN_BALANCE=$(get_wallet_token_balance)

if (( $WALLET_TOKEN_BALANCE != $EXPECTED_WALLET_TOKEN_BALANCE )); then
    echo "TEST FAILED: incorrect amount of tokens in the new wallet"
fi

tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS sendTokenToNewVersionAuto {}
delay 10
tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS sendTokenToNewVersionAuto {}
delay 5

EXPECTED_WALLET_TOKEN_BALANCE=20
WALLET_TOKEN_BALANCE=$(get_wallet_token_balance)

if (( $WALLET_TOKEN_BALANCE != $EXPECTED_WALLET_TOKEN_BALANCE )); then
    echo "TEST FAILED: incorrect amount of tokens in the new wallet after auto-transfer"
fi

tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS lockVoting "{\"amount\": 0}"
###

get_wallet_details

cd $REPO_NAME

git checkout main
git pull # origin main

date +%s > now
git add now
git commit -m "main: updated file in new version"
GOSH_TRACE=5 git push &> trace-push.log
delay 10

git log --oneline
list_branches

git commit --allow-empty -m "empty commit after upgrade"
git push

echo "TEST SUCCEEDED"
