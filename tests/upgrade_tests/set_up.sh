#!/bin/bash
set -e
set -o pipefail
. ./util.sh

set -x
TESTS_PATH=$PWD
GOSH_PATH=../v2_x/contracts/gosh
OLD_GOSH_PATH=../v1_x/contracts/gosh
CUR_VERSION=$(grep -r 'string constant version' $OLD_GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
TEST_VERSION1=$(grep -r 'string constant version' $GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
TEST_VERSION2=9999.0.0

echo "export CUR_VERSION=$CUR_VERSION" >> env.env
echo "export TEST_VERSION1=$TEST_VERSION1" >> env.env
echo "export TEST_VERSION2=9999.0.0" >> env.env

export NETWORK="${NETWORK:-http://192.168.31.227}"
echo "NETWORK=$NETWORK"

SE_GIVER_ADDRESS="0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415"
SE_GIVER_ABI="$TESTS_PATH/node_se_scripts/local_giver.abi.json"
SE_GIVER_KEYS="$TESTS_PATH/node_se_scripts/local_giver.keys.json"
GIVER_VALUE=20000000000000000

export VERSIONCONTROLLER_ADDR=`cat $OLD_GOSH_PATH/VersionController.addr`
VERSIONCONTROLLER_SEED=`cat $OLD_GOSH_PATH/gosh.seed | grep -o '".*"' | tr -d '"'`
export VERSIONCONTROLLER_SEED="$VERSIONCONTROLLER_SEED"

### TODO: script is now configured to work with Node SE. Mb add variants for other networks
echo "Start upgrade tests set up"

echo "Deploy giver for upgrade"
cd $GOSH_PATH/../multisig

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

PROP_ID=$(tvm_linker test node_se_scripts/prop_id_gen --gas-limit 1000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method get_upgrade_prop_id --abi-params \
  "{\"newversion\":\"$TEST_VERSION1\",\"description\":\"\"}"  --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "export PROP_ID1=\"$PROP_ID\"" >> env.env


echo "Deploy giver for upgrade"
cd $GOSH_PATH/../multisig
make generate-docker
export GIVER_ADDR=`cat Giver.addr`
echo "GIVER_ADDR = $GIVER_ADDR"
tonos-cli -u "$NETWORK" callx --abi $SE_GIVER_ABI --addr $SE_GIVER_ADDRESS --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $GIVER_ADDR

make deploy-docker

echo "Upgrade to test version $TEST_VERSION2"
cd ../gosh

sed -i "s/version = \"$TEST_VERSION1/version = \"$TEST_VERSION2/" *.sol

CHECK_VERSION=$(grep -r 'string constant version' systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
if [ $CHECK_VERSION != $TEST_VERSION2 ]; then
  echo "Failed to change contract version"
  exit 1
fi

make build

echo > SystemContract-${TEST_VERSION2}.addr
make upgrade-docker

sed -i "s/version = \"$TEST_VERSION2/version = \"$TEST_VERSION1/" *.sol
make build

SYSTEM_CONTRACT_ADDR_2=$(tonos-cli -u "$NETWORK" -j run $VERSIONCONTROLLER_ADDR getSystemContractAddr "{\"version\":\"$TEST_VERSION2\"}" --abi $VERSIONCONTROLLER_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "SYSTEM_CONTRACT_ADDR_2=$SYSTEM_CONTRACT_ADDR_2"

cd $TESTS_PATH
echo "export SYSTEM_CONTRACT_ADDR_2=$SYSTEM_CONTRACT_ADDR_2" >> env.env

echo "export SYSTEM_CONTRACT_ABI_1=../v2_x/contracts/gosh/systemcontract.abi.json" >> env.env
echo "export REPO_ABI_1=../v2_x/contracts/gosh/repository.abi.json" >> env.env
echo "export DAO_ABI_1=../v2_x/contracts/gosh/goshdao.abi.json" >> env.env
echo "export WALLET_ABI_1=../v2_x/contracts/gosh/goshwallet.abi.json" >> env.env

echo "SET UP SUCCEEDED"
