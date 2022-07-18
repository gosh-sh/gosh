#!/bin/bash
set -e

# Script for deployment GoshRoot contract
# Need to run from GOSH repo root folder

# Docker envs
# GIVER_WALLET_ADDR
# NETWORK
# GOSH_ROOT_SEED_FILE_OUT
#EVERDEV_VERSION=latest
#EVERDEV_SOL_COMPILER_VERSION=latest
#EVERDEV_TVM_LINKER_VERSION=latest
#EVERDEV_TONOS_CLI_VERSION=latest
GOSH_REPO_ROOT_PATH=/opt/gosh
GIVER_WALLET_KEYS_PATH=/tmp/giver.keys.json

# Script envs
GOSH_PATH="./contracts/gosh"
SMV_PATH="./contracts/smv"
CREATOR_ABI="$GOSH_PATH/daocreator.abi.json"
GOSH_ABI="$GOSH_PATH/gosh.abi.json"

# Pre-requirements
cd $GOSH_REPO_ROOT_PATH
apt-get -qq update -y > /dev/null
apt-get -qq install make curl -y > /dev/null

# Install required packages
echo "========== Run everdev installation"
npm i -g everdev@$EVERDEV_VERSION

everdev sol set --compiler $EVERDEV_SOL_COMPILER_VERSION
everdev sol set --linker $EVERDEV_TVM_LINKER_VERSION
everdev tonos-cli set --version $EVERDEV_TONOS_CLI_VERSION
everdev network add $NETWORK $NETWORK

# Generate GOSH keys
tonos-cli genphrase > $GOSH_ROOT_SEED_FILE_OUT
seed=`cat $GOSH_ROOT_SEED_FILE_OUT| grep -o '".*"' | tr -d '"'`
everdev signer add GOSHRootSigner "$seed"

# Contracts compilation
echo "========== Run contracts compilation"
cd $SMV_PATH && bash ./compile_really_all.sh || true
cd ../../
cd $GOSH_PATH
make build
cd ../../

# Prepare GIVER_WALLET
curl https://raw.githubusercontent.com/tonlabs/ton-labs-contracts/master/solidity/safemultisig/SafeMultisigWallet.abi.json -O -s
GIVER_WALLET_ABI="./SafeMultisigWallet.abi.json"
everdev signer add GiverWalletSigner $GIVER_WALLET_KEYS_PATH

# Calculate GoshRoot and GoshDaoCreator addresses
GOSH_ROOT_ADDR=$(everdev contract info $GOSH_ABI --signer GOSHRootSigner --network $NETWORK | sed -nr 's/Address:[[:space:]]+(.*)[[:space:]]+\(.*/\1/p')
echo "========== GoshRoot address: '$GOSH_ROOT_ADDR'"
echo $GOSH_ROOT_ADDR > GoshRoot.addr

CREATOR_ADDR=$(everdev contract info $CREATOR_ABI --signer GOSHRootSigner --network $NETWORK | sed -nr 's/Address:[[:space:]]+(.*)[[:space:]]+\(.*/\1/p')
CREATOR_BALANCE=400000000000000
echo "========== GoshDaoCreator address: '$CREATOR_ADDR'"
echo $CREATOR_ADDR > GoshDaoCreator.addr

# Send some tokens to GoshRoot for deploy
echo "========== Send 50 tons for deploy"
everdev contract run $GIVER_WALLET_ABI submitTransaction --input "{\"dest\": \"$GOSH_ROOT_ADDR\", \"value\": 50000000000, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer GiverWalletSigner --address $GIVER_WALLET_ADDR > /dev/null || exit 1

# Deploy GoshRoot
echo "========== Deploy GoshRoot contract"
everdev contract deploy $GOSH_ABI --input "{\"creator\": \"$CREATOR_ADDR\"}" --network $NETWORK --signer GOSHRootSigner > /dev/null || exit 1

# Apply GoshRoot setters
echo "========== Run setTokenRoot"
TOKEN_ROOT_CODE=$(everdev contract dt $SMV_PATH/TokenRoot.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setTokenRoot --input "{\"code\":\"$TOKEN_ROOT_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setTokenWallet"
TOKEN_WALLET_CODE=$(everdev contract dt $SMV_PATH/TokenWallet.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setTokenWallet --input "{\"code\":\"$TOKEN_WALLET_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setTokenLocker"
TOKEN_LOCKER_CODE=$(everdev contract dt $SMV_PATH/SMVTokenLocker.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setTokenLocker --input "{\"code\":\"$TOKEN_LOCKER_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setSMVPlatform"
LOCKER_PLATFORM_CODE=$(everdev contract dt $SMV_PATH/LockerPlatform.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setSMVPlatform --input "{\"code\":\"$LOCKER_PLATFORM_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setSMVClient"
SMV_CLIENT_CODE=$(everdev contract dt $SMV_PATH/SMVClient.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setSMVClient --input "{\"code\":\"$SMV_CLIENT_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setSMVProposal"
SMV_PROPOSAL_CODE=$(everdev contract dt $SMV_PATH/SMVProposal.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setSMVProposal --input "{\"code\":\"$SMV_PROPOSAL_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setDiff"
DIFF_CODE=$(everdev contract dt $GOSH_PATH/diff.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setDiff --input "{\"code\":\"$DIFF_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setRepository"
REPO_CODE=$(everdev contract dt $GOSH_PATH/repository.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setRepository --input "{\"code\":\"$REPO_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setCommit"
COMMIT_CODE=$(everdev contract dt $GOSH_PATH/commit.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setCommit --input "{\"code\":\"$COMMIT_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setSnapshot"
SNAPSHOT_CODE=$(everdev contract dt $GOSH_PATH/snapshot.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setSnapshot --input "{\"code\":\"$SNAPSHOT_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setWallet"
WALLET_CODE=$(everdev contract dt $GOSH_PATH/goshwallet.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setWallet --input "{\"code\":\"$WALLET_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setDao"
DAO_CODE=$(everdev contract dt $GOSH_PATH/goshdao.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setDao --input "{\"code\":\"$DAO_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setTree"
TREE_CODE=$(everdev contract dt $GOSH_PATH/tree.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setTree --input "{\"code\":\"$TREE_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1

echo "========== Run setTag"
TAG_CODE=$(everdev contract dt $GOSH_PATH/tag.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
everdev contract run $GOSH_ABI setTag --input "{\"code\":\"$TAG_CODE\"}" --address $GOSH_ROOT_ADDR --signer GOSHRootSigner --network $NETWORK > /dev/null || exit 1


# Send tokens to GoshDaoCreator and deploy
echo "========== Send $CREATOR_BALANCE tons to GoshDaoCreator"
everdev contract run $GIVER_WALLET_ABI submitTransaction --input "{\"dest\": \"$CREATOR_ADDR\", \"value\": $CREATOR_BALANCE, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer GiverWalletSigner --address $GIVER_WALLET_ADDR > /dev/null || exit 1

# Deploy GoshDaoCreator
echo "========== Deploy GoshDaoCreator contract"
everdev contract deploy $CREATOR_ABI "constructor" --input "{\"goshaddr\": \"$GOSH_ROOT_ADDR\", \"WalletCode\": \"$WALLET_CODE\", \"codeDao\": \"$DAO_CODE\"}" --network $NETWORK --signer GOSHRootSigner > /dev/null || exit 1