#!/bin/bash
set -e
set -o pipefail

GIVER_PATH="../../multisig"
GIVER_ABI="$GIVER_PATH/MultisigWallet.abi.json"
GIVER_TVC="$GIVER_PATH/MultisigWallet.tvc"

# Generate keys
echo "========== Generate keys for GoshGiver"
tonos-cli genphrase | grep -o '".*"' | tr -d '"' > $GIVER_PATH/$GIVER_SEED_FILE_OUT
seed=`cat $GIVER_PATH/$GIVER_SEED_FILE_OUT`
echo $NETWORK > $GIVER_PATH/$GIVER_NETWORK_FILE_OUT

# Calculate GoshGiver address
GIVER_ADDR=$(tonos-cli -j genaddr --abi $GIVER_ABI --setkey "$seed" --save $GIVER_TVC | jq -M ".raw_address" | cut -d '"' -f 2)
echo "========== GoshGiver address: $GIVER_ADDR"
echo $GIVER_ADDR > $GIVER_PATH/Giver.addr
