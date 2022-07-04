#!/bin/bash

everdev contract deploy SMVTokenLocker --data "smvAccount:\"0:e675acc1f95e1202f4e9d0834f42b2c907d04e6540314409b6d9ec981c60e80d\",tokenRoot:\"0:e675acc1f95e1202f4e9d0834f42b2c907d04e6540314409b6d9ec981c60e80d\",nonce:2" --input "_clientCodeHash:\"0x`./gethash.sh SMVClient.tvc`\",_clientCodeDepth:\"`./getdepth.sh SMVClient.tvc`\"" --signer keys1 -v 60000000000
#everdev contract deploy SMVAccount --data "tip3Root:\"0:2718268b1a0706d72eebc8553c13e6e8926a79771d29bed11179bd2464f234e9\",nonce:34" --input "lockerCode:\"`./getimage.sh SMVTokenLocker.tvc`\",_clientCodeHash:22,_clientCodeDepth:33" --signer keys1 -v 60000000000
