#!/bin/bash


#everdev contract deploy SMVAccount --data "tip3Root:$1,nonce:$2" --input "lockerCode:\"`./getimage.sh SMVTokenLocker.tvc`\",_clientCodeHash:\"0x`./gethash.sh SMVClient.tvc`\",_clientCodeDepth:\"`./getdepth.sh SMVClient.tvc`\"" --signer keys1 -v $3

everdev contract deploy SMVAccount --data "tip3Root:$1,nonce:$2" --input "lockerCode:\"`./getimage.sh SMVTokenLocker.tvc`\",_platformCodeHash:\"0x`./gethash.sh LockerPlatform.tvc`\",_platformCodeDepth:\"`./getdepth.sh LockerPlatform.tvc`\",_clientCodeHash:\"0x`./gethash.sh SMVClient.tvc`\",_clientCodeDepth:\"`./getdepth.sh SMVClient.tvc`\",_proposalCodeHash:\"0x`./gethash.sh SMVProposal.tvc`\",_proposalCodeDepth:\"`./getdepth.sh SMVProposal.tvc`\"" --signer keys1 -v $3
