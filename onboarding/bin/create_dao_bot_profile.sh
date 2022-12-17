#!/bin/bash

set -e
set -o pipefail

tonos-cli config --url "$NETWORK"

# *create Profile
echo deployProfile
tonos-cli call \
    --abi "$SYSTEM_CONTRACT_ABI" "$SYSTEM_CONTRACT_ADDR" deployProfile \
    "{\"pubkey\":\"$USER_PUBKEY\",\"name\":\"$USER_NAME\"}" || true

echo getProfileAddr
tonos-cli -j run "$SYSTEM_CONTRACT_ADDR" \
    getProfileAddr "{\"name\":\"$USER_NAME\"}" \
    --abi "$SYSTEM_CONTRACT_ABI"
#  | sed -n '/value0/ p' | cut -d'"' -f 4
