#!/bin/bash
set -e
set -o pipefail
. /tmp/util.sh

### Set during docker run. See Makefile and README.
## -- empty --

# envs
GOSH_PATH="../../gosh"
SMV_PATH="$GOSH_PATH/smv"
VERSIONCONTROLLER_ABI="$GOSH_PATH/versioncontroller.abi.json"
SYSTEMCONTRACT_ABI="$GOSH_PATH/systemcontract.abi.json"
GOSH_REPO_ROOT_PATH=/opt/gosh/contracts

GOSH_BALANCE=400000000000000

GOSH_VERSION=$(grep -r 'string constant version' $GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
echo -e "> Gosh version:\t$GOSH_VERSION"
export GOSH_VERSION=$GOSH_VERSION

# Set network
NETWORK=`cat /tmp/Giver.network`
echo -e "> Network:\t$NETWORK"

# Prepare giver
GIVER_ABI="../../multisig/MultisigWallet.abi.json"
GIVER_ADDR=`cat /tmp/Giver.addr`
GIVER_SEED=`cat /tmp/Giver.seed`


# ############################################################
# Get codes
# ############################################################
SYSTEMCONTRACT_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/systemcontract.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TOKEN_ROOT_CODE=$(tonos-cli -j decode stateinit --tvc $SMV_PATH/TokenRoot.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TOKEN_WALLET_CODE=$(tonos-cli -j decode stateinit --tvc $SMV_PATH/TokenWallet.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TOKEN_LOCKER_CODE=$(tonos-cli -j decode stateinit --tvc $SMV_PATH/SMVTokenLocker.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
LOCKER_PLATFORM_CODE=$(tonos-cli -j decode stateinit --tvc $SMV_PATH/LockerPlatform.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
SMV_CLIENT_CODE=$(tonos-cli -j decode stateinit --tvc $SMV_PATH/SMVClient.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
SMV_PROPOSAL_CODE=$(tonos-cli -j decode stateinit --tvc $SMV_PATH/SMVProposal.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
DIFF_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/diff.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
REPO_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/repository.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
COMMIT_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/commit.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
SNAPSHOT_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/snapshot.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
WALLET_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/goshwallet.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
DAO_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/goshdao.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TREE_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/tree.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TAG_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/tag.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
CONTENTSIG_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/content-signature.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TASK_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/task.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
PROFILE_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/../profile.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
PROFILEINDEX_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/../profileindex.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
PROFILEDAO_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/../profiledao.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
DAO_TAG_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/daotag.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
HELP_TAG_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/taggosh.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TOPIC_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/topic.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
BIGTASK_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/bigtask.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
GRANT_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/grant.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
TAG_SUPPLY_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/tagsupply.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')

# Echo VersionController address
echo -e "> VersionController address:\t$VERSIONCONTROLLER_ADDR"

# Upgrade VersionController (this step is not necessary for each upgrade)
echo "> Upgrade VersionController code"
VERSIONCONTROLLER_CODE=$(tonos-cli -j decode stateinit --tvc $GOSH_PATH/versioncontroller.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
tonos-cli -u $NETWORK callx --abi $VERSIONCONTROLLER_ABI --addr $VERSIONCONTROLLER_ADDR --keys "$seed" -m updateCode "{\"newcode\": \"$VERSIONCONTROLLER_CODE\", \"cell\": \"\"}"
delay 40

# Apply VersionController setters
echo "> Run VersionController setters"
echo "> Run setSystemContractCode"
tonos-cli -u $NETWORK callx --abi $VERSIONCONTROLLER_ABI --addr $VERSIONCONTROLLER_ADDR --keys "$seed" -m setSystemContractCode "{\"code\": \"$SYSTEMCONTRACT_CODE\", \"version\": \"$GOSH_VERSION\"}"

# Deploy SystemContract
echo "> Deploy SystemContract"
tonos-cli -u $NETWORK callx --abi $VERSIONCONTROLLER_ABI --addr $VERSIONCONTROLLER_ADDR --keys "$seed" -m deploySystemContract "{\"version\": \"$GOSH_VERSION\"}"

# Get SystemContract address
echo "> Get SystemContract address"
SYSTEMCONTRACT_ADDR=$(tonos-cli -u $NETWORK -j runx --abi $VERSIONCONTROLLER_ABI --addr $VERSIONCONTROLLER_ADDR -m getSystemContractAddr "{\"version\": \"$GOSH_VERSION\"}" | sed -nr 's/.*"value0":[[:space:]]+"(.*)"/\1/p')
echo -e "> SystemContract address:\t$SYSTEMCONTRACT_ADDR"
echo $SYSTEMCONTRACT_ADDR > $GOSH_PATH/SystemContract-${GOSH_VERSION}.addr

echo "> Awaiting SystemContract deploy"
wait_account_active $SYSTEMCONTRACT_ADDR

# Send tokens to SystemContract
echo "> Send tokens to SystemContract"
tonos-cli -u $NETWORK callx --abi $GIVER_ABI --addr $GIVER_ADDR --keys "$GIVER_SEED" -m submitTransaction "{\"dest\": \"$SYSTEMCONTRACT_ADDR\", \"value\": $GOSH_BALANCE, \"bounce\": false, \"allBalance\": false, \"payload\": \"\"}"

# Set flag to true (enable code setters)
echo "> Run SystemContract setFlag (true)"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setFlag "{\"flag\":\"true\"}"

# Run SystemContract setters
echo "> Run SystemContract setters"
echo "> Run setTokenRoot"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setTokenRoot "{\"code\":\"$TOKEN_ROOT_CODE\"}"
echo "> Run setTokenWallet"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setTokenWallet "{\"code\":\"$TOKEN_WALLET_CODE\"}"
echo "> Run setTokenLocker"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setTokenLocker "{\"code\":\"$TOKEN_LOCKER_CODE\"}"
echo "> Run setSMVPlatform"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setSMVPlatform "{\"code\":\"$LOCKER_PLATFORM_CODE\"}"
echo "> Run setSMVClient"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setSMVClient "{\"code\":\"$SMV_CLIENT_CODE\"}"
echo "> Run setSMVProposal"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setSMVProposal "{\"code\":\"$SMV_PROPOSAL_CODE\"}"
echo "> Run setDiff"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setDiff "{\"code\":\"$DIFF_CODE\"}"
echo "> Run setRepository"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setRepository "{\"code\":\"$REPO_CODE\"}"
echo "> Run setCommit"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setCommit "{\"code\":\"$COMMIT_CODE\"}"
echo "> Run setSnapshot"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setSnapshot "{\"code\":\"$SNAPSHOT_CODE\"}"
echo "> Run setcontentSignature"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setcontentSignature "{\"code\":\"$CONTENTSIG_CODE\"}"
echo "> Run setWallet"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setWallet "{\"code\":\"$WALLET_CODE\"}"
echo "> Run setDao"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setDao "{\"code\":\"$DAO_CODE\"}"
echo "> Run setTree"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setTree "{\"code\":\"$TREE_CODE\"}"
echo "> Run setTag"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setTag "{\"code\":\"$TAG_CODE\"}"
echo "> Run setTask"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setTask "{\"code\":\"$TASK_CODE\"}"
echo "> Run setDaoTag"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setDaoTag "{\"code\":\"$DAO_TAG_CODE\"}"
echo "> Run setHelpTag"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setHelpTag "{\"code\":\"$HELP_TAG_CODE\"}"
echo "> Run setTopic"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setTopic "{\"code\":\"$TOPIC_CODE\"}"
echo "> Run setBigTask"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setBigTask "{\"code\":\"$BIGTASK_CODE\"}"
echo "> Run setGrant"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setGrant "{\"code\":\"$GRANT_CODE\"}"
echo "> Run setTagSupplyTask"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setTagSupplyTask "{\"code\":\"$TAG_SUPPLY_CODE\"}"

# Set flag to false (disable code setters)
echo "> Run SystemContract setFlag (false)"
tonos-cli -u $NETWORK callx --abi $SYSTEMCONTRACT_ABI --addr $SYSTEMCONTRACT_ADDR --keys "$seed" -m setFlag "{\"flag\":\"false\"}"

# Destroy giver
echo "> Destroy giver"
tonos-cli -u $NETWORK callx --abi $GIVER_ABI --addr $GIVER_ADDR --keys "$GIVER_SEED" -m TheBigBang "{\"returnMoney\": \"$SYSTEMCONTRACT_ADDR\"}"
