CURRENT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
GOSH_PACKAGE_DIR := $(abspath $(CURRENT_DIR)/../react-gosh)
TARGET_DIR := $(abspath $(target-dir))

build:
	mkdir -p build
	docker run \
	  --rm \
	  --volume $(CURRENT_DIR):/workdir \
	  --volume $(GOSH_PACKAGE_DIR):/react-gosh \
	  --env REACT_APP_ISDOCKEREXT=true \
	  --env BUILD_PATH=/dest \
	  --volume $(abspath ./build):/dest \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  node:18.8.0-alpine \
	  sh -c "chown -R 1000:1000 /root && cd ../react-gosh && npm install && npm run build && \
	  cd - && npm install && npm run wasm && cd run-if-modified && npm link && \
	  cd - && npm link run-if-modified && npm run build:dockerprod"
	cp -r ./build/* $(TARGET_DIR)

run:
	mkdir -p build
	docker run \
	  -d \
	  --volume $(CURRENT_DIR):/workdir \
	  --volume $(GOSH_PACKAGE_DIR):/react-gosh \
	  --env REACT_APP_ISDOCKEREXT=false \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  --name gosh-web \
	  -p 3000:3000 \
	  node:18.2.0-alpine \
	  sh -c "chown -R 1000:1000 /root && cd ../react-gosh && npm install && npm run build && \
	  cd - && npm install && npm run wasm && cd run-if-modified && npm link && \
	  cd - && npm link run-if-modified && npm run start:$(ENV)"

.PHONY: build
