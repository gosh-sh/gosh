#!/bin/bash
set -e
set -x
export NETWORK="${NETWORK:-http://192.168.31.227}"
#export NETWORK=http://172.16.0.62
SE_GIVER_ADDRESS="0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415"
SE_GIVER_ABI="../../../tests/node_se_scripts/local_giver.abi.json"
SE_GIVER_KEYS="../../../tests/node_se_scripts/local_giver.keys.json"
GIVER_VALUE=20000000000000000

echo "NETWORK=$NETWORK"

# $1 = VERSION (v1_x, v2_x)

VERSION=$1

cd ../"$VERSION"/contracts/multisig
echo "" > Giver.addr
echo "" > Giver.network
echo "" > Giver.seed

make generate-docker
export GIVER_ADDR=`cat Giver.addr`
echo "GIVER_ADDR = $GIVER_ADDR"

gosh-cli config -e localhost
gosh-cli callx --abi $SE_GIVER_ABI --addr $SE_GIVER_ADDRESS --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $GIVER_ADDR

make deploy-docker

#cd ../smv
#make build-contracts

# deploy giver for upgrade

cd ../gosh
echo "" > gosh.seed
echo "" > VersionController.addr
echo "" > SystemContract.addr
if [ "$VERSION" = "v1_x" ]; then
  echo "" > SystemContract-1.0.0.addr
else
  echo "" > SystemContract-2.0.0.addr
fi

#make build
make deploy-docker
