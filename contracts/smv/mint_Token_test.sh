#!/bin/bash

TokenRootOwner_ADDRESS="0:939b6bc3f4a0b7685933886d22c127186969f32a11f23060813ae02ef45ea088"
TIP3ROOT_ADSRESS="0:4e7bc0d66df029f2ba248d0bc603b1b4406461dc680ef647dd30f7d87505b8a6"
mint1=15
Account_ADDRESS="0:6539650df97ef5e944db9d555aa50028a50c41e45d9dce739ab43c71db164fc0"
deployWalletValue=0

#./mint_TokenTo.sh $TokenRootOwner_ADDRESS $TIP3ROOT_ADSRESS $mint1 $Account_ADDRESS $deployWalletValue $Account_ADDRESS true ""


everdev contract run TokenRootOwner -a $TokenRootOwner_ADDRESS mint --input "tokenRoot:\"$TIP3ROOT_ADSRESS\",amount:$mint1,recipient:\"$Account_ADDRESS\",deployWalletValue:$deployWalletValue,remainingGasTo:\"$Account_ADDRESS\",notify:true,payload:\"\"" --signer keys1 
