#!/bin/bash

set -e
set -o pipefail

# NETWORK=bhs01.network.gosh.sh
NETWORK=vps23.ton.dev

tonos-cli config --url $NETWORK

SYSTEM_CONTRACT_ADDR=0:fe2f42eb7841be52d3c091e2548d1b435b95932099d202bd4deb732b68c66257

SYSTEM_CONTRACT_ABI=/contracts/gosh/systemcontract.abi.json

USER_NAME=$1

# generate user keys

tonos-cli genphrase --dump "$USER_NAME".keys.json | grep -o '".*"' | tr -d '"' >"$USER_NAME".seed.txt
USER_PUBKEY=$(sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p' "$USER_NAME".keys.json)

# *create Profile
tonos-cli call --abi $SYSTEM_CONTRACT_ABI $SYSTEM_CONTRACT_ADDR deployProfile "{\"pubkey\":\"$USER_PUBKEY\",\"name\":\"$USER_NAME\"}"
USER_PROFILE_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getProfileAddr "{\"name\":\"$USER_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "USER_PROFILE_ADDR" "$USER_PROFILE_ADDR" | tee user_profile_addr
