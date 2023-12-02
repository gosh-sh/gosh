#!/bin/bash
set -e
set -x

export RUST_LOG=debug

VERSION=$1

export NETWORK="${NETWORK:-http://192.168.31.227}"
#export NETWORK=http://172.16.0.62
SE_GIVER_ADDRESS="0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415"
if [[ "$VERSION" =~ "_x/v" ]]; then
  SE_GIVER_ABI="../../../../tests/node_se_scripts/local_giver.abi.json"
  SE_GIVER_KEYS="../../../../tests/node_se_scripts/local_giver.keys.json"
else
  SE_GIVER_ABI="../../../tests/node_se_scripts/local_giver.abi.json"
  SE_GIVER_KEYS="../../../tests/node_se_scripts/local_giver.keys.json"
fi
echo $SE_GIVER_ABI
GIVER_VALUE=20000000000000000

echo "NETWORK=$NETWORK"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

# $1 = VERSION (v1_x, v2_x, v3_x)

cd ../"$VERSION"/contracts/multisig
echo "" > Giver.addr
echo "" > Giver.network
echo "" > Giver.seed

make generate-docker
export GIVER_ADDR=`cat Giver.addr`
echo "GIVER_ADDR = $GIVER_ADDR"

tonos-cli config --url $NETWORK  --lifetime 3 --timeout 1000
# gosh-cli config -e $NETWORK
# gosh-cli config --async_call true
tonos-cli callx --abi $SE_GIVER_ABI --addr $SE_GIVER_ADDRESS --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $GIVER_ADDR

# make deploy-docker
cd scripts
./deploy.sh
cd ..

#cd ../smv
#make build-contracts

# deploy giver for upgrade

cd ../gosh
echo "" > gosh.seed
echo "" > VersionController.addr
echo "" > SystemContract.addr
if [ "$VERSION" = "v1_x" ]; then
  echo "" > SystemContract-1.0.0.addr
elif [ "$VERSION" = "v2_x" ]; then
 echo "" > SystemContract-2.0.0.addr
elif [ "$VERSION" = "v3_x" ]; then
 echo "" > SystemContract-3.0.0.addr
elif [ "$VERSION" = "v4_x" ]; then
  echo "" > SystemContract-4.0.0.addr
elif [ "$VERSION" = "v5_x/v5.0.0" ]; then
  echo "" > SystemContract-5.0.0.addr
elif [ "$VERSION" = "v5_x/v5.1.0" ]; then
  echo "" > SystemContract-5.1.0.addr
elif [ "$VERSION" = "v6_x/v6.0.0" ]; then
  echo "" > SystemContract-6.0.0.addr
elif [ "$VERSION" = "v6_x/v6.1.0" ]; then
  echo "" > SystemContract-6.1.0.addr
elif [ "$VERSION" = "v6_x/v6.2.0" ]; then
  echo "" > SystemContract-6.2.0.addr
else
 exit 1
fi

#make build
# make deploy-docker
export VERSIONCONTROLLER_SEED_FILE_OUT=gosh.seed
cd scripts
./deploy.sh
