#!/bin/bash
set -e
set -o pipefail
. ./util.sh

# $1 - workspace with v1_x. EX v1_x_workspace_1
# $2 - workspace with v2_x.
# $3 - workspace with v3_x. optional

set -x
echo "NETWORK=$NETWORK"

TESTS_PATH=$PWD

SE_GIVER_ADDRESS="0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415"
SE_GIVER_ABI="$TESTS_PATH/node_se_scripts/local_giver.abi.json"
SE_GIVER_KEYS="$TESTS_PATH/node_se_scripts/local_giver.keys.json"
GIVER_VALUE=20000000000000000

GOSH_PATH=../$2/contracts/gosh
OLD_GOSH_PATH=../$1/contracts/gosh
CUR_VERSION=$(grep -r 'string constant version' $OLD_GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
TEST_VERSION1=$(grep -r 'string constant version' $GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')

echo "export CUR_VERSION=$CUR_VERSION" >> env.env
echo "export TEST_VERSION1=$TEST_VERSION1" >> env.env

export VERSIONCONTROLLER_ADDR=`cat $OLD_GOSH_PATH/VersionController.addr`
VERSIONCONTROLLER_SEED=`cat $OLD_GOSH_PATH/gosh.seed | grep -o '".*"' | tr -d '"'`
export VERSIONCONTROLLER_SEED="$VERSIONCONTROLLER_SEED"


echo "Start upgrade tests set up"

###########   $2 version    ################

echo "Deploy giver for upgrade"
cd $GOSH_PATH/../multisig

echo "" > Giver.addr
echo "" > Giver.network
echo "" > Giver.seed

make generate-docker
export GIVER_ADDR=`cat Giver.addr`
echo "GIVER_ADDR = $GIVER_ADDR"
tonos-cli -u "$NETWORK" callx --abi $SE_GIVER_ABI --addr $SE_GIVER_ADDRESS --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $GIVER_ADDR

make deploy-docker

echo "Upgrade to test version $TEST_VERSION1"
cd ../gosh


echo > SystemContract-${TEST_VERSION1}.addr
make upgrade-docker

VERSIONCONTROLLER_ABI=versioncontroller.abi.json

SYSTEM_CONTRACT_ADDR_1=$(tonos-cli -u "$NETWORK" -j run $VERSIONCONTROLLER_ADDR getSystemContractAddr "{\"version\":\"$TEST_VERSION1\"}" --abi $VERSIONCONTROLLER_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "SYSTEM_CONTRACT_ADDR_1=$SYSTEM_CONTRACT_ADDR_1"

cd $TESTS_PATH
echo "export SYSTEM_CONTRACT_ADDR_1=$SYSTEM_CONTRACT_ADDR_1" >> env.env

tonos-cli -u "$NETWORK" runx --addr $SYSTEM_CONTRACT_ADDR_1 --abi $SYSTEM_CONTRACT_ABI -m getVersion

PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 1000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method get_upgrade_prop_id --abi-params \
  "{\"newversion\":\"$TEST_VERSION1\",\"description\":\"\"}"  --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "export PROP_ID1=\"$PROP_ID\"" >> env.env
echo "export SYSTEM_CONTRACT_ABI_1=../$2/contracts/gosh/systemcontract.abi.json" >> env.env
echo "export REPO_ABI_1=../$2/contracts/gosh/repository.abi.json" >> env.env
echo "export DAO_ABI_1=../$2/contracts/gosh/goshdao.abi.json" >> env.env
echo "export WALLET_ABI_1=../$2/contracts/gosh/goshwallet.abi.json" >> env.env


############ if set setup $3 version ############
if [ -n "$3" ]; then
  NEW_GOSH_PATH=../$3/contracts/gosh
  TEST_VERSION2=$(grep -r 'string constant version' $NEW_GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
  echo "export TEST_VERSION2=$TEST_VERSION2" >> env.env

  echo "Deploy giver for upgrade"
  cd $NEW_GOSH_PATH/../multisig

  echo "" > Giver.addr
  echo "" > Giver.network
  echo "" > Giver.seed

  make generate-docker
  export GIVER_ADDR=`cat Giver.addr`
  echo "GIVER_ADDR = $GIVER_ADDR"
  tonos-cli -u "$NETWORK" callx --abi $SE_GIVER_ABI --addr $SE_GIVER_ADDRESS --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $GIVER_ADDR

  make deploy-docker

  echo "Upgrade to test version $TEST_VERSION2"
  cd ../gosh


  echo > SystemContract-${TEST_VERSION2}.addr
  make upgrade-docker

  VERSIONCONTROLLER_ABI=versioncontroller.abi.json

  SYSTEM_CONTRACT_ADDR_2=$(tonos-cli -u "$NETWORK" -j run $VERSIONCONTROLLER_ADDR getSystemContractAddr "{\"version\":\"$TEST_VERSION2\"}" --abi $VERSIONCONTROLLER_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "SYSTEM_CONTRACT_ADDR_2=$SYSTEM_CONTRACT_ADDR_2"

  cd $TESTS_PATH
  echo "export SYSTEM_CONTRACT_ADDR_2=$SYSTEM_CONTRACT_ADDR_2" >> env.env

  tonos-cli -u "$NETWORK" runx --addr $SYSTEM_CONTRACT_ADDR_2 --abi $SYSTEM_CONTRACT_ABI -m getVersion

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 1000000 \
    --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method get_upgrade_prop_id --abi-params \
    "{\"newversion\":\"$TEST_VERSION2\",\"description\":\"\"}"  --decode-c6 | grep value0 \
    | sed -n '/value0/ p' | cut -d'"' -f 4)

  echo "export PROP_ID2=\"$PROP_ID\"" >> env.env
  echo "export SYSTEM_CONTRACT_ABI_2=../$3/contracts/gosh/systemcontract.abi.json" >> env.env
  echo "export REPO_ABI_2=../$3/contracts/gosh/repository.abi.json" >> env.env
  echo "export DAO_ABI_2=../$3/contracts/gosh/goshdao.abi.json" >> env.env
  echo "export WALLET_ABI_2=../$3/contracts/gosh/goshwallet.abi.json" >> env.env
fi

echo "SET UP SUCCEEDED"
