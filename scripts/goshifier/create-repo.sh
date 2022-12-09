#!/bin/bash

set -e 
set -o pipefail

export SYSTEM_CONTRACT_ADDR=$1
export DAO_NAME=$2
export REPO_NAME=$3

if [[ "$3" == "" ]]; then
    echo "Usage: $0 gosh_system_contract_addr gosh_dao_name gosh_repo_name"
    exit 1
fi

. prepare.sh
. util.sh

tonos-cli -u "$NETWORK" call --abi "$WALLET_ABI" --sign "$WALLET_KEYS" "$WALLET_ADDR" deployRepository "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1

REPO_ADDR=$(tonos-cli -u "$NETWORK" -j run "$DAO_ADDR" getAddrRepository "{\"name\":\"$REPO_NAME\"}" --abi "$DAO_ABI" | jq -r '.value0')

echo "***** awaiting repo deploy ($REPO_ADDR) *****"
wait_account_active "$REPO_ADDR"
sleep 1

COMMIT_ADDR=$(tonos-cli -u "$NETWORK" -j run "$REPO_ADDR" getAddrBranch "{\"name\":\"main\"}" --abi "$REPO_ABI" | jq -r '.value0.commitaddr')

echo "***** awaiting commit ($COMMIT_ADDR) *****"
wait_account_active "$COMMIT_ADDR"
sleep 1

BRANCH_NAME=$(tonos-cli -u "$NETWORK" -j run "$COMMIT_ADDR" getNameBranch "{}" --abi "$COMMIT_ABI" | jq -r '.value0')

if [[ "$BRANCH_NAME" != "main" ]]; then
    exit 1
fi
