#!/bin/bash
set -e
set -o pipefail
set -x

FIRST_VERSION=v4_x
SECOND_VERSION=v5_x
#./node_se_scripts/deploy.sh $FIRST_VERSION
#. set-vars.sh $FIRST_VERSION

. ./util.sh

VC_ABI="../v6_x/v6.0.0/contracts/gosh/versioncontroller.abi.json"
VC_ADDR=$(cat ../v6_x/v6.0.0/contracts/gosh/VersionController.addr)
VC_SEED=$(cat ../v6_x/v6.0.0/contracts/gosh/gosh.seed | grep Seed | cut -d ':' -f 2)
echo "VC_ADDR=$VC_ADDR"
echo "VC_SEED=$VC_SEED"

vc_balance=$(tonos-cli -j account $VC_ADDR | jq '."'$VC_ADDR'".balance' | cut -d '"' -f 2)
echo "vc_balance=$vc_balance"

cmd="tonos-cli callx --abi $VC_ABI --addr $VC_ADDR --keys $VC_SEED -m getMoneyFromSystemContract '{\"version\":\"6.0.0\",\"value\":1000000000000}'"
echo $cmd
eval $cmd

sleep 10

vc_balance_new=$(tonos-cli -j account $VC_ADDR | jq '."'$VC_ADDR'".balance' | cut -d '"' -f 2)
echo "vc_balance=$vc_balance_new"

if [ $vc_balance_new -le $vc_balance ]; then
  echo "wrong balance"
fi

cmd="tonos-cli callx --abi $VC_ABI --addr $VC_ADDR --keys $WALLET_KEYS -m getMoneyFromSystemContract '{\"version\":\"6.0.0\",\"value\":1000000000000}'"
echo $cmd
if eval $cmd; then
  echo "Command should fail with wrong key"
  exit 1
fi
sleep 10

vc_balance_fail=$(tonos-cli -j account $VC_ADDR | jq '."'$VC_ADDR'".balance' | cut -d '"' -f 2)
echo "vc_balance=$vc_balance_fail"

if [ $vc_balance_new -gt $vc_balance_fail ]; then
  echo "wrong balance"
  exit 1
fi

echo "TEST SUCCEEDED"