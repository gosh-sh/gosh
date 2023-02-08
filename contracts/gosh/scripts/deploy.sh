#!/bin/bash
set -e
set -o pipefail
. /tmp/util.sh

### Set during docker run. See Makefile and README.
## -- empty --

### Set during docker run. See Makefile and README.
## -- empty --

# envs
SIGNER="__gosh" # will be created automatically
GIVER_SIGNER="__giver" # will be created automatically
GOSH_PATH="../../gosh"
SMV_PATH="../../smv"
VERSIONCONTROLLER_ABI="$GOSH_PATH/versioncontroller.abi.json"
SYSTEMCONTRACT_ABI="$GOSH_PATH/systemcontract.abi.json"
GOSH_REPO_ROOT_PATH=/opt/gosh/contracts

GOSH_BALANCE=400000000000000

GOSH_VERSION=$(grep -r 'string constant version' $GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
echo "========== Gosh version: $GOSH_VERSION"
export GOSH_VERSION=$GOSH_VERSION

# Set network
NETWORK=`cat /tmp/Giver.network`
everdev network add $NETWORK $NETWORK
echo "========== Network: $NETWORK"

# Generate keys
echo "========== Generate keys for VersionController"
tonos-cli genphrase > $GOSH_PATH/$VERSIONCONTROLLER_SEED_FILE_OUT
seed=`cat $GOSH_PATH/$VERSIONCONTROLLER_SEED_FILE_OUT| grep -o '".*"' | tr -d '"'`
everdev signer add $SIGNER "$seed"

# Prepare giver
GIVER_ABI="../../multisig/MultisigWallet.abi.json"
GIVER_ADDR=`cat /tmp/Giver.addr`
GIVER_SEED=`cat /tmp/Giver.seed`
everdev signer add $GIVER_SIGNER "$GIVER_SEED"


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
PROFILEINDEX_CODE=$(everdev contract dt $GOSH_PATH/profileindex.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
PROFILEDAO_CODE=$(everdev contract dt $GOSH_PATH/profiledao.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')


# ############################################################
# Calculate VersionController address
# ############################################################
VERSIONCONTROLLER_ADDR=$(everdev contract info $VERSIONCONTROLLER_ABI --signer $SIGNER --network $NETWORK | sed -nr 's/Address:[[:space:]]+(.*)[[:space:]]+\(.*/\1/p')
echo "========== VersionController address: $VERSIONCONTROLLER_ADDR"
echo $VERSIONCONTROLLER_ADDR > $GOSH_PATH/VersionController.addr

# ############################################################
# Deploy VersionController and SystemContract
# ############################################################
# Send tokens for deploy VersionController
echo "========== Send 2000 tons for deploy VersionController"
everdev contract run $GIVER_ABI submitTransaction --input "{\"dest\": \"$VERSIONCONTROLLER_ADDR\", \"value\": 2000000000000, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer $GIVER_SIGNER --address $GIVER_ADDR > /dev/null || exit 1

delay 40

# Deploy VersionController
echo "========== Deploy VersionController"
everdev contract deploy $VERSIONCONTROLLER_ABI --input "" --network $NETWORK --signer $SIGNER > /dev/null || exit 1

echo "***** awaiting VersionController deploy *****"
wait_account_active $VERSIONCONTROLLER_ADDR

# Apply VersionController setters
echo "========== Run VersionController setters"
echo "     ====> Run setSystemContractCode"
everdev contract run $VERSIONCONTROLLER_ABI setSystemContractCode --input "{\"code\": \"$SYSTEMCONTRACT_CODE\", \"version\": \"$GOSH_VERSION\"}" --network $NETWORK --signer $SIGNER --address $VERSIONCONTROLLER_ADDR > /dev/null || exit 1
echo "     ====> Run setProfile"
everdev contract run $VERSIONCONTROLLER_ABI setProfile --input "{\"code\": \"$PROFILE_CODE\"}" --address $VERSIONCONTROLLER_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1
echo "     ====> Run setProfileIndex"
everdev contract run $VERSIONCONTROLLER_ABI setProfileIndex --input "{\"code\": \"$PROFILEINDEX_CODE\"}" --address $VERSIONCONTROLLER_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1
echo "     ====> Run setProfileDao"
everdev contract run $VERSIONCONTROLLER_ABI setProfileDao --input "{\"code\": \"$PROFILEDAO_CODE\"}" --address $VERSIONCONTROLLER_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

# Deploy SystemContract
echo "========== Deploy SystemContract"
everdev contract run $VERSIONCONTROLLER_ABI deploySystemContract --input "{\"version\": \"$GOSH_VERSION\"}" --network $NETWORK --signer $SIGNER --address $VERSIONCONTROLLER_ADDR > /dev/null || exit 1

# Get SystemContract address
echo "========== Get SystemContract address"
SYSTEMCONTRACT_ADDR=$(everdev contract run-local $VERSIONCONTROLLER_ABI getSystemContractAddr --input "{\"version\": \"$GOSH_VERSION\"}" --network $NETWORK --address $VERSIONCONTROLLER_ADDR | sed -nr 's/.*"value0":[[:space:]]+"(.*)"/\1/p')
echo "     ====> SystemContract address: $SYSTEMCONTRACT_ADDR"

echo "***** awaiting SystemContract deploy *****"
wait_account_active $SYSTEMCONTRACT_ADDR

echo $SYSTEMCONTRACT_ADDR > $GOSH_PATH/SystemContract.addr
echo $SYSTEMCONTRACT_ADDR > $GOSH_PATH/SystemContract-${GOSH_VERSION}.addr

# Send tokens to SystemContract
echo "     ====> Send tokens to SystemContract"
everdev contract run $GIVER_ABI submitTransaction --input "{\"dest\": \"$SYSTEMCONTRACT_ADDR\", \"value\": $GOSH_BALANCE, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer $GIVER_SIGNER --address $GIVER_ADDR > /dev/null || exit 1

# Set flag to true (enable code setters)
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
echo "     ====> Run setcontentSignature"
everdev contract run $SYSTEMCONTRACT_ABI setcontentSignature --input "{\"code\":\"$CONTENTSIG_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1
echo "     ====> Run setWallet"
everdev contract run $SYSTEMCONTRACT_ABI setWallet --input "{\"code\":\"$WALLET_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1
echo "     ====> Run setDao"
everdev contract run $SYSTEMCONTRACT_ABI setDao --input "{\"code\":\"$DAO_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1
echo "     ====> Run setTree"
everdev contract run $SYSTEMCONTRACT_ABI setTree --input "{\"code\":\"$TREE_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1
echo "     ====> Run setTag"
everdev contract run $SYSTEMCONTRACT_ABI setTag --input "{\"code\":\"$TAG_CODE\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

# Set flag to false (disable code setters)
echo "========== Run SystemContract setFlag (false)"
everdev contract run $SYSTEMCONTRACT_ABI setFlag --input "{\"flag\":\"false\"}" --address $SYSTEMCONTRACT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

# Destroy giver
everdev contract run $GIVER_ABI TheBigBang -i "{\"returnMoney\": \"$SYSTEMCONTRACT_ADDR\"}" -a $GIVER_ADDR -s $GIVER_SIGNER -n $NETWORK > /dev/null || exit 1
