deploy-testnet:
	
	docker run -it --rm \
		-v /${CURDIR}:/opt/gosh/contracts \
		-v /${CURDIR}/giver.keys.json:/tmp/giver.keys.json \
		-e GIVER_WALLET_ADDR="0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391" \
		-e GOSH_ROOT_SEED_FILE_OUT="gosh.seed" \
		-e NETWORK="vps23.ton.dev" \
		-e EVERDEV_VERSION="latest" \
		-e EVERDEV_SOL_COMPILER_VERSION="latest" \
		-e EVERDEV_TVM_LINKER_VERSION="latest" \
		-e EVERDEV_TONOS_CLI_VERSION="latest" \
		node:18.6.0-slim \
		//bin/bash //opt/gosh/contracts/deploy.sh
