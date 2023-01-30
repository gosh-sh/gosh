#!/bin/bash
set -e 
set -o pipefail
. ./util.sh

set -x

if [ "$1" = "ignore" ]; then
  echo "Test $0 ignored"
  exit 0
fi

REPO_NAME=upgrade_repo02
DAO_NAME="dao-upgrade-test02_$RANDOM"
NEW_REPO_PATH=upgrade_repo02_v2

# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $NEW_REPO_PATH ] && rm -rf $NEW_REPO_PATH

# deploy new DAO that will be upgraded
echo "DAO_NAME=$DAO_NAME"
gosh-cli -j call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS deployDao \
  "{\"systemcontract\":\"$SYSTEM_CONTRACT_ADDR\", \"name\":\"$DAO_NAME\", \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"
DAO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "***** awaiting dao deploy *****"
wait_account_active $DAO_ADDR
echo "DAO_ADDR=$DAO_ADDR"

WALLET_ADDR=$(gosh-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "WALLET_ADDR=$WALLET_ADDR"

echo "***** turn DAO on *****"
gosh-cli -j call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
  "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"

sleep 10

GRANTED_PUBKEY=$(gosh-cli -j run --abi $WALLET_ABI $WALLET_ADDR getAccess {} | jq -r .value0)
echo $GRANTED_PUBKEY

echo "***** repo02 deploy *****"
gosh-cli -j call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1
REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

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

cd ..

echo "***** start proposal for upgrade *****"
gosh-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForUpgradeDao --newversion $TEST_VERSION1 --description "" --num_clients 1

echo "***** get data for proposal *****"
tip3VotingLocker=$(gosh-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
echo "tip3VotingLocker=$tip3VotingLocker"

platform_id=$(gosh-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID1 --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "platform_id=$platform_id"

sleep 3

gosh-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount 20 --num_clients 1

wallet_tombstone=$(gosh-cli -j runx --addr $WALLET_ADDR -m getTombstone --abi $WALLET_ABI | sed -n '/value0/ p' | cut -d':' -f 2)
echo "WALLET tombstone: $wallet_tombstone"

if [ "$wallet_tombstone" = "false" ]; then
  echo "Tombstone was not set"
  exit 1
fi

echo "gosh-cli -j runx --addr $SYSTEM_CONTRACT_ADDR_1 -m getAddrDao --abi $SYSTEM_CONTRACT_ABI --name $DAO_NAME"
new_dao_addr=$(gosh-cli -j runx --addr $SYSTEM_CONTRACT_ADDR_1 -m getAddrDao --abi $SYSTEM_CONTRACT_ABI --name $DAO_NAME | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "New DAO address: $new_dao_addr"

NEW_WALLET_ADDR=$(gosh-cli -j run $new_dao_addr getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "NEW_WALLET_ADDR=$NEW_WALLET_ADDR"

gosh-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
  "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$NEW_WALLET_ADDR\"}"

echo "***** new repo02 deploy *****"
gosh-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $NEW_WALLET_ADDR deployRepository \
    "{\"nameRepo\":\"$REPO_NAME\", \"previous\":{\"addr\":\"$REPO_ADDR\", \"version\":\"$TEST_VERSION1\"}}" || exit 1
REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR_1 getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

export NEW_LINK="gosh::$NETWORK://$SYSTEM_CONTRACT_ADDR_1/$DAO_NAME/$REPO_NAME"
echo "NEW_LINK=$NEW_LINK"

echo "***** cloning repo with new link *****"
git clone $NEW_LINK $NEW_REPO_PATH

echo "***** push to new version *****"
cd $NEW_REPO_PATH

cur_ver=$(cat 1.txt)
if [ $cur_ver != "old_ver" ]; then
  echo "WRONG VERSION"
  exit 1
fi
echo "GOOD VERSION"

echo new_ver > 1.txt
git add 1.txt
git commit -m test2
git push

cd ..

echo "TEST SUCCEEDED"
