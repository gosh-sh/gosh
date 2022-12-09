#!/bin/bash

set -e
set -o pipefail

cd "$(dirname "$0")"

if [[ "$CONFIG_JSON_PATH" == "" ]]; then
    CONFIG_JSON_PATH='config.json'
fi

if [[ ! -f "$CONFIG_JSON_PATH" ]]; then
    echo "$CONFIG_JSON_PATH does not exist, copy with your own one"
    exit 1
fi

mkdir -p ~/.gosh
cp "$CONFIG_JSON_PATH" ~/.gosh/config.json

KEYS=keys.json
DAO_KEYS=$KEYS
WALLET_KEYS=$KEYS

CONF_NET=$(jq -r '."primary-network"' "$CONFIG_JSON_PATH")

if [[ "$NETWORK" == "" ]]; then
    ENDPOINT=$(jq -r ".networks.\"$CONF_NET\".endpoints[0]" "$CONFIG_JSON_PATH")
    NETWORK=${ENDPOINT#"https://"}
fi

USER_PROFILE_NAME=$(jq -r ".networks.\"$CONF_NET\".\"user-wallet\".profile" "$CONFIG_JSON_PATH")

# tonos-cli getkeypair -o $KEYS -p "$SEED" >/dev/null
jq -S ".networks.\"$CONF_NET\".\"user-wallet\" | del(.profile) | .public = .pubkey | del(.pubkey)" "$CONFIG_JSON_PATH" > keys.json

ABIS_DIR="../../contracts/gosh"
SYSTEM_CONTRACT_ABI="$ABIS_DIR/systemcontract.abi.json"
DAO_ABI="$ABIS_DIR/goshdao.abi.json"
WALLET_ABI="$ABIS_DIR/goshwallet.abi.json"
REPO_ABI="$ABIS_DIR/repository.abi.json"
COMMIT_ABI="$ABIS_DIR/commit.abi.json"
USER_PROFILE_ABI="$ABIS_DIR/profile.abi.json"

if [[ "$USER_PROFILE_ADDR" == "" ]]; then
    USER_PROFILE_ADDR=$(tonos-cli -u "$NETWORK" -j run "$SYSTEM_CONTRACT_ADDR" getProfileAddr "{\"name\":\"$USER_PROFILE_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | jq -r '.value0')
fi

export KEYS
export DAO_KEYS
export WALLET_KEYS
export CONF_NET
export ENDPOINT
export NETWORK
export USER_PROFILE_NAME
export ABIS_DIR
export SYSTEM_CONTRACT_ABI
export DAO_ABI
export WALLET_ABI
export REPO_ABI
export COMMIT_ABI
export USER_PROFILE_ABI
export USER_PROFILE_ADDR
