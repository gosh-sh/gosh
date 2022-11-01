#!/bin/bash
# start after deploy.sh
set -e 
set -o pipefail

export NETWORK=vps23.ton.dev
echo "NETWORK=$NETWORK" > env.env

tonos-cli config --url $NETWORK

# Should exist root and gosh root

export GOSH_ROOT_ADDR=`cat ../contracts/gosh/SystemContract.addr`
echo "export GOSH_ROOT_ADDR=$GOSH_ROOT_ADDR" >> env.env

export GOSH_ABI=../contracts/gosh/systemcontract.abi.json
USER_PROFILE_ABI=../contracts/gosh/profile.abi.json
echo "export GOSH_ABI=$GOSH_ABI" >> env.env
export REPO_ABI=../contracts/gosh/repository.abi.json
echo "export REPO_ABI=$REPO_ABI" >> env.env
DAO1_ABI=../contracts/gosh/goshdao.abi.json

# generate user keys
SEED=`tonos-cli genphrase | grep -o '".*"' | tr -d '"'`
DAO1_KEYS=test.keys.json
tonos-cli getkeypair -o $DAO1_KEYS -p "$SEED"
DAO1_PUBKEY=$(cat $DAO1_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')

# *create Profile
USER_PROFILE_NAME="@user201"
tonos-cli call --abi $GOSH_ABI $GOSH_ROOT_ADDR deployProfile "{\"pubkey\":\"$DAO1_PUBKEY\",\"name\":\"$USER_PROFILE_NAME\"}"
USER_PROFILE_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getProfileAddr "{\"name\":\"$USER_PROFILE_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

# *deploy DAO
export DAO1_NAME=dao-100
echo "export DAO1_NAME=$DAO1_NAME" >> env.env
tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $DAO1_KEYS deployDao \
  "{\"goshroot\":\"$GOSH_ROOT_ADDR\", \"name\":\"$DAO1_NAME\", \"previous\":null, \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"
DAO1_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrDao "{\"name\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

# user keys
export WALLET_KEYS=$DAO1_KEYS
echo "export WALLET_KEYS=$WALLET_KEYS" >> env.env
WALLET_PUBKEY=$(cat $WALLET_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')

WALLET_ADDR=$(tonos-cli -j run $DAO1_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO1_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
export WALLET_ADDR
echo "export WALLET_ADDR=$WALLET_ADDR" >> env.env
export WALLET_ABI=../contracts/gosh/goshwallet.abi.json
echo "export WALLET_ABI=$WALLET_ABI" >> env.env

tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
  "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"

GRANTED_PUBKEY=$(tonos-cli -j run --abi $WALLET_ABI $WALLET_ADDR getAccess {} | jq -r .value0)

USER_CONFIG=~/.gosh/config.json

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
echo "  Gosh root:" $GOSH_ROOT_ADDR
echo ================ USER PROFILE =================
echo "   Profile name:" $USER_PROFILE_NAME
echo "Profile address:" $USER_PROFILE_ADDR
echo ===================== DAO =====================
echo "   DAO name:" $DAO1_NAME
echo "DAO address:" $DAO1_ADDR
echo "   DAO keys:" $(cat $DAO1_KEYS)
echo ==================== WALLET ===================
echo "WALLET address:" $WALLET_ADDR
echo "   WALLET keys:" $(cat $WALLET_KEYS)

cat env.env
