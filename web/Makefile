CURRENT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
TARGET_DIR := $(realpath $(target-dir))

clear_screen:
	-clear && printf '\e[3J'

build: clear_screen $(shell find res -type f -not -path "$(TARGET_DIR)")
	docker run \
	  --rm \
	  --volume $(CURRENT_DIR):/workdir \
          --env BUILD_PATH=/dest \
	  --volume $(TARGET_DIR):/dest \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  node:18.2.0-alpine \
          sh -c "npm install && npm run build:prod"

.PHONY: build

