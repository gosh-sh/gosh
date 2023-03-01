#!/bin/bash
set -e
set -o pipefail
. ./util.sh

set -x

GOSH_PATH=../contracts/gosh
TESTS_PATH=../../tests
CUR_VERSION=$(grep -r 'string constant version' $GOSH_PATH/systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
TEST_VERSION1=9998.0.0
TEST_VERSION2=9999.0.0

echo "export CUR_VERSION=$CUR_VERSION" >> env.env
echo "export TEST_VERSION1=$TEST_VERSION1" >> env.env
echo "export TEST_VERSION2=$TEST_VERSION2" >> env.env

export NETWORK="${NETWORK:-http://192.168.31.227}"
SE_GIVER_ADDRESS="0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415"
SE_GIVER_ABI="$TESTS_PATH/node_se_scripts/local_giver.abi.json"
SE_GIVER_KEYS="$TESTS_PATH/node_se_scripts/local_giver.keys.json"
GIVER_VALUE=20000000000000000
CLI_CONF_PATH=$PWD/gosh-cli.conf.json

if [ "$CUR_VERSION" = "$TEST_VERSION1" ] || [ "$CUR_VERSION" = "$TEST_VERSION2" ]; then
  echo "Current contract version is equal to one of the reserved for tests"
  exit 1
fi

### TODO: script is now configured to work with Node SE. Mb add variants for other networks
echo "Start upgrade tests set up"

echo "Deploy giver for upgrade"
cd $GOSH_PATH/../multisig
gosh-cli -c "$CLI_CONF_PATH" config -e localhost
make generate-docker
export GIVER_ADDR=`cat Giver.addr`
echo "GIVER_ADDR = $GIVER_ADDR"
gosh-cli -c "$CLI_CONF_PATH" callx --abi $SE_GIVER_ABI --addr $SE_GIVER_ADDRESS --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $GIVER_ADDR

make deploy-docker

echo "Upgrade to test version $TEST_VERSION1"
cd ../gosh

sed -i "s/version = \"$CUR_VERSION/version = \"$TEST_VERSION1/" *.sol

CHECK_VERSION=$(grep -r 'string constant version' systemcontract.sol | sed 's/^.*[^0-9]\([0-9]*\.[0-9]*\.[0-9]*\).*$/\1/')
if [ $CHECK_VERSION != $TEST_VERSION1 ]; then
  echo "Failed to change contract version"
  exit 1
fi

make build
export VERSIONCONTROLLER_ADDR=`cat VersionController.addr`
VERSIONCONTROLLER_SEED=`cat gosh.seed | grep -o '".*"' | tr -d '"'`
export VERSIONCONTROLLER_SEED="$VERSIONCONTROLLER_SEED"
echo > SystemContract-${TEST_VERSION1}.addr
make upgrade-docker

VERSIONCONTROLLER_ABI=versioncontroller.abi.json

SYSTEM_CONTRACT_ADDR_1=$(gosh-cli -c "$CLI_CONF_PATH" -j run $VERSIONCONTROLLER_ADDR getSystemContractAddr "{\"version\":\"$TEST_VERSION1\"}" --abi $VERSIONCONTROLLER_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "SYSTEM_CONTRACT_ADDR_1=$SYSTEM_CONTRACT_ADDR_1"

echo "Deploy giver for upgrade"
cd ../multisig
make generate-docker
export GIVER_ADDR=`cat Giver.addr`
echo "GIVER_ADDR = $GIVER_ADDR"
gosh-cli -c "$CLI_CONF_PATH" callx --abi $SE_GIVER_ABI --addr $SE_GIVER_ADDRESS --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $GIVER_ADDR

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

SYSTEM_CONTRACT_ADDR_2=$(gosh-cli -c "$CLI_CONF_PATH" -j run $VERSIONCONTROLLER_ADDR getSystemContractAddr "{\"version\":\"$TEST_VERSION2\"}" --abi $VERSIONCONTROLLER_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "SYSTEM_CONTRACT_ADDR_2=$SYSTEM_CONTRACT_ADDR_2"

sed -i "s/version = \"$TEST_VERSION2/version = \"$CUR_VERSION/" *.sol
make build

cd $TESTS_PATH
echo "export SYSTEM_CONTRACT_ADDR_1=$SYSTEM_CONTRACT_ADDR_1" >> env.env
echo "export SYSTEM_CONTRACT_ADDR_2=$SYSTEM_CONTRACT_ADDR_2" >> env.env

gosh-cli -c "$CLI_CONF_PATH" runx --addr $SYSTEM_CONTRACT_ADDR_1 --abi $SYSTEM_CONTRACT_ABI -m getVersion
gosh-cli -c "$CLI_CONF_PATH" runx --addr $SYSTEM_CONTRACT_ADDR_2 --abi $SYSTEM_CONTRACT_ABI -m getVersion

# setup prop_id for versions 9998 9999
echo "export PROP_ID1=\"3950845175897358018094131615753860290307075417829333502875089611607422753737\"" >> env.env
echo "export PROP_ID2=\"88364137685699556084928035923009541681801570983404644442401696785754621762666\"" >> env.env

echo "SET UP SUCCEEDED"
