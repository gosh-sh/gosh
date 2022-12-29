#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

GOSH_PATH=../contracts/gosh
TESTS_PATH=../../tests
REPO_NAME=repo12
DAO_NAME=dao-test-12
NEW_REPO_PATH=repo12_v2
CONTROL_REPO_PATH=repo12_control
OLD_VERSION=$(grep -r 'string constant version' $GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
NEW_VERSION=9999.0.0

if [ $OLD_VERSION = $NEW_VERSION ]; then
  echo "Bad version of contracts"
  exit 1
fi

echo "Test 12 old version: $OLD_VERSION"

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $NEW_REPO_PATH ] && rm -rf $NEW_REPO_PATH
[ -d $CONTROL_REPO_PATH ] && rm -rf $CONTROL_REPO_PATH

# *deploy new DAO that will be upgraded
DAO_NAME="dao-test12_$TEST_INDEX"
echo "DAO_NAME=$DAO_NAME"
tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS deployDao \
  "{\"systemcontract\":\"$SYSTEM_CONTRACT_ADDR\", \"name\":\"$DAO_NAME\", \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"
DAO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "***** awaiting dao deploy *****"
wait_account_active $DAO_ADDR
echo "DAO_ADDR=$DAO_ADDR"

WALLET_ADDR=$(tonos-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "WALLET_ADDR=$WALLET_ADDR"

echo "***** turn DAO on *****"
tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
  "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"

sleep 10

GRANTED_PUBKEY=$(tonos-cli -j run --abi $WALLET_ABI $WALLET_ADDR getAccess {} | jq -r .value0)
echo $GRANTED_PUBKEY

echo "***** repo12 deploy *****"
tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

export OLD_LINK="gosh::$NETWORK://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "OLD_LINK=$OLD_LINK"

echo "***** cloning old version repo *****"
git clone $OLD_LINK

# check
cd $REPO_NAME
REPO_STATUS=1
if git status | grep 'No commits yet'; then
    REPO_STATUS=0
fi

if [ $REPO_STATUS != 0 ]; then
  exit $REPO_STATUS
fi

# push 1 file
echo "***** Pushing file to old repo *****"
echo old_ver > 1.txt
git add 1.txt
git commit -m test
git push

echo "***** Upgrade gosh version *****"
cd ..
cd $GOSH_PATH

sed -i "s/$OLD_VERSION/$NEW_VERSION/" *.sol

CUR_VERSION=$(grep -r 'string constant version' systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
if [ $CUR_VERSION != $NEW_VERSION ]; then
  echo "Failed to change contract version"
  exit 1
fi

make build
export VERSIONCONTROLLER_ADDR=`cat VersionController.addr`
VERSIONCONTROLLER_SEED=`cat gosh.seed | grep -o '".*"' | tr -d '"'`
export VERSIONCONTROLLER_SEED="$VERSIONCONTROLLER_SEED"
echo > SystemContract-${NEW_VERSION}.addr
make upgrade-docker

export VERSIONCONTROLLER_ABI=versioncontroller.abi.json

NEW_SYSTEM_CONTRACT_ADDR=$(tonos-cli -j run $VERSIONCONTROLLER_ADDR getSystemContractAddr "{\"version\":\"$NEW_VERSION\"}" --abi $VERSIONCONTROLLER_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "NEW_SYSTEM_CONTRACT_ADDR=$NEW_SYSTEM_CONTRACT_ADDR"

cd $TESTS_PATH

echo "***** start proposal for upgrade *****"
tonos-cli callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForUpgradeDao --newversion $NEW_VERSION --description "" --num_clients 1

PROP_ID="88364137685699556084928035923009541681801570983404644442401696785754621762666"

echo "***** get data for proposal *****"
echo "tonos-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker"
tip3VotingLocker=$(tonos-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
echo "tip3VotingLocker=$tip3VotingLocker"

echo "tonos-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker "
platform_id=$(tonos-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "platform_id=$platform_id"

sleep 3

tonos-cli callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount 20 --num_clients 1

wallet_tombstone=$(tonos-cli -j runx --addr $WALLET_ADDR -m getTombstone --abi $WALLET_ABI | sed -n '/value0/ p' | cut -d':' -f 2)
echo "WALLET tombstone: $wallet_tombstone"

echo "tonos-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI --name $DAO_NAME"
new_dao_addr=$(tonos-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI --name $DAO_NAME | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "New DAO address: $new_dao_addr"

NEW_WALLET_ADDR=$(tonos-cli -j run $new_dao_addr getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "NEW_WALLET_ADDR=$NEW_WALLET_ADDR"

tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
  "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$NEW_WALLET_ADDR\"}"

echo "***** new repo12 deploy *****"
tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $NEW_WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1
REPO_ADDR=$(tonos-cli -j run $NEW_SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

export NEW_LINK="gosh::$NETWORK://$NEW_SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "NEW_LINK=$NEW_LINK"

echo "***** cloning repo with new link *****"
git clone $NEW_LINK $NEW_REPO_PATH

echo "***** push to new version *****"
cd $NEW_REPO_PATH
echo new_ver > 1.txt
git add 1.txt
git commit -m test2
git push

cd ../

echo "***** cloning repo with old link *****"
git clone $OLD_LINK $CONTROL_REPO_PATH


echo "***** check repo *****"
cd $CONTROL_REPO_PATH

cur_ver=$(cat 1.txt)
if [ $cur_ver != "new_ver" ]; then
  echo "WRONG VERSION"
  exit 1
fi
echo "GOOD VERSION"

echo "***** Revert sol files *****"
cd ..
cd $GOSH_PATH
sed -i "s/$NEW_VERSION/$OLD_VERSION/" *.sol
make build

cd $TESTS_PATH