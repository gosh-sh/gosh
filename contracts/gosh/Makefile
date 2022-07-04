tvcs = tree tag snapshot repository goshwallet goshdao goshconfig gosh diff daocreator commit
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
