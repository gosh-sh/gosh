CURRENT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
TARGET_DIR := $(realpath $(target-dir))

build:
	docker run \
	  --rm \
	  --volume $(CURRENT_DIR):/workdir \
	  --env REACT_APP_ISDOCKEREXT=true \
          --env BUILD_PATH=/dest \
	  --volume $(TARGET_DIR):/dest \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  node:18.2.0-alpine \
          sh -c "npm install && npm run build:dockerprod"

.PHONY: build

