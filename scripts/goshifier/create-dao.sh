#!/bin/bash

set -e
set -o pipefail

cd "$(dirname "$0")"

export SYSTEM_CONTRACT_ADDR=$1

if [[ "$2" == "" ]]; then
    echo "Usage: $0 gosh_system_contract_addr gosh_dao_name"
    exit 1
fi

. prepare.sh
. util.sh

export DAO_NAME=$2

DAO_ADDR=$(tonos-cli -u "$NETWORK" -j run "$SYSTEM_CONTRACT_ADDR" getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi "$SYSTEM_CONTRACT_ABI" | jq -r '.value0')
export DAO_ADDR

status=`tonos-cli -j -u "$NETWORK" account "$DAO_ADDR" | jq -r '."'"$DAO_ADDR"'".acc_type'`

if [ "$status" != "Active" ]; then
  tonos-cli -u "$NETWORK" call --abi "$USER_PROFILE_ABI" "$USER_PROFILE_ADDR" --sign "$DAO_KEYS" deployDao \
      "{\"systemcontract\":\"$SYSTEM_CONTRACT_ADDR\", \"name\":\"$DAO_NAME\", \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"

  echo "***** awaiting dao deploy ($DAO_ADDR) *****"
  wait_account_active "$DAO_ADDR"
  sleep 1
else
  echo "***** dao already deployed ($DAO_ADDR) *****"
fi

WALLET_PUBKEY=$(cat "$WALLET_KEYS" | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')
export WALLET_PUBKEY

WALLET_ADDR=$(tonos-cli -u "$NETWORK" -j run "$DAO_ADDR" getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi "$DAO_ABI" | jq -r '.value0')
export WALLET_ADDR

GRANTED_PUBKEY=$(tonos-cli -u "$NETWORK" -j run --abi "$WALLET_ABI" "$WALLET_ADDR" getAccess {} | jq -r .value0)
if [ "$GRANTED_PUBKEY" != "$WALLET_PUBKEY" ]; then
    tonos-cli -u "$NETWORK" call --abi "$USER_PROFILE_ABI" "$USER_PROFILE_ADDR" --sign "$WALLET_KEYS" turnOn \
      "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"

    echo "***** awaiting access grant ($WALLET_PUBKEY) *****"
    stop_at=$((SECONDS+120))
    while [ $SECONDS -lt $stop_at ]; do
        GRANTED_PUBKEY=$(tonos-cli -u "$NETWORK" -j run --abi "$WALLET_ABI" "$WALLET_ADDR" getAccess {} | jq -r .value0)
        if [ "$GRANTED_PUBKEY" = "$WALLET_PUBKEY" ]; then
            echo "access set up"
            break
        fi
        sleep 1
    done
else
    echo "***** access already granted ($WALLET_PUBKEY) *****"
fi
