#!/bin/bash

set -e
set -o pipefail

if [[ ! -f 'config.json' ]]; then
    echo "config.json does not exist, copy with your own one"
    exit 1
fi

mkdir -p ~/.gosh
cp config.json ~/.gosh/config.json

KEYS=keys.json
WALLET_KEYS=$KEYS

CONF_NET=$(jq -r '."primary-network"' config.json)

if [[ "$NETWORK" != "" ]]; then
    ENDPOINT=$(jq -r ".networks.\"$CONF_NET\".endpoints[0]" config.json)
    NETWORK=${ENDPOINT#"https://"}
fi

USER_PROFILE_NAME=$(jq -r ".networks.\"$CONF_NET\".\"user-wallet\".profile" config.json)

# tonos-cli getkeypair -o $KEYS -p "$SEED" >/dev/null
jq -S ".networks.\"$CONF_NET\".\"user-wallet\" | del(.profile) | .public = .pubkey | del(.pubkey)" config.json > keys.json

ABIS_DIR="../../contracts/gosh"
SYSTEM_CONTRACT_ABI="$ABIS_DIR/systemcontract.abi.json"
DAO_ABI="$ABIS_DIR/goshdao.abi.json"
WALLET_ABI="$ABIS_DIR/goshwallet.abi.json"
REPO_ABI="$ABIS_DIR/repository.abi.json"
COMMIT_ABI="$ABIS_DIR/commit.abi.json"

USER_PROFILE_ADDR=$(tonos-cli -u "$NETWORK" -j run "$SYSTEM_CONTRACT_ADDR" getProfileAddr "{\"name\":\"$USER_PROFILE_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | jq -r '.value0')
DAO_ADDR=$(tonos-cli -u "$NETWORK" -j run "$SYSTEM_CONTRACT_ADDR" getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | jq -r '.value0')
WALLET_ADDR=$(tonos-cli -u "$NETWORK" -j run "$DAO_ADDR" getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | jq -r '.value0')

export KEYS
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
export USER_PROFILE_ADDR
export DAO_ADDR
export WALLET_ADDR
