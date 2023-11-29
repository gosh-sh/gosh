tvcs = grant tree tag tagsupply snapshot repository goshwallet goshdao systemcontract diff commit content-signature profile versioncontroller profiledao profileindex bigtask task daotag taggosh topic trusted 
cpfl = profile profiledao profileindex trusted
KEYS_PATH = ${CURDIR}
EXTRA_DOCKER_ARGS = --network=host --add-host localnode:127.0.0.1

clean:
	rm -f *.tvc *.abi.json *.code *.debug.json
	rm -rf .solc_imports
	rm -rf .sold_imports

build-contracts:
# everdev sol compile $$i.sol || exit $$@;
	for i in $(cpfl); do \
		cp ../$$i.sol . || exit $$@; \
		if [ "${target-dir}" != "" ] ; then cp $$i.* ${target-dir}/ ; fi; \
	done
	for i in $(tvcs); do \
		../compiler/sold --tvm-version gosh $$i.sol || exit $$@; \
		if [ "${target-dir}" != "" ] ; then cp $$i.* ${target-dir}/ ; fi; \
	done
	rm *.debug.json;
	cd smv; \
	make build-contracts; \
	cd ..; \

clean-contracts:
	for i in $(cpfl); do \
		rm $$i.sol  || exit $$@; \
		rm $$i.code || exit $$@; \
		rm $$i.tvc || exit $$@; \
		rm $$i.abi.json || exit $$@; \
		if [ "${target-dir}" != "" ] ; then cp $$i.* ${target-dir}/ ; fi; \
	done

build: clean build-contracts clean-contracts
	if [ "${target-dir}" != "" ] ; then tar -cf gosh.tar ${target-dir}; fi;

build-save: clean build-contracts
	if [ "${target-dir}" != "" ] ; then tar -cf gosh.tar ${target-dir}; fi;

compile:
	everdev sol compile ${ARG}.sol

install:
	@echo Installing from ${target-dir} to ${target-network}

prepare-docker:
	docker build -t everdev:latest ../../../../.ci/

build-contracts-docker:
	docker run --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/gosh && make build'

deploy-docker:
	docker run --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		-v ${CURDIR}/../multisig/Giver.seed:/tmp/Giver.seed \
		-v ${CURDIR}/../multisig/Giver.addr:/tmp/Giver.addr \
		-v ${CURDIR}/../multisig/Giver.network:/tmp/Giver.network \
		-v ${CURDIR}/../../../../tests/util.sh:/tmp/util.sh \
		${EXTRA_DOCKER_ARGS} \
		-e VERSIONCONTROLLER_SEED_FILE_OUT="gosh.seed" \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/gosh/scripts && ./deploy.sh'

upgrade-docker:
	docker run --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		-v ${CURDIR}/../multisig/Giver.seed:/tmp/Giver.seed \
		-v ${CURDIR}/../multisig/Giver.addr:/tmp/Giver.addr \
		-v ${CURDIR}/../multisig/Giver.network:/tmp/Giver.network \
		-v ${CURDIR}/../../../../tests/util.sh:/tmp/util.sh \
		${EXTRA_DOCKER_ARGS} \
		-e VERSIONCONTROLLER_ADDR=${VERSIONCONTROLLER_ADDR} \
		-e VERSIONCONTROLLER_SEED="${VERSIONCONTROLLER_SEED}" \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/gosh/scripts && ./upgrade.sh'
