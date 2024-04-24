#!/bin/bash
everdev contract deploy gosh --data "nonce:$1"  --signer keys1 -v 50000000000  | tee deploy_gosh.log
GREP_STR1="Contract is deployed at address:"
export gosh_ADDRESS=`grep "$GREP_STR1" deploy_gosh.log | sed -e "s/ *$GREP_STR1  *//" | tr -d '\n'`


everdev contract run gosh setTokenRoot -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh ../smv/TokenRoot.tvc`\",value1:\"\"" --signer keys1

everdev contract run gosh setTokenWallet -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh ../smv/TokenWallet.tvc`\",value1:\"\"" --signer keys1
everdev contract run gosh setTokenLocker -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh ../smv/SMVTokenLocker.tvc`\",value1:\"\"" --signer keys1
everdev contract run gosh setSMVPlatform -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh ../smv/LockerPlatform.tvc`\",value1:\"\"" --signer keys1
everdev contract run gosh setSMVClient -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh ../smv/SMVClient.tvc`\",value1:\"\"" --signer keys1
everdev contract run gosh setSMVProposal -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh ../smv/SMVProposal.tvc`\",value1:\"\"" --signer keys1

everdev contract run gosh setRepository -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh repository.tvc`\",data:\"\"" --signer keys1
everdev contract run gosh setCommit -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh commit.tvc`\",data:\"\"" --signer keys1
everdev contract run gosh setBlob -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh blob.tvc`\",data:\"\"" --signer keys1
everdev contract run gosh setSnapshot -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh snapshot.tvc`\",data:\"\"" --signer keys1
everdev contract run gosh setWallet -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh goshwallet.tvc`\",data:\"\"" --signer keys1
everdev contract run gosh setDao -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh goshdao.tvc`\",data:\"\"" --signer keys1
everdev contract run gosh setTag -a $gosh_ADDRESS --input "code:\"`../smv/getimage.sh tag.tvc`\",data:\"\"" --signer keys1

export WalletCode=`../smv/getimage.sh goshwallet.tvc`
export codeDao=`../smv/getimage.sh goshdao.tvc`
everdev contract deploy daocreater --data "nonce:$1"  --input "gosh:\"$gosh_ADDRESS\",WalletCode:\"$WalletCode\",WalletData:\"\",codeDao:\"$codeDao\",dataDao:\"\"" --signer keys1 -v 150000000000  | tee deploy_daocreator.log
GREP_STR2="Contract is deployed at address:"
export daocreator_ADDRESS=`grep "$GREP_STR2" deploy_daocreator.log | sed -e "s/ *$GREP_STR2  *//" | tr -d '\n'`


PUBKEY="0x4842985c85fb8193083967608dd6d35b3667ccdb0b7ffcdbb910075d333b55f8"
everdev contract run daocreater deployDao -a $daocreator_ADDRESS --input "name:\"dao1\",root_pubkey:\"$PUBKEY\"" --signer keys1

sleep 10

everdev contract run-local gosh _lastGoshDao -a $gosh_ADDRESS  | tee get_goshdao_Address.log
GREP_STR11="\"_lastGoshDao\":"
goshdao_Address=`grep "$GREP_STR11"  get_goshdao_Address.log | sed -e "s/ *$GREP_STR11  *//" | tr -d '\n'`
export goshdao_Address=`echo $goshdao_Address | sed s/\"//g`
#export goshdao_Address="0:c04216bfa2c6d053182dd8af24ab6108cc911fd58b78bb7f00a07320624e997c"

sleep 10

everdev contract run-local goshdao _rootTokenRoot -a $goshdao_Address  | tee get_TokenRoot_Address.log
GREP_STR12="\"_rootTokenRoot\":"
TIP3ROOT_ADDRESS=`grep "$GREP_STR12"  get_TokenRoot_Address.log | sed -e "s/ *$GREP_STR12  *//" | tr -d '\n'`
export TIP3ROOT_ADDRESS=`echo $TIP3ROOT_ADDRESS | sed s/\"//g`
#export TIP3ROOT_ADDRESS="0:31537c1280cb4c9ed38a1db10dea7ea5784b14e34ad38118c4c29a544c49dd31"


everdev contract run goshdao deployWallet -a $goshdao_Address --input "pubkeyroot:\"$PUBKEY\",pubkey:\"$PUBKEY\"" --signer keys1

sleep 10

everdev contract run-local goshdao _lastAccountAddress -a $goshdao_Address  | tee get_Account_ADDRESS_Address.log
GREP_STR13="\"_lastAccountAddress\":"
Account_ADDRESS=`grep "$GREP_STR13"  get_Account_ADDRESS_Address.log | sed -e "s/ *$GREP_STR13  *//" | tr -d '\n'`
export Account_ADDRESS=`echo $Account_ADDRESS | sed s/\"//g`
#export Account_ADDRESS="0:bab04f4091cbc1ec54b969f53175d175ff9860b99df2a4522bc3ce717865cd6c"



#mint token to Account1
mint1=100
everdev contract run goshdao -a $goshdao_Address mint --input "tokenRoot:\"$TIP3ROOT_ADDRESS\",amount:$mint1,recipient:\"$Account_ADDRESS\",deployWalletValue:0,remainingGasTo:\"$goshdao_Address\",notify:true,payload:\"\"" --signer keys1 

everdev contract run-local goshwallet _tokenBalance -a $Account_ADDRESS

everdev contract run goshwallet lockVoting -a $Account_ADDRESS --input "amount:0" --signer keys1

export parent10="0:0000000000000000000000000000000000000000000000000000000000000000"
export parent20="0:0000000000000000000000000000000000000000000000000000000000000000"


everdev contract run goshwallet deployCommit -a $Account_ADDRESS --input "repoName:"repoName1",branchName:"main",commitName:"commitName1",fullCommit:"fullCommit1",parent1:\"$parent10\",parent2:\"$parent20\"" --signer keys1

