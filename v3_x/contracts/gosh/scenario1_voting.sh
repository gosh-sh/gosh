#!/bin/bash

prop1_vote1=25
prop1_vote2=25
prop1_vote3=30
prop2_vote1=15
prop2_vote2=20
prop2_vote3=15
Proposal_ADDRESS=0:713dfc17e82a4d9532b5897640b168a2aa05d7a235c6f3cb6888d9c555f67747

# Account1 vote "yes"
everdev contract run goshwallet voteFor -a $Account_ADDRESS --input "platformCode:\"`../smv/getimage.sh ../smv/LockerPlatform.tvc`\",clientCode:\"`../smv/getimage.sh ../smv/SMVClient.tvc`\",proposal:\"$Proposal_ADDRESS\",choice:true,amount:$prop1_vote1" --signer keys1 

