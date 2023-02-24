if [ -e env.env ]; then
    . ./env.env
fi

SE_GIVER_ADDRESS="0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415"
SE_GIVER_ABI="node_se_scripts/local_giver.abi.json"
SE_GIVER_KEYS="node_se_scripts/local_giver.keys.json"
GIVER_VALUE=20000000000000000

echo "SYSTEM_CONTRACT balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR | grep balance
echo "SYSTEM_CONTRACT_1 balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR_1 | grep balance
echo "SYSTEM_CONTRACT_2 balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR_2 | grep balance

gosh-cli callx --addr $SE_GIVER_ADDRESS --abi $SE_GIVER_ABI --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $SYSTEM_CONTRACT_ADDR
gosh-cli callx --addr $SE_GIVER_ADDRESS --abi $SE_GIVER_ABI --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $SYSTEM_CONTRACT_ADDR_1
gosh-cli callx --addr $SE_GIVER_ADDRESS --abi $SE_GIVER_ABI --keys $SE_GIVER_KEYS -m sendTransaction --value $GIVER_VALUE --bounce false --dest $SYSTEM_CONTRACT_ADDR_2

echo "SYSTEM_CONTRACT balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR | grep balance
echo "SYSTEM_CONTRACT_1 balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR_1 | grep balance
echo "SYSTEM_CONTRACT_2 balance"
gosh-cli account $SYSTEM_CONTRACT_ADDR_2 | grep balance
