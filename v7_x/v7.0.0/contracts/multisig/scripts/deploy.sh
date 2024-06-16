#!/bin/bash
set -e
set -o pipefail

SIGNER="__signer"
NETWORK_NAME="__network"

GIVER_ABI="../../multisig/MultisigWallet.abi.json"
GIVER_ADDR=`cat /tmp/Giver.addr`
GIVER_SEED=`cat /tmp/Giver.seed`
NETWORK=`cat /tmp/Giver.network`

GIVER_PATH="../../multisig"
GIVER_ABI="$GIVER_PATH/MultisigWallet.abi.json"
GIVER_TVC="$GIVER_PATH/MultisigWallet.tvc"

everdev signer add $SIGNER "$GIVER_SEED"
everdev network add $NETWORK_NAME "$NETWORK"

PUBLIC_KEY=`everdev signer info $SIGNER | tr -d ' ",' | sed -n '/public:/s/public://p'`
#everdev contract deploy $GIVER_ABI -n $NETWORK_NAME -s $SIGNER -i "{\"owners\": [\"0x${PUBLIC_KEY}\"], \"reqConfirms\": 1}"
tonos-cli -u $NETWORK deploy --abi $GIVER_ABI --sign "$GIVER_SEED" $GIVER_TVC "{\"owners\": [\"0x${PUBLIC_KEY}\"], \"reqConfirms\": 1}"
