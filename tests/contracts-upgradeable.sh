# generate keys
everdev signer g GoshRoot -f			   							
# Script for deployment GoshRoot contract

export NETWORK=${1:-goshdev}
export SIGNER=${2:-GoshRoot}
export TVM_LINKER=~/.everdev/solidity/tvm_linker

# WALLET
#    phrase: country dinosaur canvas sentence castle soda quantum stamp reason walnut palm flock
WALLET_ADDR="0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391"
WALLET_SIGNER="goshGiver"
WALLET_ABI="../SafeMultisigWallet.abi.json"

GOSH_PATH="../contracts/gosh"
SMV_PATH="../contracts/smv"
GOSHROOT_ABI="$GOSH_PATH/root.abi.json"
GOSH_ABI="$GOSH_PATH/gosh.abi.json"

GOSH_VERSION="0.11.0"
GOSH_BALANCE=400000000000000


# ############################################################
# Get codes
# ############################################################
GOSH_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/gosh.tvc | sed -n '/code:/ s/ code: // p')
TOKEN_ROOT_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/TokenRoot.tvc | sed -n '/code:/ s/ code: // p')
TOKEN_WALLET_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/TokenWallet.tvc | sed -n '/code:/ s/ code: // p')
TOKEN_LOCKER_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/SMVTokenLocker.tvc | sed -n '/code:/ s/ code: // p')
LOCKER_PLATFORM_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/LockerPlatform.tvc | sed -n '/code:/ s/ code: // p')
SMV_CLIENT_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/SMVClient.tvc | sed -n '/code:/ s/ code: // p')
SMV_PROPOSAL_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/SMVProposal.tvc | sed -n '/code:/ s/ code: // p')
DIFF_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/diff.tvc | sed -n '/code:/ s/ code: // p')
REPO_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/repository.tvc | sed -n '/code:/ s/ code: // p')
COMMIT_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/commit.tvc | sed -n '/code:/ s/ code: // p')
SNAPSHOT_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/snapshot.tvc | sed -n '/code:/ s/ code: // p')
WALLET_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/goshwallet.tvc | sed -n '/code:/ s/ code: // p')
DAO_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/goshdao.tvc | sed -n '/code:/ s/ code: // p')
TREE_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/tree.tvc | sed -n '/code:/ s/ code: // p')
TAG_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/tag.tvc | sed -n '/code:/ s/ code: // p')
CONTENTSIG_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/content-signature.tvc | sed -n '/code:/ s/ code: // p')
PROFILE_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/profile.tvc | sed -n '/code:/ s/ code: // p')
PROFILEDAO_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/profiledao.tvc | sed -n '/code:/ s/ code: // p')


# ############################################################
# Calculate GoshRoot address
# ############################################################
GOSHROOT_ADDR=$(everdev contract info $GOSHROOT_ABI --signer $SIGNER --network $NETWORK | sed -nr 's/Address:[[:space:]]+(.*)[[:space:]]+\(.*/\1/p')
echo "========== GoshRoot address: $GOSHROOT_ADDR"


# ############################################################
# Deploy GoshRoot and Gosh
# ############################################################
# Send tokens for deploy GoshRoot
echo "========== Send 2000 tons for deploy GoshRoot"
everdev contract run $WALLET_ABI submitTransaction --input "{\"dest\": \"$GOSHROOT_ADDR\", \"value\": 2000000000000, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer $WALLET_SIGNER --address $WALLET_ADDR > /dev/null || exit 1

# Deploy GoshRoot
echo "========== Deploy GoshRoot"
everdev contract deploy $GOSHROOT_ABI --input "" --network $NETWORK --signer $SIGNER > /dev/null || exit 1

# Deploy Gosh from GoshRoot
echo "========== Set Gosh code"
everdev contract run $GOSHROOT_ABI setGoshCode --input "{\"code\": \"$GOSH_CODE\", \"version\": \"$GOSH_VERSION\"}" --network $NETWORK --signer $SIGNER --address $GOSHROOT_ADDR > /dev/null || exit 1
echo "========== Deploy Gosh"
everdev contract run $GOSHROOT_ABI deployGosh --input "{\"version\": \"$GOSH_VERSION\"}" --network $NETWORK --signer $SIGNER --address $GOSHROOT_ADDR > /dev/null || exit 1

# Get Gosh addressf
echo "========== Get Gosh address"
GOSH_ADDR=$(everdev contract run-local $GOSHROOT_ABI getGoshAddr --input "{\"version\": \"$GOSH_VERSION\"}" --network $NETWORK --address $GOSHROOT_ADDR | sed -nr 's/.*"value0":[[:space:]]+"(.*)"/\1/p')
echo "     ====> Gosh address: $GOSH_ADDR"

# Send tokens to Gosh
echo "     ====> Send tokens to Gosh"
everdev contract run $WALLET_ABI submitTransaction --input "{\"dest\": \"$GOSH_ADDR\", \"value\": $GOSH_BALANCE, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer $WALLET_SIGNER --address $WALLET_ADDR > /dev/null || exit 1

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

echo "REACT_APP_GOSH_ROOTADDR = " $GOSHROOT_ADDR >> ../web/.env.development
echo "REACT_APP_GOSH = {\"$GOSH_VERSION\":  \"$GOSH_ADDR\" }" >> ../web/.env.development
