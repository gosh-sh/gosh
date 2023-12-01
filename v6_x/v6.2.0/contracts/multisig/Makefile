tvcs = MultisigWallet
KEYS_PATH = ${CURDIR}

EXTRA_DOCKER_ARGS = --network=host --add-host localnode:127.0.0.1

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
	if [ "${target-dir}" != "" ] ; then tar -cf goshmultisig.tar ${target-dir}; fi;

prepare-docker:
	docker build -t everdev:latest ../../../../.ci/

build-contracts-docker:
	docker run --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/multisig && make build-contracts'

generate-docker:
	docker run --rm \
		${EXTRA_DOCKER_ARGS} \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		-e GIVER_SEED_FILE_OUT="Giver.seed" \
		-e GIVER_NETWORK_FILE_OUT="Giver.network" \
		-e NETWORK=${NETWORK} \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/multisig/scripts && ./generate.sh'

deploy-docker:
	docker run --rm \
		${EXTRA_DOCKER_ARGS} \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		-v ${CURDIR}/Giver.addr:/tmp/Giver.addr \
		-v ${CURDIR}/Giver.seed:/tmp/Giver.seed \
		-v ${CURDIR}/Giver.network:/tmp/Giver.network \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/multisig/scripts && ./deploy.sh'
