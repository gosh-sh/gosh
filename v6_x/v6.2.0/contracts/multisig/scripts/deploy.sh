#!/bin/bash
set -e
set -o pipefail

export RUST_LOG=debug
export ACKI_CONFIG_FILE=/opt/gosh/contracts/blockchain.conf.json
export ACKI_GLOBAL_ID=0

SIGNER="__signer"
NETWORK_NAME="__network"

GIVER_ABI="../../multisig/MultisigWallet.abi.json"
GIVER_ADDR=`cat ../Giver.addr`
GIVER_SEED=`cat ../Giver.seed`
NETWORK=`cat ../Giver.network`

GIVER_PATH="../../multisig"
GIVER_ABI="$GIVER_PATH/MultisigWallet.abi.json"
GIVER_TVC="$GIVER_PATH/MultisigWallet.tvc"

# everdev signer add $SIGNER "$GIVER_SEED"
# everdev network add $NETWORK_NAME "$NETWORK"

# PUBLIC_KEY=`everdev signer info $SIGNER | tr -d ' ",' | sed -n '/public:/s/public://p'`
#everdev contract deploy $GIVER_ABI -n $NETWORK_NAME -s $SIGNER -i "{\"owners\": [\"0x${PUBLIC_KEY}\"], \"reqConfirms\": 1}"

/opt/gosh/contracts/tonos-cli getkeypair -p "$GIVER_SEED" -o ../Giver.keys

PUBLIC_KEY=$(cat ../Giver.keys | jq .public | tr -d '"')
/opt/gosh/contracts/tonos-cli config --url $NETWORK
# gosh-cli config --async_call true
/opt/gosh/contracts/tonos-cli deploy --abi $GIVER_ABI --sign "$GIVER_SEED" $GIVER_TVC "{\"owners\": [\"0x${PUBLIC_KEY}\"], \"reqConfirms\": 1}"