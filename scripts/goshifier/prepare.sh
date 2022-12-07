#!/bin/bash

CONF_ERROR=$(cat config.json | jq -r '.error')

if [[ "$CONF_ERROR" != "null" ]]; then
    echo "config.json invalid: $CONF_ERROR"
    exit 1
fi

mkdir -p ~/.gosh
cp config.json ~/.gosh/config.json

export KEYS=keys.json
export WALLET_KEYS=$KEYS

export CONF_NET=$(cat config.json | jq -r '."primary-network"')
export ENDPOINT=$(cat config.json | jq -r ".networks.\"$CONF_NET\".endpoints[0]")
export NETWORK=${ENDPOINT#"https://"}
export USER_PROFILE_NAME=$(cat config.json | jq -r ".networks.\"$CONF_NET\".\"user-wallet\".profile")

# tonos-cli getkeypair -o $KEYS -p "$SEED" >/dev/null
cat config.json | jq -S ".networks.\"$CONF_NET\".\"user-wallet\" | del(.profile) | .public = .pubkey | del(.pubkey)" > keys.json

export ABIS_DIR="../../contracts/gosh"
export SYSTEM_CONTRACT_ABI="$ABIS_DIR/systemcontract.abi.json"
export DAO_ABI="$ABIS_DIR/goshdao.abi.json"
export WALLET_ABI="$ABIS_DIR/goshwallet.abi.json"
export REPO_ABI="$ABIS_DIR/repository.abi.json"
export COMMIT_ABI="$ABIS_DIR/commit.abi.json"

export USER_PROFILE_ADDR=$(tonos-cli -u "$NETWORK" -j run $SYSTEM_CONTRACT_ADDR getProfileAddr "{\"name\":\"$USER_PROFILE_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

export DAO_ADDR=$(tonos-cli -u "$NETWORK" -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

export WALLET_ADDR=$(tonos-cli -u "$NETWORK" -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
