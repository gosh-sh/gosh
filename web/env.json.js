const { writeFileSync } = require('fs')

writeFileSync(
    './public/envs.json',
    JSON.stringify({
        network: process.env.REACT_APP_GOSH_NETWORK,
        gosh: process.env.REACT_APP_GOSH_ADDR,
        creator: process.env.REACT_APP_CREATOR_ADDR,
        ipfs: process.env.REACT_APP_IPFS,
    }),
)
