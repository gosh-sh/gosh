DOCKER              ?= docker
DOCKER_BUILDER_NAME ?= public-gosh-builder
DOCKER_BUILDX       ?= ${DOCKER} buildx --builder ${DOCKER_BUILDER_NAME} build ${DOCKER_BUILDER_ARGS}
PLATFORM       ?= linux/amd64,linux/arm64
IMAGE          ?= teamgosh/docker-extension
TAG            ?= 2.0.6
LOCAL_TEMP_DIR ?= ./.tmp

GIT_COMMIT := $(shell git rev-parse HEAD)
GIT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD | tr / _)
GOSH_GIT_IMAGE ?= teamgosh/git:${GIT_BRANCH}

DETAILED_DESCRIPTION ?= $(shell cat description.html)
THIS_VERSION_CHANGES ?= $(shell cat this-version-changes.html)

.DEFAULT_GOAL := debug

UI_V2_TARGET_DIR := $(abspath $(LOCAL_TEMP_DIR)/ui-v2)
GIT_REMOTE_GOSH_TARGET_DIR := $(abspath $(LOCAL_TEMP_DIR)/git-remote-gosh)

rm: ## Remove previous extension installations
	docker extension rm teamgosh-docker-extension || true
	docker extension rm teamgosh/docker-extension || true

clean_temp:
	-rm -rf $(LOCAL_TEMP_DIR)
	mkdir $(LOCAL_TEMP_DIR)

build-ui-v2:
	mkdir -p $(UI_V2_TARGET_DIR)
	cd ../web && make build target-dir=$(UI_V2_TARGET_DIR)

.PHONY: no-build-gosh-git-image
no-build-gosh-git-image:
	# fake target for speed up

.PHONY: build-gosh-git-image
build-gosh-git-image:
	cd ../git-remote-gosh \
		&& make publish FULL_IMAGE_NAME=${GOSH_GIT_IMAGE} PLATFORM=${PLATFORM}
	cd ../git-remote-gosh \
		&& make pull FULL_IMAGE_NAME=${GOSH_GIT_IMAGE} PLATFORM=${PLATFORM}

.PHONY: prepare-builder
prepare-builder: ## prepare docker buildx builder
	@echo === prepare-builder
	( ${DOCKER} buildx inspect ${DOCKER_BUILDER_NAME} ) || ${DOCKER} buildx create \
		--name ${DOCKER_BUILDER_NAME} \
		${DOCKER_BUILDER_ARGS} \
		--driver docker-container

build: clean_temp prepare-builder build-ui-v2 build-gosh-git-image ## Build service image to be deployed as a desktop extension
	mkdir $(LOCAL_TEMP_DIR)/gosh
	cp -r ../contracts/gosh/*.abi.json $(LOCAL_TEMP_DIR)/gosh/
	${DOCKER_BUILDX} \
	  --tag=$(IMAGE):$(TAG) \
	  --tag=$(IMAGE):latest \
	  ${DOCKER_BUILDX_ARGS} \
	  --platform $(PLATFORM) \
	  --build-arg detailed_description="${DETAILED_DESCRIPTION}" \
	  --build-arg this_version_updates="${THIS_VERSION_CHANGES}" \
	  --build-arg GOSH_GIT_IMAGE=${GOSH_GIT_IMAGE} \
	  --build-arg ui_v2="$(LOCAL_TEMP_DIR)/ui-v2" \
	  --build-arg gosh_abi_local_dir="$(LOCAL_TEMP_DIR)/gosh" \
	  --output=type=docker \
	  .

build-ci: prepare-builder build-ui-v2
	mkdir -p $(LOCAL_TEMP_DIR)/gosh
	cp -r ../contracts/gosh/*.abi.json $(LOCAL_TEMP_DIR)/gosh/
	${DOCKER_BUILDX} \
	  --tag=$(IMAGE):$(TAG) \
	  ${DOCKER_BUILDX_ARGS} \
	  --platform $(PLATFORM) \
	  --build-arg detailed_description="${DETAILED_DESCRIPTION}" \
	  --build-arg this_version_updates="${THIS_VERSION_CHANGES}" \
	  --build-arg GOSH_GIT_IMAGE=${GOSH_GIT_IMAGE} \
	  --build-arg ui_v2="$(LOCAL_TEMP_DIR)/ui-v2" \
	  --build-arg gosh_abi_local_dir="$(LOCAL_TEMP_DIR)/gosh" \
	  --push \
	  .

build-debug: clean_temp prepare-builder build-ui-v2 ## Install the extension
	-mkdir $(LOCAL_TEMP_DIR)/gosh
	cp -r ../contracts/gosh/*.abi.json $(LOCAL_TEMP_DIR)/gosh/
	${DOCKER_BUILDX} \
	  --tag=$(IMAGE):$(TAG) \
	  ${DOCKER_BUILDX_ARGS} \
	  --build-arg detailed_description="${DETAILED_DESCRIPTION}" \
	  --build-arg this_version_updates="${THIS_VERSION_CHANGES}" \
	  --build-arg GOSH_GIT_IMAGE=${GOSH_GIT_IMAGE} \
	  --build-arg ui_v2="$(LOCAL_TEMP_DIR)/ui-v2" \
	  --build-arg gosh_abi_local_dir="$(LOCAL_TEMP_DIR)/gosh" \
	  --output=type=docker \
	  .

install: rm build-debug
	docker extension install $(IMAGE):$(TAG)

update: build-debug ## Update the extension
	docker extension update $(IMAGE):$(TAG)

debug: ## Debug the extension
	docker extension dev debug $(IMAGE):$(TAG)

publish: clean_temp build-ui-v2 build-gosh-git-image ## Publish the extension
	mkdir $(LOCAL_TEMP_DIR)/gosh
	cp -r ../contracts/gosh/*.abi.json $(LOCAL_TEMP_DIR)/gosh/
	${DOCKER_BUILDX} \
	  --no-cache \
	  --platform $(PLATFORM) \
	  --tag=$(IMAGE):$(TAG) \
	  --tag=$(IMAGE):latest \
	  ${DOCKER_BUILDX_ARGS} \
	  --build-arg detailed_description="${DETAILED_DESCRIPTION}" \
	  --build-arg this_version_updates="${THIS_VERSION_CHANGES}" \
	  --build-arg GOSH_GIT_IMAGE=${GOSH_GIT_IMAGE} \
	  --build-arg ui_v2="$(LOCAL_TEMP_DIR)/ui-v2" \
	  --build-arg gosh_abi_local_dir="$(LOCAL_TEMP_DIR)/gosh" \
	  --push \
	  .


.PHONY: build install update debug publish
