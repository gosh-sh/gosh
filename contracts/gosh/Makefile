tvcs = tree tag snapshot repository goshwallet goshdao gosh diff commit content-signature profile root profiledao
KEYS_PATH = ${CURDIR}
clean:
	rm -f *.tvc *.abi.json
	rm -rf .solc_imports

build-contracts:
	for i in $(tvcs); do \
		everdev sol compile $$i.sol || exit $$@; \
		if [ "${target-dir}" != "" ] ; then cp $$i.* ${target-dir}/ ; fi; \
	done

build: clean build-contracts
	if [ "${target-dir}" != "" ] ; then tar -cf gosh.tar ${target-dir}; fi;

compile:
	everdev sol compile ${ARG}.sol

install:
	@echo Installing from ${target-dir} to ${target-network}

prepare-docker:
	docker build -t everdev:latest ../../.ci/

build-contracts-docker:
	docker run -it --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/gosh && make build-contracts'

deploy-docker:
	docker run --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		-v ${KEYS_PATH}:/tmp/giver.keys.json \
		-e GIVER_WALLET_ADDR=${GIVER_WALLET_ADDR} \
		-e GOSH_ROOT_SEED_FILE_OUT="gosh.seed" \
		-e NETWORK=${NETWORK} \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/gosh/scripts && ./deploy.sh'

upgrade-docker:
	docker run --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		-v ${KEYS_PATH}:/tmp/giver.keys.json \
		-e GIVER_WALLET_ADDR=${GIVER_WALLET_ADDR} \
		-e GOSH_ROOT_SEED_FILE_OUT="gosh.seed" \
		-e GOSHROOT_ADDR=${GOSHROOT_ADDR} \
		-e NETWORK=${NETWORK} \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/gosh/scripts && ./upgrade.sh'
