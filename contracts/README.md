#### GOSH Smart-contracts deployment

##### Pre-requirements
- Docker installed
- Giver wallet keys 

#### Deploy

1. Place giver keys file named giver.keys.json inside contracts folder
2. ```
    cd contracts
    make deploy-testnet
    ```
NOTE: script will generate gosh.seed, GoshRoot.addr and GoshDaoCreator.addr files. 


#### Environment variables for Docker command (described in Makefile)
| Name | Default | Description |
| ------ | ------ | ------ |
| GIVER_WALLET_ADDR | - | Multisig wallet (giver) address to top up contracts before deployment |
| NETWORK | - | GOSH netwotk entrypoint |
| GOSH_ROOT_SEED_FILE_OUT | - | File name to save newly generated root keys |
| EVERDEV_VERSION | latest | Everdev NPM package version |
| EVERDEV_SOL_COMPILER_VERSION | latest | Solidity compiler version |
| EVERDEV_TVM_LINKER_VERSION | latest | TVM linker version |
| EVERDEV_TONOS_CLI_VERSION | latest | TONOS CLI version |
| GOSH_REPO_ROOT_PATH | /opt/gosh | Path to mount GOSH repo inside container |
| GIVER_WALLET_KEYS_PATH | /tmp/giver.keys.json | Path to mount keys inside container |