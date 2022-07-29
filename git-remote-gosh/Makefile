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
	if [ "${TARGET_ARCH}" = "x86_64-pc-windows-gnu" ]; then cp ./target/${TARGET_ARCH}/release/git-remote-gosh.exe $(TARGET_DIR)/git-remote-gosh-${TARGET_ARCH}.exe; fi;
	if [ "${TARGET_ARCH}" = "x86_64-unknown-linux-gnu" ]; then cp ./target/${TARGET_ARCH}/release/git-remote-gosh $(TARGET_DIR)/git-remote-gosh-${TARGET_ARCH}; fi;

test: copy_abi clear_screen
	cargo test

bench: copy_abi
	docker buildx build -t git-remote-gosh .

.PHONY: build clear_abi copy_abi clear_screen test
# DOCKER              ?= docker
# DOCKER_BUILDER_NAME ?= public-gosh-builder
# DOCKER_BUILDX       ?= ${DOCKER} buildx --builder ${DOCKER_BUILDER_NAME} build
# PLATFORM            ?= linux/amd64,linux/arm64
# PROGRESS            ?= plain

# GIT_COMMIT := $(shell git rev-parse HEAD)
# GIT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD | tr / _)

# # main ==> docker:latest
# ifeq "${GIT_BRANCH}" "main"
# 	GIT_BRANCH := "latest"
# endif

# .DEFAULT_GOAL := test

# # TARGET_DIR := $(abspath $(target-dir))

# clear_screen:
# 	-clear && printf '\e[3J'

# clear_abi:
# 	-rm ./resources/*.abi.json

# copy_abi: clear_abi
# 	-mkdir -p ./resources
# 	-cp ../contracts/gosh/*.abi.json ./resources/

# build: copy_abi clear_screen
# 	cargo build --release
# 	cp ./target/release/git-remote-gosh $(TARGET_DIR)/git-remote-gosh

# test: copy_abi clear_screen
# 	cargo test

# qemu: ## may need to setup qemu
# 	docker run --privileged --rm tonistiigi/binfmt --install all

# debug_build: copy_abi
# 	@echo === prepare-builder
# 	( ${DOCKER} buildx inspect ${DOCKER_BUILDER_NAME} ) || ${DOCKER} buildx create \
# 		--name ${DOCKER_BUILDER_NAME} \
# 		--driver docker-container

# 	@echo === build + publish
# 	${DOCKER_BUILDX} \
# 		--load \
# 		-t teamgosh/git \
# 		--progress=${PROGRESS} \
# 		\
# 		-f Dockerfile \
# 		.

# bench: copy_abi
# 	@echo === prepare-builder
# 	( ${DOCKER} buildx inspect ${DOCKER_BUILDER_NAME} ) || ${DOCKER} buildx create \
# 		--name ${DOCKER_BUILDER_NAME} \
# 		--driver docker-container

# 	@echo === build + publish
# 	${DOCKER_BUILDX} \
# 		--progress=${PROGRESS} \
# 		--platform ${PLATFORM} \
# 		\
# 		-f Dockerfile \
# 		.


# publish: copy_abi
# 	@echo === prepare-builder
# 	( ${DOCKER} buildx inspect ${DOCKER_BUILDER_NAME} ) || ${DOCKER} buildx create \
# 		--name ${DOCKER_BUILDER_NAME} \
# 		--driver docker-container

# 	@echo === build + publish
# 	${DOCKER_BUILDX} \
# 		--push \
# 		--progress=${PROGRESS} \
# 		--platform ${PLATFORM} \
# 		-t teamgosh/git:${GIT_COMMIT} \
# 		-t teamgosh/git:${GIT_BRANCH} \
# 		\
# 		-f Dockerfile \
# 		.

# publish_latest: copy_abi
# 	@echo === prepare-builder
# 	( ${DOCKER} buildx inspect ${DOCKER_BUILDER_NAME} ) || ${DOCKER} buildx create \
# 		--name ${DOCKER_BUILDER_NAME} \
# 		--driver docker-container

# 	@echo === build + publish
# 	${DOCKER_BUILDX} \
# 		--push \
# 		--progress=${PROGRESS} \
# 		--platform ${PLATFORM} \
# 		-t teamgosh/git:${GIT_COMMIT} \
# 		-t teamgosh/git:${GIT_BRANCH} \
# 		-t teamgosh/git:latest \
# 		\
# 		-f Dockerfile \
# 		.

# pull:
# 	docker pull teamgosh/git:${GIT_BRANCH}


# .PHONY: clean build clear_abi copy_abi clear_screen test qemu debug_build bench publish publish_latest pull
