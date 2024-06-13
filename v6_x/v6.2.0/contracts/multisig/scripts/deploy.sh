#!/bin/bash
set -e
set -o pipefail

GIVER_ABI="../../multisig/MultisigWallet.abi.json"
GIVER_ADDR=`cat /tmp/Giver.addr`
GIVER_SEED=`cat /tmp/Giver.seed`
NETWORK=`cat /tmp/Giver.network`

GIVER_PATH="../../multisig"
GIVER_ABI="$GIVER_PATH/MultisigWallet.abi.json"
GIVER_TVC="$GIVER_PATH/MultisigWallet.tvc"

tonos-cli config --url $NETWORK

PUBLIC_KEY=`tonos-cli -j genpubkey "$GIVER_SEED" | sed -n '/"Public key":/{s/.*"Public key": "\([^"]*\)".*/\1/;p;q;}'`
tonos-cli -u $NETWORK deploy --abi $GIVER_ABI --sign "$GIVER_SEED" $GIVER_TVC "{\"owners\": [\"0x${PUBLIC_KEY}\"], \"reqConfirms\": 1}"
