#!/bin/bash
set -e
set -o pipefail
set -x


FIRST_VERSION=v4_x
./node_se_scripts/deploy.sh $FIRST_VERSION
. set-vars.sh $FIRST_VERSION

. ./util.sh

DAO_NAME="gosh"

deploy_DAO

VC_ABI="../$FIRST_VERSION/contracts/gosh/versioncontroller.abi.json"
VC_ADDR=$(cat "../$FIRST_VERSION/contracts/gosh/VersionController.addr")
VC_SEED=$(cat "../$FIRST_VERSION/contracts/gosh/gosh.seed" | grep Seed | cut -d ':' -f 2)
echo "VC_ADDR=$VC_ADDR"
echo "VC_SEED=$VC_SEED"


CODE_HASH=$(tonos-cli -j account $VC_ADDR | jq '."'$VC_ADDR'".code_hash' | cut -d '"' -f 2)
echo "CODE_HASH=$CODE_HASH"

echo "***** start proposal *****"

code=$(tonos-cli -j decode stateinit --tvc ../v1_x/contracts/gosh/versioncontroller.tvc | jq .code | cut -d '"' -f 2)

tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForUpgradeVersionController \
  "{\"UpgradeCode\":\"$code\",\"cell\":\"\",\"comment\":\"\",\"num_clients\":1,\"reviewers\":[]}"
NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
echo "NOW_ARG=$NOW_ARG"

PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
      --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getCellForUpgradeVC --abi-params \
      "{\"UpgradeCode\":\"$code\",\"cell\":\"\",\"comment\":\"\",\"_now\":$NOW_ARG}" \
       --decode-c6 | grep value0 \
      | sed -n '/value0/ p' | cut -d'"' -f 4)

sleep 10

vote_for_proposal

sleep 60

CODE_HASH_NEW=$(tonos-cli -j account $VC_ADDR | jq '."'$VC_ADDR'".code_hash' | cut -d '"' -f 2)
echo "CODE_HASH=$CODE_HASH_NEW"

if [ "$CODE_HASH_NEW" == "$CODE_HASH" ]; then
  echo "Code hash did not change"
  exit 1
fi

echo "TEST SUCCEEDED"