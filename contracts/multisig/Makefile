tvcs = MultisigWallet
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
	if [ "${target-dir}" != "" ] ; then tar -cf goshmultisig.tar ${target-dir}; fi;
