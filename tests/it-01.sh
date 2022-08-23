#!/bin/bash
set -e

echo $PATH
# start after deploy.sh

export NETWORK=vps23.ton.dev

tonos-cli config --url $NETWORK

# Should exist gosh root and Dao creater

export GOSH_ROOT_ADDR=`cat ../contracts/gosh/GoshRoot.addr`
export DAO_CREATOR_ADDR=`cat ../contracts/gosh/GoshDaoCreator.addr`

echo $GOSH_ROOT_ADDR
echo $DAO_CREATOR_ADDR

GOSH_ABI=../contracts/gosh/gosh.abi.json
DAO_CREATOR_ABI=../contracts/gosh/daocreator.abi.json

# create DAO

DAO1_NAME=dao01

# generate dao1 keys
SEED=`tonos-cli genphrase | grep -o '".*"' | tr -d '"'`
DAO1_KEYS=test.keys.json
tonos-cli getkeypair -o $DAO1_KEYS -p "$SEED"
DAO1_PUBKEY=$(cat $DAO1_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')

#set -x
# deploy DAO
tonos-cli call --abi $DAO_CREATOR_ABI $DAO_CREATOR_ADDR deployDao "{\"root_pubkey\":\"$DAO1_PUBKEY\",\"name\":\"$DAO1_NAME\"}"
DAO1_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrDao "{\"name\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

# create gosh wallet

# user keys
WALLET_KEYS=$DAO1_KEYS
WALLET_PUBKEY=$(cat $WALLET_KEYS | sed -n '/public/ s/.*\([[:xdigit:]]\{64\}\).*/0x\1/p')
DAO1_ABI=../contracts/gosh/goshdao.abi.json

# deploy Wallet
tonos-cli call --abi $DAO1_ABI --sign $DAO1_KEYS $DAO1_ADDR deployWallet "{\"pubkey\":\"$WALLET_PUBKEY\"}" || exit 1
WALLET_ADDR=$(tonos-cli -j run $DAO1_ADDR getAddrWallet "{\"pubkey\":\"$WALLET_PUBKEY\",\"index\":0}" --abi $DAO1_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo -n $WALLET_ADDR > gosh_wallet.addr

# create repo

REPO_NAME=repo1
WALLET_ABI=../contracts/gosh/goshwallet.abi.json

tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository "{\"nameRepo\":\"$REPO_NAME\"}" || exit 1
REPO_ADDR=$(tonos-cli -j run $GOSH_ROOT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO1_NAME\"}" --abi $GOSH_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)


sleep 10
# clone repo

git clone gosh::vps23.ton.dev://$GOSH_ROOT_ADDR/$DAO1_NAME/$REPO_NAME

#check
cd repo1
REPO_STATUS=1
if git status | grep 'No commits yet'; then
    REPO_STATUS=0
fi

echo "  Gosh root:" $GOSH_ROOT_ADDR
echo "DAO creator:" $DAO_CREATOR_ADDR
echo ===================== DAO =====================
echo "   DAO name:" $DAO1_NAME
echo "DAO address:" $DAO1_ADDR
echo "   DAO keys:" $(cat $DAO1_KEYS)
echo ==================== WALLET ===================
echo "WALLET address:" $WALLET_ADDR
echo "   WALLET keys:" $(cat $WALLET_KEYS)
echo ================== REPOSITORY ===================
echo "     REPO_NAME:" $REPO_NAME
echo "     REPO_ADDR:" $REPO_ADDR

exit $REPO_STATUS
