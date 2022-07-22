IMAGE?=teamgosh/docker-extension
#IMAGE?=teamgosh-docker-extension
TAG?=1.0.2
LOCAL_TEMP_DIR=./.tmp

PLATFORM             ?= linux/amd64,linux/arm/v7,linux/arm64
DETAILED_DESCRIPTION ?= $(shell cat description.html)

.DEFAULT_GOAL := debug

rm: ## Remove previous extension installations
	docker extension rm teamgosh-docker-extension || true
	docker extension rm teamgosh/docker-extension || true


build: ## Build service image to be deployed as a desktop extension
	-rm -rf $(LOCAL_TEMP_DIR)
	-mkdir $(LOCAL_TEMP_DIR)
	-cp -r ../content-signature $(LOCAL_TEMP_DIR)
	-cp -r ../git-remote-gosh $(LOCAL_TEMP_DIR)
	-mkdir $(LOCAL_TEMP_DIR)/gosh
	-cp -r ../gosh/*.abi.json $(LOCAL_TEMP_DIR)/gosh/
	docker buildx build \
	  --tag=$(IMAGE):$(TAG) \
	  --tag=$(IMAGE):latest \
	  --build-arg content_signature_local_dir="$(LOCAL_TEMP_DIR)/content-signature" \
	  --build-arg git_remote_gosh_local_dir="$(LOCAL_TEMP_DIR)/git-remote-gosh" \
	  --build-arg gosh_abi_local_dir="$(LOCAL_TEMP_DIR)/gosh" \
	  --output=type=docker \
	  .
	-rm -rf $(LOCAL_TEMP_DIR)

install: rm build ## Install the extension
	docker extension install $(IMAGE):$(TAG)

update: build ## Update the extension
	docker extension update $(IMAGE):$(TAG)

debug: update ## Debug the extension
	docker extension dev debug $(IMAGE):$(TAG)

publish: ## Publish the extension
	-rm -rf $(LOCAL_TEMP_DIR)
	-mkdir $(LOCAL_TEMP_DIR)
	-cp -r ../content-signature $(LOCAL_TEMP_DIR)
	-cp -r ../git-remote-gosh $(LOCAL_TEMP_DIR)
	-mkdir $(LOCAL_TEMP_DIR)/gosh
	-cp -r ../gosh/*.abi.json $(LOCAL_TEMP_DIR)/gosh/
	docker buildx build \
	  --no-cache \
	  --platform $(PLATFORM) \
	  --tag=$(IMAGE):$(TAG) \
	  --tag=$(IMAGE):latest \
	  --build-arg content_signature_local_dir="$(LOCAL_TEMP_DIR)/content-signature" \
	  --build-arg git_remote_gosh_local_dir="$(LOCAL_TEMP_DIR)/git-remote-gosh" \
	  --build-arg gosh_abi_local_dir="$(LOCAL_TEMP_DIR)/gosh" \
	  --build-arg detailed_description="$(DETAILED_DESCRIPTION)" \
	  --push \
	  .
	-rm -rf $(LOCAL_TEMP_DIR)



.PHONY: build install update debug publish
