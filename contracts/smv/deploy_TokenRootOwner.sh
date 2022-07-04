#!/bin/bash





everdev contract deploy TokenRootOwner --data "nonce:$1" --input "_tokenRootCode:\"`./getimage.sh TokenRoot.tvc`\",_tokenWalletCode:\"`./getimage.sh TokenWallet.tvc`\"" --signer keys1 -v 50000000000
