build-contracts:
	./compile_all.sh
	./compile_TIP3.sh

prepare-docker:
	docker build -t everdev:latest ../../

build-contracts-docker:
	docker run -it --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/smv && ./compile_TIP3.sh'

	docker run -it --rm \
		-v ${CURDIR}/../:/opt/gosh/contracts \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/smv && ./compile_all.sh'