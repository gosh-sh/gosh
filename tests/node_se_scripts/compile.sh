cd ./node_se_scripts
solc prop_id_gen.sol || exit 1
tvm_linker compile prop_id_gen.code -o prop_id_gen.tvc || exit 1
tvm_linker test prop_id_gen  --gas-limit 1000000 --abi-json prop_id_gen.abi.json --abi-method constructor --abi-params '{}'

