#!/bin/bash

initialSupplyTo="0:0000000000000000000000000000000000000000000000000000000000000000"
initialSupply=0
deployWalletValue=0
mintDisabled=false
burnByRootDisabled=true
burnPaused=true
remainingGasTo="0:0000000000000000000000000000000000000000000000000000000000000000"
randomNonce=1
nonce=1
ACC_DEPLOY_FEE=60000000000
mint1=10

#deploy TokenRootOwner
./deploy_TokenRootOwner.sh $1 | tee deploy_TokenRootOwner.log
GREP_STR1="Contract is deployed at address:"
export TokenRootOwner_ADDRESS=`grep "$GREP_STR1" deploy_TokenRootOwner.log | sed -e "s/ *$GREP_STR1  *//" | tr -d '\n'`

#TokenRootOwner_ADDRESS=0:53567a0c5844cc53f5b0be348f86cd432ab17f3c7b9fedf9334663b629e34c6a
#deploy TokenRoot
./deploy_TokenRoot.sh $TokenRootOwner_ADDRESS $initialSupplyTo  $initialSupply $deployWalletValue $mintDisabled $burnByRootDisabled $burnPaused $remainingGasTo $randomNonce  | tee deploy_TokenRoot.log
GREP_STR2="\"value0\":"
export TIP3ROOT_ADSRESS=`grep "$GREP_STR2" deploy_TokenRoot.log | sed -e "s/ *$GREP_STR2  *//" | tr -d '\n'`


#deploy Account
./deploy_Acc.sh $TIP3ROOT_ADSRESS  $nonce  $ACC_DEPLOY_FEE  | tee deploy_Acc.log
GREP_STR3="Contract is deployed at address:"
export Account_ADDRESS=`grep "$GREP_STR3" deploy_Acc.log | sed -e "s/ *$GREP_STR3  *//" | tr -d '\n'`


#deploy Account2
#deploy Account3
#deploy Account4
#deploy Account5

#mint token to Account1
./mint_TokenTo.sh $TokenRootOwner_ADDRESS $TIP3ROOT_ADSRESS $mint1 \"$Account_ADDRESS\" $deployWalletValue \"$Account_ADDRESS\" true ""

#mint token to Account2
#mint token to Account3
#mint token to Account4
#mint token to Account5

#Account1 lock token
everdev contract run SMVAccount lockVoting -a $Account_ADDRESS --input "amount:9" --signer keys1
#Account2 lock token
#Account3 lock token
#Account4 lock token
#Account5 lock token

#deploy Proposal
./start_proposal.sh $Account_ADDRESS | tee start_proposal.log
GREP_STR4="Contract is deployed at address:"
export Proposal_ADDRESS=`grep "$GREP_STR4" deploy_Acc.log | sed -e "s/ *$GREP_STR4  *//" | tr -d '\n'`
# Account1 vote "yes"
# Account2 vote "no"
# Account3 vote "yes"
# Account4 vote "yes"

everdev contract run SMVAccount getWalletBalance -a $Account_ADDRESS  --signer keys1
