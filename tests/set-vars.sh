#!/bin/bash
# start after deploy.sh
set -e
set -o pipefail
. ./util.sh

export NETWORK=n01.fld.dapp.tonlabs.io
echo "NETWORK=$NETWORK" > env.env

tonos-cli config --url $NETWORK

# Should exist VersionConrtroler and SystemContract contracts

export SYSTEM_CONTRACT_ADDR=`cat ../contracts/gosh/SystemContract.addr`
echo "export SYSTEM_CONTRACT_ADDR=$SYSTEM_CONTRACT_ADDR" >> env.env

export SYSTEM_CONTRACT_ABI=../contracts/gosh/systemcontract.abi.json
USER_PROFILE_ABI=../contracts/gosh/profile.abi.json
echo "export SYSTEM_CONTRACT_ABI=$SYSTEM_CONTRACT_ABI" >> env.env
export REPO_ABI=../contracts/gosh/repository.abi.json
echo "export REPO_ABI=$REPO_ABI" >> env.env
DAO_ABI=../contracts/gosh/goshdao.abi.json

# generate user keys
SEED=`tonos-cli genphrase | grep -o '".*"' | tr -d '"'`
DAO_KEYS=test.keys.json
tonos-cli getkeypair -o $DAO_KEYS -p "$SEED"
DAO_PUBKEY=$(cat $DAO_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')

# *create Profile
USER_PROFILE_NAME=user1
tonos-cli call --abi $SYSTEM_CONTRACT_ABI $SYSTEM_CONTRACT_ADDR deployProfile "{\"pubkey\":\"$DAO_PUBKEY\",\"name\":\"$USER_PROFILE_NAME\"}"
USER_PROFILE_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getProfileAddr "{\"name\":\"$USER_PROFILE_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
wait_account_active $USER_PROFILE_ADDR

# *deploy DAO
export DAO_NAME=dao-1
echo "export DAO_NAME=$DAO_NAME" >> env.env
tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $DAO_KEYS deployDao \
  "{\"systemcontract\":\"$SYSTEM_CONTRACT_ADDR\", \"name\":\"$DAO_NAME\", \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"
DAO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
wait_account_active $DAO_ADDR

# user keys
export WALLET_KEYS=$DAO_KEYS
echo "export WALLET_KEYS=$WALLET_KEYS" >> env.env
WALLET_PUBKEY=$(cat $WALLET_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')

WALLET_ADDR=$(tonos-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
export WALLET_ADDR
echo "export WALLET_ADDR=$WALLET_ADDR" >> env.env
export WALLET_ABI=../contracts/gosh/goshwallet.abi.json
echo "export WALLET_ABI=$WALLET_ABI" >> env.env

tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
  "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"

GRANTED_PUBKEY=$(tonos-cli -j run --abi $WALLET_ABI $WALLET_ADDR getAccess {} | jq -r .value0)

USER_CONFIG=$(pwd)/config.json
echo "export GOSH_CONFIG_PATH=$USER_CONFIG" >> env.env

WALLET_PUBKEY=$(cat $WALLET_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/\1/p')
WALLET_SECRET=$(cat $WALLET_KEYS | sed -n '/secret/ s/.*\([[:xdigit:]]\{64\}\).*/\1/p')

[ ! -d ~/.gosh ] && mkdir ~/.gosh

tee $USER_CONFIG <<EOF
{
  "ipfs": "https://ipfs.network.gosh.sh",
  "primary-network": "$NETWORK",
  "networks": {
    "$NETWORK": {
      "user-wallet": {
        "profile": "$USER_PROFILE_NAME",
        "pubkey": "$WALLET_PUBKEY",
        "secret": "$WALLET_SECRET"
      },
      "endpoints": ["https://$NETWORK/"]
    }
  }
}
EOF

echo ===============================================
echo "System contract:" $SYSTEM_CONTRACT_ADDR
echo ================ USER PROFILE =================
echo "   Profile name:" $USER_PROFILE_NAME
echo "Profile address:" $USER_PROFILE_ADDR
echo ===================== DAO =====================
echo "   DAO name:" $DAO_NAME
echo "DAO address:" $DAO_ADDR
echo "   DAO keys:" $(cat $DAO_KEYS)
echo ==================== WALLET ===================
echo "WALLET address:" $WALLET_ADDR
echo "   WALLET keys:" $(cat $WALLET_KEYS)

cat env.env
