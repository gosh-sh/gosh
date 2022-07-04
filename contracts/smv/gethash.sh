#!/bin/bash
~/.everdev/solidity/tvm_linker decode --tvc $1 | grep "code_hash:" |  sed -e 's/ *code_hash: *//' | tr -d '\n'
