DOCKER              ?= docker
DOCKER_BUILDER_NAME ?= public-gosh-builder
PLATFORM            ?= linux/amd64,linux/arm64
PROGRESS            ?= auto
# PROGRESS            ?= plain
DOCKER_BUILDX       ?= ${DOCKER} buildx --builder ${DOCKER_BUILDER_NAME} build

.DEFAULT_GOAL := test

TARGET_DIR  := $(abspath $(target-dir))
TARGET_ARCH := "x86_64-unknown-linux-gnu"

GIT_COMMIT := $(shell git rev-parse HEAD)
GIT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD | tr / _)

IMAGE_NAME := teamgosh/git
# use current branch if not set
IMAGE_TAG  ?= ${GIT_BRANCH}

# TAG_COMMIT := ${IMAGE_NAME}:${GIT_COMMIT}
FULL_IMAGE_NAME ?= ${IMAGE_NAME}:${IMAGE_TAG}
TAG_LATEST := ${IMAGE_NAME}:latest

.PHONY: clear_screen
clear_screen:
	-clear && printf '\e[3J'

.PHONY: clear_abi
clear_abi:
	-rm ./resources/*.abi.json

.PHONY: copy_abi
copy_abi: clear_abi
	-mkdir -p ./resources
	-cp ../contracts/gosh/*.abi.json ./resources/

.PHONY: build
build: copy_abi clear_screen
	cargo build --release --bin git-remote-gosh --target=${TARGET_ARCH}

.PHONY: install
install: copy_abi clear_screen
	cargo install --path .

.PHONY: test
test: copy_abi clear_screen
	cargo test


.PHONY: qemu
qemu: ## may need to setup qemu
	docker run --privileged --rm tonistiigi/binfmt --install all

.PHONY: prepare-builder
prepare-builder: qemu ## prepare docker buildx builder
	@echo === prepare-builder
	( ${DOCKER} buildx inspect ${DOCKER_BUILDER_NAME} ) || ${DOCKER} buildx create \
		--name ${DOCKER_BUILDER_NAME} \
		${DOCKER_BUILDER_ARGS} \
		--driver docker-container

.PHONY: bench
bench: copy_abi prepare-builder
	@echo === build + publish
	${DOCKER_BUILDX} \
		--progress=${PROGRESS} \
		--platform ${PLATFORM} \
		-t ${FULL_IMAGE_NAME} \
		${DOCKER_BUILDX_ARGS} \
		\
		-f Dockerfile \
		.

.PHONY: publish
publish: copy_abi prepare-builder
	@echo === build + publish
	${DOCKER_BUILDX} \
		--push \
		--progress=${PROGRESS} \
		--platform ${PLATFORM} \
		-t ${FULL_IMAGE_NAME} \
		${DOCKER_BUILDX_ARGS} \
		\
		-f Dockerfile \
		.

.PHONY: publish-alpine
publish-alpine: copy_abi prepare-builder
	@echo === build + publish
	${DOCKER_BUILDX} \
		--push \
		--progress=plain \
		--platform ${PLATFORM} \
		-t ${FULL_IMAGE_NAME}-alpine \
		${DOCKER_BUILDX_ARGS} \
		\
		-f Dockerfile.alpine \
		.

.PHONY: publish-latest
publish-latest: publish-branch
	${DOCKER} pull ${FULL_IMAGE_NAME}
	${DOCKER} tag ${FULL_IMAGE_NAME} ${TAG_LATEST}
	${DOCKER} push ${TAG_LATEST}


.PHONY: pull
pull:
	docker pull ${FULL_IMAGE_NAME}
