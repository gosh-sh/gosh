tvcs = SMVAccount SMVTokenLocker LockerPlatform SMVClient SMVProposal TokenRootOwner
cpfl = profile profiledao profileindex

# build-contracts:
# 	./compile_all.sh
# 	./compile_TIP3.sh

build-contracts:
	for i in $(cpfl); do \
		cp ../../$$i.sol ../$$i.sol || exit $$@; \
		if [ "${target-dir}" != "" ] ; then cp $$i.* ${target-dir}/ ; fi; \
	done \

	for i in $(tvcs); do \
		../../compiler/sold --tvm-version gosh $$i.sol || exit $$@; \
		../../compiler/tvm_linker compile $$i.code -o $$i.tvc --lib ../../compiler/stdlib_sol.tvm || exit $$@; \
		if [ "${target-dir}" != "" ] ; then cp $$i.* ${target-dir}/ ; fi; \
	done \

	../../compiler/sold --tvm-version gosh ./External/tip3/TokenRoot.sol || exit $$@; \
	../../compiler/tvm_linker compile TokenRoot.code -o TokenRoot.tvc --lib ../../compiler/stdlib_sol.tvm || exit $$@; \

	../../compiler/sold --tvm-version gosh ./External/tip3/TokenWallet.sol || exit $$@; \
	../../compiler/tvm_linker compile TokenWallet.code -o TokenWallet.tvc --lib ../../compiler/stdlib_sol.tvm || exit $$@; \

	rm *.debug.json;

prepare-docker:
	docker build -t everdev:latest ../../../../.ci/

build-contracts-docker:
	docker run -it --rm \
		-v ${CURDIR}/../../:/opt/gosh/contracts \
		everdev:latest \
		/bin/bash -c 'cd /opt/gosh/contracts/smv && make build-contracts'

# build-contracts-docker:
# 	docker run -it --rm \
# 		-v ${CURDIR}/../:/opt/gosh/contracts \
# 		everdev:latest \
# 		/bin/bash -c 'cd /opt/gosh/contracts/smv && ./compile_TIP3.sh'

# 	docker run -it --rm \
# 		-v ${CURDIR}/../:/opt/gosh/contracts \
# 		everdev:latest \
# 		/bin/bash -c 'cd /opt/gosh/contracts/smv && ./compile_all.sh'
