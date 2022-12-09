#!/bin/bash
# start after deploy.sh
set -e
set -o pipefail

NETWORK=vps23.ton.dev
TONOS_CLI=tonos-cli
CONTRACTS_PATH=../contracts/gosh
WELCOME_TOKENS=100

SYSTEM_CONTRACT_ADDR=0:fe2f42eb7841be52d3c091e2548d1b435b95932099d202bd4deb732b68c66257
SYSTEM_CONTRACT_ABI=$CONTRACTS_PATH/systemcontract.abi.json

INITIAL_SEED=$(cat $1) # <gosh-bot-seed>
DAO_NAME=$2            # <dao-name>
USER_PROFILE=$3        # <gosh-user-id>
# USER_PUBLIC_KEY=$4     # <gosh-user-pub-key>

DAO_ABI=$CONTRACTS_PATH/goshdao.abi.json
DAO_ADDR=$($TONOS_CLI -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | jq -r .value0)

INITIAL_WALLET_ADDR=$($TONOS_CLI -j -u $NETWORK run $DAO_ADDR getWallets {} --abi $DAO_ABI | jq -r ".value0 | first")

$TONOS_CLI -j -u $NETWORK call $INITIAL_WALLET_ADDR \
    AloneSetConfigDao "{\"newtoken\": $WELCOME_TOKENS}" \
    --abi $CONTRACTS_PATH/goshwallet.abi.json --sign "$INITIAL_SEED" > /dev/null || exit 20

sleep 5

RCVD_WELCOME_TOKENS=$(
    $TONOS_CLI -j -u $NETWORK run $DAO_ADDR \
        getConfig {} \
        --abi $CONTRACTS_PATH/goshdao.abi.json \
        | jq -r .value1
)

if [ "$RCVD_WELCOME_TOKENS" != "$WELCOME_TOKENS" ]; then
    echo "Updating config failed"
    exit 10
fi

echo "The DAO \`$DAO_NAME\` config has been updated"

USER_PROFILE_ADDR=$(
    $TONOS_CLI -j -u $NETWORK run $SYSTEM_CONTRACT_ADDR \
        getProfileAddr "{\"name\":\"$USER_PROFILE\"}" \
        --abi ../contracts/gosh/systemcontract.abi.json \
        | jq -r .value0
)

$TONOS_CLI -j -u $NETWORK call $INITIAL_WALLET_ADDR \
    AloneDeployWalletDao "{\"pubaddr\": [\"$USER_PROFILE_ADDR\"]}" \
    --abi $CONTRACTS_PATH/goshwallet.abi.json --sign "$INITIAL_SEED" > /dev/null || exit 21

sleep 5

USER_WALLET=$($TONOS_CLI -j -u $NETWORK run $DAO_ADDR getWallets {} --abi $DAO_ABI | jq -r ".value0 | last")

if [ "$USER_WALLET" = "$INITIAL_WALLET_ADDR" ]; then
    echo "Adding user failed"
    exit 11
fi

echo "User \`$USER_PROFILE\` has been added into the DAO"

USER_WALLET_STATUS=$($TONOS_CLI -j -u $NETWORK account $USER_WALLET | jq -r '."'"$USER_WALLET"'".acc_type')

if [ "$USER_WALLET_STATUS" != "Active" ]; then
    echo "The user wallet contract hasn't been deployed"
    exit 12
fi

echo "The user wallet \`$USER_WALLET\` contract is active"
