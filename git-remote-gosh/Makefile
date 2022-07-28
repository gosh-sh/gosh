.DEFAULT_GOAL := test

TARGET_DIR := $(abspath $(target-dir))
TARGET_ARCH := "x86_64-unknown-linux-gnu"

clear_screen:
	-clear && printf '\e[3J'

clear_abi:
	-rm ./resources/*.abi.json

copy_abi: clear_abi
	-mkdir -p ./resources
	-cp ../contracts/gosh/*.abi.json ./resources/

build: copy_abi clear_screen 
	cargo build --release --bin git-remote-gosh --target=${TARGET_ARCH}
	mkdir -p $(TARGET_DIR)/git-remote-gosh || true
	if [ "${TARGET_ARCH}" = "x86_64-pc-windows-gnu" ]; then cp ./target/${TARGET_ARCH}/release/git-remote-gosh.exe $(TARGET_DIR)/git-remote-gosh-${TARGET_ARCH}; fi;
	if [ "${TARGET_ARCH}" = "x86_64-unknown-linux-gnu" ]; then cp ./target/${TARGET_ARCH}/release/git-remote-gosh $(TARGET_DIR)/git-remote-gosh-${TARGET_ARCH}; fi;

test: copy_abi clear_screen
	cargo test

bench: copy_abi
	docker buildx build -t git-remote-gosh .

.PHONY: build clear_abi copy_abi clear_screen test
