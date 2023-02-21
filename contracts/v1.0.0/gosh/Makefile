EXTRA_DOCKER_ARGS = '--network=host'

deploy-docker:
	docker run --rm \
		-v ${CURDIR}/../../:/opt/gosh/contracts \
		-v ${CURDIR}/../../multisig/Giver.seed:/tmp/Giver.seed \
		-v ${CURDIR}/../../multisig/Giver.addr:/tmp/Giver.addr \
		-v ${CURDIR}/../../multisig/Giver.network:/tmp/Giver.network \
		-v ${CURDIR}/../../../tests/util.sh:/tmp/util.sh \
		${EXTRA_DOCKER_ARGS} \
		-e VERSIONCONTROLLER_SEED_FILE_OUT="gosh.seed" \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/v1.0.0/gosh/scripts && ./deploy.sh'
