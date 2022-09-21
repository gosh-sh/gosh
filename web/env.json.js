const { writeFileSync } = require('fs')

writeFileSync(
    './public/envs.json',
    JSON.stringify({
        network: process.env.REACT_APP_GOSH_NETWORK,
        root: process.env.REACT_APP_GOSH_ROOTADDR,
        ipfs: process.env.REACT_APP_IPFS,
    }),
)
