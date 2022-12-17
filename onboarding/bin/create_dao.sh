# *deploy DAO
export DAO_NAME=dao-106
echo "export DAO_NAME=$DAO_NAME" >>env.env
tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $DAO_KEYS deployDao \
    "{\"systemcontract\":\"$SYSTEM_CONTRACT_ADDR\", \"name\":\"$DAO_NAME\", \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"
DAO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
