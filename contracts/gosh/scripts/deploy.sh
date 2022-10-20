# Script for deployment GoshRoot contracts

#!/bin/bash
set -e
set -o pipefail

### Set during docker run. See Makefile and README.
#NETWORK
#GIVER_WALLET_ADDR

echo $NETWORK
echo $GIVER_WALLET_ADDR

# envs
SIGNER="GOSHRootSigner" # will be created automatically
WALLET_SIGNER="GiverWalletSigner" # will be created automatically
GOSH_PATH="../../gosh"
SMV_PATH="../../smv"
GOSHROOT_ABI="$GOSH_PATH/root.abi.json"
GOSH_ABI="$GOSH_PATH/gosh.abi.json"
GOSH_REPO_ROOT_PATH=/opt/gosh/contracts
GIVER_WALLET_KEYS_PATH=/tmp/giver.keys.json

GOSH_BALANCE=400000000000000

GOSH_VERSION=$(grep -r 'string constant version' $GOSH_PATH/gosh.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
echo $GOSH_VERSION

# Generate GOSH keys
echo "========== Generate keys for GoshRoot"
tonos-cli genphrase > $GOSH_PATH/$GOSH_ROOT_SEED_FILE_OUT
seed=`cat $GOSH_PATH/$GOSH_ROOT_SEED_FILE_OUT| grep -o '".*"' | tr -d '"'`
everdev signer add $SIGNER "$seed"

everdev network add $NETWORK $NETWORK

# Prepare GIVER_WALLET
curl https://raw.githubusercontent.com/tonlabs/ton-labs-contracts/master/solidity/safemultisig/SafeMultisigWallet.abi.json -O -s
GIVER_WALLET_ABI="./SafeMultisigWallet.abi.json"
everdev signer add $WALLET_SIGNER $GIVER_WALLET_KEYS_PATH


# ############################################################
# Get codes
# ############################################################
GOSH_CODE=$(everdev contract dt $GOSH_PATH/gosh.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
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
# Calculate GoshRoot address
# ############################################################
GOSHROOT_ADDR=$(everdev contract info $GOSHROOT_ABI --signer $SIGNER --network $NETWORK | sed -nr 's/Address:[[:space:]]+(.*)[[:space:]]+\(.*/\1/p')
echo "========== GoshRoot address: $GOSHROOT_ADDR"
echo $GOSHROOT_ADDR > $GOSH_PATH/GoshRoot.addr

# ############################################################
# Deploy GoshRoot and Gosh
# ############################################################
# Send tokens for deploy GoshRoot
echo "========== Send 2000 tons for deploy GoshRoot"
everdev contract run $GIVER_WALLET_ABI submitTransaction --input "{\"dest\": \"$GOSHROOT_ADDR\", \"value\": 2000000000000, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer $WALLET_SIGNER --address $GIVER_WALLET_ADDR > /dev/null || exit 1

# Deploy GoshRoot
echo "========== Deploy GoshRoot"
everdev contract deploy $GOSHROOT_ABI --input "" --network $NETWORK --signer $SIGNER > /dev/null || exit 1

# Deploy Gosh from GoshRoot
echo "========== Set Gosh code"
everdev contract run $GOSHROOT_ABI setGoshCode --input "{\"code\": \"$GOSH_CODE\", \"version\": \"$GOSH_VERSION\"}" --network $NETWORK --signer $SIGNER --address $GOSHROOT_ADDR > /dev/null || exit 1
echo "========== Deploy Gosh"
everdev contract run $GOSHROOT_ABI deployGosh --input "{\"version\": \"$GOSH_VERSION\"}" --network $NETWORK --signer $SIGNER --address $GOSHROOT_ADDR > /dev/null || exit 1

# Get Gosh address
echo "========== Get Gosh address"
GOSH_ADDR=$(everdev contract run-local $GOSHROOT_ABI getGoshAddr --input "{\"version\": \"$GOSH_VERSION\"}" --network $NETWORK --address $GOSHROOT_ADDR | sed -nr 's/.*"value0":[[:space:]]+"(.*)"/\1/p')
echo "     ====> Gosh address: $GOSH_ADDR"
echo $GOSH_ADDR > $GOSH_PATH/Gosh-${GOSH_VERSION}.addr

# Send tokens to Gosh
echo "     ====> Send tokens to Gosh"
everdev contract run $GIVER_WALLET_ABI submitTransaction --input "{\"dest\": \"$GOSH_ADDR\", \"value\": $GOSH_BALANCE, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer $WALLET_SIGNER --address $GIVER_WALLET_ADDR > /dev/null || exit 1

# Set flag to false
echo "========== Run Gosh setFlag (true)"
everdev contract run $GOSH_ABI setFlag --input "{\"flag\":\"true\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

# Run Gosh setters
echo "========== Run Gosh setters"
echo "     ====> Run setTokenRoot"
everdev contract run $GOSH_ABI setTokenRoot --input "{\"code\":\"$TOKEN_ROOT_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTokenWallet"
everdev contract run $GOSH_ABI setTokenWallet --input "{\"code\":\"$TOKEN_WALLET_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTokenLocker"
everdev contract run $GOSH_ABI setTokenLocker --input "{\"code\":\"$TOKEN_LOCKER_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSMVPlatform"
everdev contract run $GOSH_ABI setSMVPlatform --input "{\"code\":\"$LOCKER_PLATFORM_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSMVClient"
everdev contract run $GOSH_ABI setSMVClient --input "{\"code\":\"$SMV_CLIENT_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSMVProposal"
everdev contract run $GOSH_ABI setSMVProposal --input "{\"code\":\"$SMV_PROPOSAL_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setDiff"
everdev contract run $GOSH_ABI setDiff --input "{\"code\":\"$DIFF_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setRepository"
everdev contract run $GOSH_ABI setRepository --input "{\"code\":\"$REPO_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setCommit"
everdev contract run $GOSH_ABI setCommit --input "{\"code\":\"$COMMIT_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSnapshot"
everdev contract run $GOSH_ABI setSnapshot --input "{\"code\":\"$SNAPSHOT_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setWallet"
everdev contract run $GOSH_ABI setWallet --input "{\"code\":\"$WALLET_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setDao"
everdev contract run $GOSH_ABI setDao --input "{\"code\":\"$DAO_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTree"
everdev contract run $GOSH_ABI setTree --input "{\"code\":\"$TREE_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTag"
everdev contract run $GOSH_ABI setTag --input "{\"code\":\"$TAG_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setcontentSignature"
everdev contract run $GOSH_ABI setcontentSignature --input "{\"code\":\"$CONTENTSIG_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setProfile"
everdev contract run $GOSH_ABI setProfile --input "{\"code\": \"$PROFILE_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setProfileDao"
everdev contract run $GOSH_ABI setProfileDao --input "{\"code\": \"$PROFILEDAO_CODE\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

# Set flag to false
echo "========== Run Gosh setFlag (false)"
everdev contract run $GOSH_ABI setFlag --input "{\"flag\":\"false\"}" --address $GOSH_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1