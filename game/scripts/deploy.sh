#!/bin/bash
set -e
set -o pipefail
# set -x
. ./utils.sh

# Constants
contracts_path=..

# key=value arguments
export network="${network:-http://localhost}"
export tonos_cli="${tonos_cli:-tonos-cli}"
export seed="${seed:-}"

# Setup tonos-cli
echo -e "> Setup tonos-cli..."
_=$($tonos_cli config --url $network)

# Get codes
profile_code=$($tonos_cli -j decode stateinit --tvc $contracts_path/profile.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
field_code=$($tonos_cli -j decode stateinit --tvc $contracts_path/field.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
award_code=$($tonos_cli -j decode stateinit --tvc $contracts_path/award.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')
forest_code=$($tonos_cli -j decode stateinit --tvc $contracts_path/forest.tvc | tr -d ' ",' | sed -n '/code:/s/code://p')

# Calculate fabric address
fabric_abi="$contracts_path/fabric.abi.json"
fabric_tvc="$contracts_path/fabric.tvc"
fabric_addr=$($tonos_cli -j genaddr --abi $fabric_abi --setkey "$seed" --save $fabric_tvc | tr -d ' ",' | sed -n '/raw_address:/s/raw_address://p')
echo -e "> Fabric address:\t$fabric_addr"
echo $fabric_addr > $contracts_path/fabric.addr
echo $seed > $contracts_path/fabric.seed

# Check fabric balance
fabric_balance=$(get_account_balance $fabric_addr)
echo -e "> Fabric balance:\t$fabric_balance"
if [ $fabric_balance -lt 1000000000000 ]; then
    echo -e "> Topup fabric account with 1000 tokens"
    wait_account_balance $fabric_addr 1000000000000
fi

# Check fabric status
fabric_status=$(get_account_status $fabric_addr)
echo -e "> Fabric status:\t$fabric_status"
if [ $fabric_status != "Active" ]; then
    echo -e "> Deploying fabric..."
    _=$($tonos_cli deploy --abi $fabric_abi --sign "$seed" $fabric_tvc "{\"code\": {}}")

    echo -e "> Wait for account is deployed..."
    wait_account_active $fabric_addr
fi

# Run code setters
echo -e "> Set profile code..."
_=$($tonos_cli callx --abi $fabric_abi --addr $fabric_addr --keys "$seed" -m setCode "{\"code\": \"$profile_code\", \"id\": 0}")
echo -e "> Set field code..."
_=$($tonos_cli callx --abi $fabric_abi --addr $fabric_addr --keys "$seed" -m setCode "{\"code\": \"$field_code\", \"id\": 1}")
echo -e "> Set award code..."
_=$($tonos_cli callx --abi $fabric_abi --addr $fabric_addr --keys "$seed" -m setCode "{\"code\": \"$award_code\", \"id\": 2}")
echo -e "> Set forest code..."
_=$($tonos_cli callx --abi $fabric_abi --addr $fabric_addr --keys "$seed" -m setCode "{\"code\": \"$forest_code\", \"id\": 3}")
