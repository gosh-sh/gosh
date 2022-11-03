tvcs = tree tag snapshot repository goshwallet goshdao systemcontract diff commit content-signature profile versioncontroller profiledao
KEYS_PATH = ${CURDIR}
clean:
	rm -f *.tvc *.abi.json *.code
	rm -rf .solc_imports

build-contracts:
# everdev sol compile $$i.sol || exit $$@;
	for i in $(tvcs); do \
		../compiler/solc $$i.sol || exit $$@; \
		../compiler/tvm_linker compile $$i.code -o $$i.tvc --lib ../compiler/stdlib_sol.tvm || exit $$@; \
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
		-e VERSIONCONTROLLER_SEED_FILE_OUT="gosh.seed" \
		-e NETWORK=${NETWORK} \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/gosh/scripts && ./deploy.sh'

upgrade-docker:
	docker run --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		-v ${KEYS_PATH}:/tmp/giver.keys.json \
		-e GIVER_WALLET_ADDR=${GIVER_WALLET_ADDR} \
		-e VERSIONCONTROLLER_SEED_FILE_OUT="gosh.seed" \
		-e VERSIONCONTROLLER_ADDR=${VERSIONCONTROLLER_ADDR} \
		-e NETWORK=${NETWORK} \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/gosh/scripts && ./upgrade.sh'
