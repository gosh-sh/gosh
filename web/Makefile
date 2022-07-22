CURRENT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
TARGET_DIR := $(realpath $(target-dir))

build: $(shell find res -type f -not -path "$(TARGET_DIR)")
	docker run \
	  --volume $(CURRENT_DIR):/workdir \
	  --volume $(TARGET_DIR):/workdir/build \
	  --workdir "/workdir" \
	  node:18.2.0 \
          sh -c "npm install && npm run build:prod"

.PHONY: build
