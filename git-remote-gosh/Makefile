.DEFAULT_GOAL := test

clear_screen:
	-clear && printf '\e[3J'

clear_abi:
	-rm ./resources/*.abi.json

copy_abi: clear_abi
	-mkdir -p ./resources
	-cp ../contracts/gosh/*.abi.json ./resources/

build: copy_abi clear_screen
	cargo build

test: copy_abi clear_screen
	cargo test

.PHONY: build clear_abi copy_abi clear_screen test
