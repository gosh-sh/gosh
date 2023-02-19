if [ -e env.env ]; then
    . ./env.env
fi

SE_GIVER_ADDRESS="0:b5e9240fc2d2f1ff8cbb1d1dee7fb7cae155e5f6320e585fcc685698994a19a5"
SE_GIVER_ABI="node_se_scripts/local_giver.abi.json"
SE_GIVER_KEYS="node_se_scripts/local_giver.keys.json"
GIVER_VALUE=20000000000000000

echo "SYSTEM_CONTRACT balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR | grep balance
echo "SYSTEM_CONTRACT_1 balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR_1 | grep balance

gosh-cli callx --addr $SE_GIVER_ADDRESS --abi $SE_GIVER_ABI --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $SYSTEM_CONTRACT_ADDR
gosh-cli callx --addr $SE_GIVER_ADDRESS --abi $SE_GIVER_ABI --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $SYSTEM_CONTRACT_ADDR_1


echo "SYSTEM_CONTRACT balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR | grep balance
echo "SYSTEM_CONTRACT_1 balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR_1 | grep balance
