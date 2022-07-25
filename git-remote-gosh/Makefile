.DEFAULT_GOAL := test

TARGET_DIR := $(abspath $(target-dir))

clear_screen:
	-clear && printf '\e[3J'

clear_abi:
	-rm ./resources/*.abi.json

copy_abi: clear_abi
	-mkdir -p ./resources
	-cp ../contracts/gosh/*.abi.json ./resources/

build: copy_abi clear_screen
	cargo build --release --bin git-remote-gosh
	cp ./target/release/git-remote-gosh $(TARGET_DIR)/git-remote-gosh

test: copy_abi clear_screen
	cargo test

bench: copy_abi
	docker buildx build -t git-remote-gosh .

.PHONY: build clear_abi copy_abi clear_screen test
