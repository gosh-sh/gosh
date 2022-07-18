#### GOSH Smart-contracts deployment

##### Pre-requirements
- Docker installed
- Giver keys and address

#### Deploy using the latest Everdev tools

Deploy should be launched from the GOSH repo root.
Script will generate file with seedphrase for GOSH root, also GoshRoot.addr and GoshDaoCreator.addr files in GOSH repo root directory. 

```
docker run -it --rm \
-v <FULL_PATH_TO_GOSH_REPO>:/opt/gosh \
-v <FULL_PATH_TO_GIVER_KEYS_FILE>:/tmp/giver.keys.json \
-e GIVER_WALLET_ADDR="0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391" \
-e GOSH_ROOT_SEED_FILE_OUT="gosh.seed" \
-e NETWORK="vps23.ton.dev" \
-e EVERDEV_VERSION="latest" \
-e EVERDEV_SOL_COMPILER_VERSION="latest" \
-e EVERDEV_TVM_LINKER_VERSION="latest" \
-e EVERDEV_TONOS_CLI_VERSION="latest" \
node:18.6.0-slim \
/bin/bash /opt/gosh/deploy.sh
```

#### Example
```
docker run -it --rm \
-v /home/someuser/gosh:/opt/gosh \
-v /home/someuser/keys/giver.keys.json:/tmp/giver.keys.json \
-e GIVER_WALLET_ADDR="0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391" \
-e GOSH_ROOT_SEED_FILE_OUT="gosh.seed" \
-e NETWORK="vps23.ton.dev" \
-e EVERDEV_VERSION="latest" \
-e EVERDEV_SOL_COMPILER_VERSION="latest" \
-e EVERDEV_TVM_LINKER_VERSION="latest" \
-e EVERDEV_TONOS_CLI_VERSION="latest" \
node:18.6.0-slim \
/bin/bash /opt/gosh/deploy.sh
```

#### Example with specific Everdev tools
```
docker run -it --rm \
-v /home/someuser/gosh:/opt/gosh \
-v /home/someuser/keys/giver.keys.json:/tmp/giver.keys.json \
-e GIVER_WALLET_ADDR="0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391" \
-e GOSH_ROOT_SEED_FILE_OUT="gosh1.seed" \
-e NETWORK="vps23.ton.dev" \
-e EVERDEV_VERSION="1.2.0" \
-e EVERDEV_SOL_COMPILER_VERSION="0.61.2" \
-e EVERDEV_TVM_LINKER_VERSION="0.15.54" \
-e EVERDEV_TONOS_CLI_VERSION="0.27.1" \
node:18.6.0-slim \
/bin/bash /opt/gosh/deploy.sh
```

#### Environment variables
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

