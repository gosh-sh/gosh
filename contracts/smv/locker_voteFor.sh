#!/bin/bash

#voteFor (TvmCell clientCode, address proposal, bool choice, uint128 amount)
everdev contract run SMVTokenLocker -a $1 voteFor --input "clientCode:\"`./getimage.sh SMVClient.tvc`\",proposal:\"0:2718268b1a0706d72eebc8553c13e6e8926a79771d29bed11179bd2464f234e9\",amount:0,choice:true" --signer keys1 
