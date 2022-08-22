#!/bin/bash
set -e

# start after deploy.sh

export NETWORK=vps23.ton.dev

tonos-cli config --url $NETWORK

# Should exist gosh root and Dao creater

export GOSH_ROOT_ADDR=`cat ../contracts/gosh/GoshRoot.addr`
export DAO_CREATOR_ADDR=`cat ../contracts/gosh/GoshDaoCreator.addr`

export GOSH_ABI=../contracts/gosh/gosh.abi.json
DAO_CREATOR_ABI=../contracts/gosh/daocreator.abi.json

# create DAO

export DAO1_NAME=dao005

# generate dao1 keys
SEED=`tonos-cli genphrase | grep -o '".*"' | tr -d '"'`
DAO1_KEYS=test.keys.json
tonos-cli getkeypair -o $DAO1_KEYS -p "$SEED"
DAO1_PUBKEY=$(cat $DAO1_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')

# deploy DAO
tonos-cli call --abi $DAO_CREATOR_ABI $DAO_CREATOR_ADDR deployDao "{\"root_pubkey\":\"$DAO1_PUBKEY\",\"name\":\"$DAO1_NAME\"}"
DAO1_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrDao "{\"name\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

# create gosh wallet

# user keys
export WALLET_KEYS=$DAO1_KEYS
WALLET_PUBKEY=$(cat $WALLET_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')
DAO1_ABI=../contracts/gosh/goshdao.abi.json

# deploy Wallet
tonos-cli call --abi $DAO1_ABI --sign $DAO1_KEYS $DAO1_ADDR deployWallet "{\"pubkey\":\"$WALLET_PUBKEY\"}" || exit 1
WALLET_ADDR=$(tonos-cli -j run $DAO1_ADDR getAddrWallet "{\"pubkey\":\"$WALLET_PUBKEY\",\"index\":0}" --abi $DAO1_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
export WALLET_ADDR
export WALLET_ABI=../contracts/gosh/goshwallet.abi.json

USER_CONFIG=~/.gosh/config.json

WALLET_PUBKEY=$(cat $WALLET_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/\1/p')
WALLET_SECRET=$(cat $WALLET_KEYS | sed -n '/secret/ s/.*\([[:xdigit:]]\{64\}\).*/\1/p')

[ ! -d ~/.gosh ] && mkdir ~/.gosh

tee $USER_CONFIG <<EOF
{
  "ipfs": "https://ipfs.network.gosh.sh",
  "primary-network": "vps23.ton.dev",
  "networks": {
    "vps23.ton.dev": {
      "user-wallet": {
        "pubkey": "$WALLET_PUBKEY",
        "secret": "$WALLET_SECRET"
      },
      "endpoints": ["https://vps23.ton.dev/"]
    }
  }
}
EOF

echo ===============================================
echo "  Gosh root:" $GOSH_ROOT_ADDR
echo "DAO creator:" $DAO_CREATOR_ADDR
echo ===================== DAO =====================
echo "   DAO name:" $DAO1_NAME
echo "DAO address:" $DAO1_ADDR
echo "   DAO keys:" $(cat $DAO1_KEYS)
echo ==================== WALLET ===================
echo "WALLET address:" $WALLET_ADDR
echo "   WALLET keys:" $(cat $WALLET_KEYS)
