#!/bin/bash
# constructor(TvmCell lockerCode, uint256 _platformCodeHash, uint16 _platformCodeDepth, 
#             uint256 _clientCodeHash, uint16 _clientCodeDepth, \
#             uint256 _proposalCodeHash, uint16 _proposalCodeDepth)
everdev contract deploy SMVAccount --data "tip3Root:\"0:2718268b1a0706d72eebc8553c13e6e8926a79771d29bed11179bd2464f234e9\",nonce:5" --input "lockerCode:\"`./getimage.sh SMVTokenLocker.tvc`\",_platformCodeHash:\"0x`./gethash.sh LockerPlatform.tvc`\",_platformCodeDepth:\"`./getdepth.sh LockerPlatform.tvc`\",_clientCodeHash:\"0x`./gethash.sh SMVClient.tvc`\",_clientCodeDepth:\"`./getdepth.sh SMVClient.tvc`\",_proposalCodeHash:\"0x`./gethash.sh SMVProposal.tvc`\",_proposalCodeDepth:\"`./getdepth.sh SMVProposal.tvc`\"" --signer keys1 -v 60000000000
