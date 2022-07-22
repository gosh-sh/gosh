CURRENT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
TARGET_DIR := $(abspath $(target-dir))

build:
	docker run \
	  --rm \
	  --volume $(CURRENT_DIR):/workdir \
	  --env REACT_APP_ISDOCKEREXT=true \
          --env BUILD_PATH=/dest \
	  --volume $(abspath ./build):/dest \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  node:18.2.0-alpine \
          sh -c "npm install && cd run-if-modified && npm link && cd - && npm link run-if-modified && npm run build:dockerprod"
	cp -r ./build/* $(TARGET_DIR)
.PHONY: build

