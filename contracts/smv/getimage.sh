#!/bin/bash
~/.everdev/solidity/tvm_linker decode --tvc $1 | grep "code:" |  sed -e 's/ *code: *//' | tr -d '\n'
