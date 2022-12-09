#!/bin/bash

set -e
set -o pipefail

cd "$(dirname "$0")"

export SYSTEM_CONTRACT_ADDR=$1
export DAO_NAME=$2
export REPO_NAME=$3

if [[ "$3" == "" ]]; then
    echo "Usage: $0 gosh_system_contract_addr gosh_dao_name gosh_repo_name"
    exit 1
fi

. prepare.sh
. util.sh

DAO_ADDR=$(tonos-cli -u "$NETWORK" -j run "$SYSTEM_CONTRACT_ADDR" getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi "$SYSTEM_CONTRACT_ABI" | jq -r '.value0')
WALLET_ADDR=$(tonos-cli -u "$NETWORK" -j run "$DAO_ADDR" getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi "$DAO_ABI" | jq -r '.value0')
REPO_ADDR=$(tonos-cli -u "$NETWORK" -j run "$DAO_ADDR" getAddrRepository "{\"name\":\"$REPO_NAME\"}" --abi "$DAO_ABI" | jq -r '.value0')
export DAO_ADDR
export WALLET_ADDR
export REPO_ADDR

status=`tonos-cli -j -u "$NETWORK" account "$REPO_ADDR" | jq -r '."'"$REPO_ADDR"'".acc_type'`

if [ "$status" != "Active" ]; then
    tonos-cli -u "$NETWORK" call --abi "$WALLET_ABI" --sign "$WALLET_KEYS" "$WALLET_ADDR" deployRepository "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1

    echo "***** awaiting repo deploy ($REPO_ADDR) *****"
    wait_account_active "$REPO_ADDR"
    sleep 1
else
    echo "***** repo already deployed ($REPO_ADDR) *****"
fi

COMMIT_ADDR=$(tonos-cli -u "$NETWORK" -j run "$REPO_ADDR" getAddrBranch "{\"name\":\"main\"}" --abi "$REPO_ABI" | jq -r '.value0.commitaddr')

echo "***** awaiting commit ($COMMIT_ADDR) *****"
wait_account_active "$COMMIT_ADDR"
sleep 1

BRANCH_NAME=$(tonos-cli -u "$NETWORK" -j run "$COMMIT_ADDR" getNameBranch "{}" --abi "$COMMIT_ABI" | jq -r '.value0')

if [[ "$BRANCH_NAME" != "main" ]]; then
    exit 1
fi
