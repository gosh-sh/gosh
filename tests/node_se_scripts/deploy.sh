#!/bin/bash
set -e

export NETWORK="${NETWORK:-http://172.16.0.62}"
#export NETWORK=http://172.16.0.62
SE_GIVER_ADDRESS="0:b5e9240fc2d2f1ff8cbb1d1dee7fb7cae155e5f6320e585fcc685698994a19a5"
SE_GIVER_ABI="../../tests/node_se_scripts/local_giver.abi.json"
SE_GIVER_KEYS="../../tests/node_se_scripts/local_giver.keys.json"
GIVER_VALUE=20000000000000000

echo "NETWORK=$NETWORK"

cd ../contracts/multisig

make generate-docker
export GIVER_ADDR=`cat Giver.addr`
echo "GIVER_ADDR = $GIVER_ADDR"


tonos-cli callx --abi $SE_GIVER_ABI --addr $SE_GIVER_ADDRESS --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $GIVER_ADDR

make deploy-docker


# deploy giver for upgrade

cd ../gosh

sed -i 's/SET_UPGRADE_PROPOSAL_START_AFTER  = 1 minutes/SET_UPGRADE_PROPOSAL_START_AFTER  = 1 seconds/' modifiers/modifiers.sol
proposal_period=$(cat modifiers/modifiers.sol | grep SET_UPGRADE_PROPOSAL_START_AFTER | cut -d '=' -f 2)
if [ $proposal_period != " 1 seconds;" ]; then
  echo "Failed to change proposal period"
  exit 1
fi

make build
make deploy-docker

sed -i 's/SET_UPGRADE_PROPOSAL_START_AFTER  = 1 seconds/SET_UPGRADE_PROPOSAL_START_AFTER  = 1 minutes/' modifiers/modifiers.sol

cd ../multisig

make generate-docker
export GIVER_ADDR=`cat Giver.addr`
echo "GIVER_ADDR = $GIVER_ADDR"

tonos-cli callx --abi $SE_GIVER_ABI --addr $SE_GIVER_ADDRESS --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $GIVER_ADDR

make deploy-docker

cd ../../tests
