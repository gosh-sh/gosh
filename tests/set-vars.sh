#!/bin/bash
# start after deploy of system contract
set -e
set -o pipefail
. ./util.sh

# Default network | But it cane be also provided by arguemnt like this ./set-vars.sh <version> <network_name>
DEFAULT_NETWORK=localhost

# $1 = VERSION (v1_x, v2_x)

GOSH_PATH=../$1/contracts/gosh

if [ -z "$2" ]
  then
    export NETWORK=$DEFAULT_NETWORK
else
    export NETWORK=$2
fi

TEST_INDEX="${TEST_INDEX:-$(date +%s)}"
echo "TEST INDEX $TEST_INDEX"
echo "export NETWORK=$NETWORK" > env.env
echo "export VERSION=$1" >> env.env

tonos-cli config --url $NETWORK
set -x
# Should exist VersionConrtroler and SystemContract contracts

export VERSION_CONTROLLER=`cat $GOSH_PATH/VersionController.addr`
echo "export VERSION_CONTROLLER=$VERSION_CONTROLLER" >> env.env
export SYSTEM_CONTRACT_ADDR=`cat $GOSH_PATH/SystemContract.addr`
echo "export SYSTEM_CONTRACT_ADDR=$SYSTEM_CONTRACT_ADDR" >> env.env

export SYSTEM_CONTRACT_ABI=$GOSH_PATH/systemcontract.abi.json
USER_PROFILE_ABI=$GOSH_PATH/../profile.abi.json
echo "export SYSTEM_CONTRACT_ABI=$SYSTEM_CONTRACT_ABI" >> env.env
export REPO_ABI=$GOSH_PATH/repository.abi.json
echo "export REPO_ABI=$REPO_ABI" >> env.env
DAO_ABI=$GOSH_PATH/goshdao.abi.json
echo "export DAO_ABI=$DAO_ABI" >> env.env

# generate user keys

SEED=`tonos-cli genphrase | grep -o '".*"' | tr -d '"'`
echo $SEED > user.seed
DAO_KEYS=test.keys.json
tonos-cli getkeypair -o $DAO_KEYS -p "$SEED"
DAO_PUBKEY=$(cat $DAO_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')

# *create Profile
USER_PROFILE_NAME=user$TEST_INDEX
tonos-cli call --abi $SYSTEM_CONTRACT_ABI $SYSTEM_CONTRACT_ADDR deployProfile "{\"pubkey\":\"$DAO_PUBKEY\",\"name\":\"$USER_PROFILE_NAME\"}"
USER_PROFILE_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getProfileAddr "{\"name\":\"$USER_PROFILE_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
wait_account_active $USER_PROFILE_ADDR
echo "export USER_PROFILE_ABI=$USER_PROFILE_ABI" >> env.env
echo "export USER_PROFILE_ADDR=$USER_PROFILE_ADDR" >> env.env

echo "***** awaiting profile deploy *****"
wait_account_active $USER_PROFILE_ADDR

# *deploy DAO
export DAO_NAME=dao-$TEST_INDEX
echo "export DAO_NAME=$DAO_NAME" >> env.env
tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $DAO_KEYS deployDao \
  "{\"systemcontract\":\"$SYSTEM_CONTRACT_ADDR\", \"name\":\"$DAO_NAME\", \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"
DAO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
wait_account_active $DAO_ADDR

echo "***** awaiting dao deploy *****"
wait_account_active $DAO_ADDR
echo "export DAO_ADDR=$DAO_ADDR" >> env.env

# user keys
export WALLET_KEYS=$DAO_KEYS
echo "export WALLET_KEYS=$WALLET_KEYS" >> env.env
WALLET_PUBKEY=$(cat $WALLET_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')
echo "export WALLET_PUBKEY=$WALLET_PUBKEY" >> env.env

WALLET_ADDR=$(tonos-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
export WALLET_ADDR
echo "export WALLET_ADDR=$WALLET_ADDR" >> env.env
export WALLET_ABI=$GOSH_PATH/goshwallet.abi.json
echo "export WALLET_ABI=$WALLET_ABI" >> env.env

tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
  "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"

sleep 10

# GRANTED_PUBKEY=$(tonos-cli -j run --abi $WALLET_ABI $WALLET_ADDR getAccess {} | jq -r .value0)

USER_CONFIG=$(pwd)/config.json
echo "export GOSH_CONFIG_PATH=$USER_CONFIG" >> env.env

WALLET_PUBKEY_CONFIG=$(cat $WALLET_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/\1/p')
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
        "pubkey": "$WALLET_PUBKEY_CONFIG",
        "secret": "$WALLET_SECRET"
      },
      "endpoints": ["$NETWORK/"]
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
