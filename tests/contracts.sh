# generate keys
everdev signer g GoshRoot -f
# Script for deployment GoshRoot contract

export NETWORK=${1:-goshdev}
export SIGNER=${2:-GoshRoot}
export TVM_LINKER=/Users/nikolai/.everdev/solidity/tvm_linker

# WALLET
#    phrase: country dinosaur canvas sentence castle soda quantum stamp reason walnut palm flock
WALLET_ADDR="0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391"
WALLET_SIGNER="goshGiver"
WALLET_ABI="../SafeMultisigWallet.abi.json"

GOSH_PATH="../contracts/gosh"
SMV_PATH="../contracts/smv"
CREATOR_ABI="$GOSH_PATH/daocreator.abi.json"
GOSH_ABI="$GOSH_PATH/gosh.abi.json"



# Calculate GoshRoot and GoshDaoCreator addresses
ROOT_ADDR=$(everdev contract info $GOSH_ABI --signer $SIGNER --network $NETWORK | sed -nr 's/Address:[[:space:]]+(.*)[[:space:]]+\(.*/\1/p')
echo "========== GoshRoot address: '$ROOT_ADDR'"

CREATOR_ADDR=$(everdev contract info $CREATOR_ABI --signer $SIGNER --network $NETWORK | sed -nr 's/Address:[[:space:]]+(.*)[[:space:]]+\(.*/\1/p')
CREATOR_BALANCE=1000000000000000
echo "========== GoshDaoCreator address: '$CREATOR_ADDR'"


# ############################################################
# # Send tokens for deploy
# ############################################################
# GoshRoot
echo "========== Send 50 tons for deploy GoshRoot"
everdev contract run $WALLET_ABI submitTransaction --input "{\"dest\": \"$ROOT_ADDR\", \"value\": 50000000000, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer $WALLET_SIGNER --address $WALLET_ADDR > /dev/null || exit 1
# GoshDaoCreator
echo "========== Send $CREATOR_BALANCE  tons to GoshDaoCreator"
everdev contract run $WALLET_ABI submitTransaction --input "{\"dest\": \"$CREATOR_ADDR\", \"value\": $CREATOR_BALANCE, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}" --network $NETWORK --signer $WALLET_SIGNER --address $WALLET_ADDR > /dev/null || exit 1


# ############################################################
# # Deploy GoshRoot
# ############################################################
echo "========== Deploy GoshRoot contract"
everdev contract deploy $GOSH_ABI --input "{\"creator\": \"$CREATOR_ADDR\"}" --network $NETWORK --signer $SIGNER > /dev/null || exit 1

# Apply GoshRoot setters
echo "     ====> Run setTokenRoot"
TOKEN_ROOT_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/TokenRoot.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setTokenRoot --input "{\"code\":\"$TOKEN_ROOT_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTokenWallet"
TOKEN_WALLET_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/TokenWallet.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setTokenWallet --input "{\"code\":\"$TOKEN_WALLET_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTokenLocker"
TOKEN_LOCKER_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/SMVTokenLocker.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setTokenLocker --input "{\"code\":\"$TOKEN_LOCKER_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSMVPlatform"
LOCKER_PLATFORM_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/LockerPlatform.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setSMVPlatform --input "{\"code\":\"$LOCKER_PLATFORM_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSMVClient"
SMV_CLIENT_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/SMVClient.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setSMVClient --input "{\"code\":\"$SMV_CLIENT_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSMVProposal"
SMV_PROPOSAL_CODE=$($TVM_LINKER decode --tvc $SMV_PATH/SMVProposal.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setSMVProposal --input "{\"code\":\"$SMV_PROPOSAL_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setDiff"
DIFF_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/diff.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setDiff --input "{\"code\":\"$DIFF_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setRepository"
REPO_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/repository.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setRepository --input "{\"code\":\"$REPO_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setCommit"
COMMIT_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/commit.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setCommit --input "{\"code\":\"$COMMIT_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setSnapshot"
SNAPSHOT_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/snapshot.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setSnapshot --input "{\"code\":\"$SNAPSHOT_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setWallet"
WALLET_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/goshwallet.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setWallet --input "{\"code\":\"$WALLET_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setDao"
DAO_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/goshdao.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setDao --input "{\"code\":\"$DAO_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTree"
TREE_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/tree.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setTree --input "{\"code\":\"$TREE_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setTag"
TAG_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/tag.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setTag --input "{\"code\":\"$TAG_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1

echo "     ====> Run setcontentSignature"
CONTENTSIG_CODE=$($TVM_LINKER decode --tvc $GOSH_PATH/content-signature.tvc | sed -n '/code:/ s/ code: // p')
everdev contract run $GOSH_ABI setcontentSignature --input "{\"code\":\"$CONTENTSIG_CODE\"}" --address $ROOT_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1



# ############################################################
# # Deploy GoshDaoCreator
# ############################################################
echo "========== Deploy GoshDaoCreator contract"
everdev contract deploy $CREATOR_ABI "constructor" --input "{\"goshaddr\": \"$ROOT_ADDR\"}" --network $NETWORK --signer $SIGNER > /dev/null || exit 1
echo "     ====> Run setWalletCode"
everdev contract run $CREATOR_ABI setWalletCode --input "{\"code\":\"$WALLET_CODE\"}" --address $CREATOR_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1
echo "     ====> Run setDaoCode"
everdev contract run $CREATOR_ABI setDaoCode --input "{\"code\":\"$DAO_CODE\"}" --address $CREATOR_ADDR --signer $SIGNER --network $NETWORK > /dev/null || exit 1


echo "REACT_APP_GOSH_ADDR = " $ROOT_ADDR >> ../web/.env.development
echo "REACT_APP_CREATOR_ADDR = " $CREATOR_ADDR >> ../web/.env.development