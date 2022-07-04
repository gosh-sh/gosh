#!/bin/bash


everdev contract run TokenRootOwner -a $1 mint --input "tokenRoot:$2,amount:$3,recipient:$4,deployWalletValue:$5,remainingGasTo:$6,notify:$7,payload:$8" --signer keys1 
