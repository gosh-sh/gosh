#!/bin/bash
set -e
set -o pipefail

SIGNER="__signer"
NETWORK_NAME="__network"

GIVER_PATH="../../multisig"
GIVER_ABI="$GIVER_PATH/MultisigWallet.abi.json"

# Generate keys
echo "========== Generate keys for GoshGiver"
tonos-cli genphrase | grep -o '".*"' | tr -d '"' > $GIVER_PATH/$GIVER_SEED_FILE_OUT
seed=`cat $GIVER_PATH/$GIVER_SEED_FILE_OUT`
everdev signer add $SIGNER "$seed"

echo $NETWORK > $GIVER_PATH/$GIVER_NETWORK_FILE_OUT
everdev network add $NETWORK_NAME "$NETWORK"

# Calculate GoshGiver address
GIVER_ADDR=$(everdev contract info $GIVER_ABI -s $SIGNER -n $NETWORK_NAME | sed -nr 's/Address:[[:space:]]+(.*)[[:space:]]+\(.*/\1/p')
echo "========== GoshGiver address: $GIVER_ADDR"
echo $GIVER_ADDR > $GIVER_PATH/Giver.addr
