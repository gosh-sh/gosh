#!/bin/bash
set -e
set -o pipefail
set -x


./compiler/solc --tvm-version gosh proposal_test.sol
./compiler/tvm_linker compile --lib ./compiler/stdlib_sol.tvm proposal_test.code -o proposal_test.tvc

./compiler/solc --tvm-version gosh checker.sol
./compiler/tvm_linker compile --lib ./compiler/stdlib_sol.tvm checker.code -o checker.tvc

./compiler/solc --tvm-version gosh proposal.sol
./compiler/tvm_linker compile --lib ./compiler/stdlib_sol.tvm proposal.code -o proposal.tvc

./compiler/solc --tvm-version gosh receiver.sol
./compiler/tvm_linker compile --lib ./compiler/stdlib_sol.tvm receiver.code -o receiver.tvc

./compiler/solc --tvm-version gosh indexwallet.sol
./compiler/tvm_linker compile --lib ./compiler/stdlib_sol.tvm indexwallet.code -o indexwallet.tvc

rm *.code
rm *.debug.json