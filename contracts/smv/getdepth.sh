#!/bin/bash
~/.everdev/solidity/tvm_linker decode --tvc $1 | grep "code_depth:" |  sed -e 's/ *code_depth: *//' | tr -d '\n'
