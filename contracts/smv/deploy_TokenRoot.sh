#!/bin/bash

everdev contract run TokenRootOwner -a $1 deployRoot --input "initialSupplyTo:\"$2\",initialSupply:$3,deployWalletValue:$4,mintDisabled:$5,burnByRootDisabled:$6,burnPaused:$7,remainingGasTo:\"$8\",randomNonce:$9" --signer keys1 

