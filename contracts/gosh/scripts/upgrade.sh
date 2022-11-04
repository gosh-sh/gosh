# Script for deployment VersionController contracts

#!/bin/bash
set -e
set -o pipefail

### Set during docker run. See Makefile and README.
#NETWORK
#GIVER_WALLET_ADDR
#VERSIONCONTROLLER_ADDR

echo $NETWORK
echo $GIVER_WALLET_ADDR
echo $VERSIONCONTROLLER_ADDR

# envs
SIGNER="GOSHSigner" # will be created automatically
WALLET_SIGNER="GiverWalletSigner" # will be created automatically
GOSH_PATH="../../gosh"
SMV_PATH="../../smv"
VERSIONCONTROLLER_ABI="$GOSH_PATH/versioncontroller.abi.json"
SYSTEMCONTRACT_ABI="$GOSH_PATH/systemcontract.abi.json"
GOSH_REPO_ROOT_PATH=/opt/gosh/contracts
GIVER_WALLET_KEYS_PATH=/tmp/giver.keys.json

GOSH_BALANCE=400000000000000

GOSH_VERSION=$(grep -r 'string constant version' $GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
echo $GOSH_VERSION
export GOSH_VERSION=$GOSH_VERSION

# Upload GOSH keys
echo "========== Generate keys for VersionController"
seed=`cat $GOSH_PATH/$VERSIONCONTROLLER_SEED_FILE_OUT| grep -o '".*"' | tr -d '"'`
everdev signer add $SIGNER "$seed"

everdev network add $NETWORK $NETWORK

# Prepare GIVER_WALLET
curl https://raw.githubusercontent.com/tonlabs/ton-labs-contracts/master/solidity/safemultisig/SafeMultisigWallet.abi.json -O -s
GIVER_WALLET_ABI="./SafeMultisigWallet.abi.json"
everdev signer add $WALLET_SIGNER $GIVER_WALLET_KEYS_PATH


# ############################################################
# Get codes
# ############################################################
SYSTEMCONTRACT_CODE=$(everdev contract dt $GOSH_PATH/systemcontract.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TOKEN_ROOT_CODE=$(everdev contract dt $SMV_PATH/TokenRoot.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TOKEN_WALLET_CODE=$(everdev contract dt $SMV_PATH/TokenWallet.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TOKEN_LOCKER_CODE=$(everdev contract dt $SMV_PATH/SMVTokenLocker.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
LOCKER_PLATFORM_CODE=$(everdev contract dt $SMV_PATH/LockerPlatform.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
SMV_CLIENT_CODE=$(everdev contract dt $SMV_PATH/SMVClient.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
SMV_PROPOSAL_CODE=$(everdev contract dt $SMV_PATH/SMVProposal.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
DIFF_CODE=$(everdev contract dt $GOSH_PATH/diff.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
REPO_CODE=$(everdev contract dt $GOSH_PATH/repository.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
COMMIT_CODE=$(everdev contract dt $GOSH_PATH/commit.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
SNAPSHOT_CODE=$(everdev contract dt $GOSH_PATH/snapshot.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
WALLET_CODE=$(everdev contract dt $GOSH_PATH/goshwallet.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
DAO_CODE=$(everdev contract dt $GOSH_PATH/goshdao.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TREE_CODE=$(everdev contract dt $GOSH_PATH/tree.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TAG_CODE=$(everdev contract dt $GOSH_PATH/tag.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
CONTENTSIG_CODE=$(everdev contract dt $GOSH_PATH/content-signature.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
PROFILE_CODE=$(everdev contract dt $GOSH_PATH/profile.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
PROFILEDAO_CODE=$(everdev contract dt $GOSH_PATH/profiledao.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')


# ############################################################
# Calculate VersionController address
# ############################################################
VERSIONCONTROLLER_ADDR=$(everdev contract info $VERSIONCONTROLLER_ABI --signer $SIGNER --network $NETWORK | sed -nr 's/Address:[[:space:]]+(.*)[[:space:]]+\(.*/\1/p')
echo "========== VersionController address: $VERSIONCONTROLLER_ADDR"
echo $VERSIONCONTROLLER_ADDR > $GOSH_PATH/VersionController.addr

# ############################################################
# Upgrade SystemContract
# ############################################################

# Upgrade SystemContract from VersionController
echo "========== Set SystemContract code"
everdev contract run $VERSIONCONTROLLER_ABI setGoshCode --input "{\"code\": \"$SYSTEMCONTRACT_CODE\", \"version\": \"$GOSH_VERSION\"}" --network $NETWORK --signer $SIGNER --address $VERSIONCONTROLLER_ADDR > /dev/null || exit 1
echo "========== Deploy SystemContract"
everdev contract run $VERSIONCONTROLLER_ABI deployGosh --input "{\"version\": \"$GOSH_VERSION\"}" --network $NETWORK --signer $SIGNER --address $VERSIONCONTROLLER_ADDR > /dev/null || exit 1

# Get SystemContract address
echo "========== Get SystemContract address"
SYSTEMCONTRACT_ADDR=$(everdev contract run-local $VERSIONCONTROLLER_ABI getGoshAddr --input "{\"version\": \"$GOSH_VERSION\"}" --network $NETWORK --address $VERSIONCONTROLLER_ADDR | sed -nr 's/.*"value0":[[:space:]]+"(.*)"/\1/p')
echo "     ====> SystemContract address: $SYSTEMCONTRACT_ADDR"
echo $SYSTEMCONTRACT_ADDR > $GOSH_PATH/SystemContract-${GOSH_VERSION}.addr

# Send tokens to SystemContract
echo "     ====> Send tokens to SystemContract"
everdev contract run $GIVER_WALLET_ABI submitTransaction --input "{\"dest\": \"$SYSTEMCONTRACT_ADDR\", \"value\": $GOSH_BALANCE, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer $WALLET_SIGNER --address $GIVER_WALLET_ADDR > /dev/null || exit 1

# Set flag to false
echo "========== Run SystemContract setFlag (true)"
everdev contract run $SYSTEMCONTRACT_ABI setFlag --input "{\"flag\":\"true\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

# Run SystemContract setters
echo "========== Run SystemContract setters"
echo "     ====> Run setTokenRoot"
everdev contract run $SYSTEMCONTRACT_ABI setTokenRoot --input "{\"code\":\"$TOKEN_ROOT_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTokenWallet"
everdev contract run $SYSTEMCONTRACT_ABI setTokenWallet --input "{\"code\":\"$TOKEN_WALLET_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTokenLocker"
everdev contract run $SYSTEMCONTRACT_ABI setTokenLocker --input "{\"code\":\"$TOKEN_LOCKER_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSMVPlatform"
everdev contract run $SYSTEMCONTRACT_ABI setSMVPlatform --input "{\"code\":\"$LOCKER_PLATFORM_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSMVClient"
everdev contract run $SYSTEMCONTRACT_ABI setSMVClient --input "{\"code\":\"$SMV_CLIENT_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSMVProposal"
everdev contract run $SYSTEMCONTRACT_ABI setSMVProposal --input "{\"code\":\"$SMV_PROPOSAL_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setDiff"
everdev contract run $SYSTEMCONTRACT_ABI setDiff --input "{\"code\":\"$DIFF_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setRepository"
everdev contract run $SYSTEMCONTRACT_ABI setRepository --input "{\"code\":\"$REPO_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setCommit"
everdev contract run $SYSTEMCONTRACT_ABI setCommit --input "{\"code\":\"$COMMIT_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSnapshot"
everdev contract run $SYSTEMCONTRACT_ABI setSnapshot --input "{\"code\":\"$SNAPSHOT_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setWallet"
everdev contract run $SYSTEMCONTRACT_ABI setWallet --input "{\"code\":\"$WALLET_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setDao"
everdev contract run $SYSTEMCONTRACT_ABI setDao --input "{\"code\":\"$DAO_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTree"
everdev contract run $SYSTEMCONTRACT_ABI setTree --input "{\"code\":\"$TREE_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTag"
everdev contract run $SYSTEMCONTRACT_ABI setTag --input "{\"code\":\"$TAG_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setcontentSignature"
everdev contract run $SYSTEMCONTRACT_ABI setcontentSignature --input "{\"code\":\"$CONTENTSIG_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setProfile"
everdev contract run $SYSTEMCONTRACT_ABI setProfile --input "{\"code\": \"$PROFILE_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setProfileDao"
everdev contract run $SYSTEMCONTRACT_ABI setProfileDao --input "{\"code\": \"$PROFILEDAO_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

# Set flag to false
echo "========== Run SystemContract setFlag (false)"
everdev contract run $SYSTEMCONTRACT_ABI setFlag --input "{\"flag\":\"false\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1