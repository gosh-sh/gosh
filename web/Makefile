CURRENT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
GOSH_PACKAGE_DIR := $(abspath $(CURRENT_DIR)/../react-gosh)
TARGET_DIR := $(abspath $(target-dir))
DOCKER_WEB_PORT_OUT ?= 3000
DOCKER_WEB_CONTAINER_NAME ?= gosh-web
DOCKER_RUN_ARGS ?= -p ${DOCKER_WEB_PORT_OUT}:3000
REACT_APP_ISDOCKEREXT ?= true
ENV ?= dockerprod
MOUNT_DIR ?= $(CURRENT_DIR)


build:
	mkdir -p build
	docker run \
	  --rm \
	  --volume $(CURRENT_DIR):/workdir \
	  --volume $(GOSH_PACKAGE_DIR):/react-gosh \
	  --env REACT_APP_ISDOCKEREXT=${REACT_APP_ISDOCKEREXT} \
	  --env BUILD_PATH=/dest \
	  --volume $(abspath ./build):/dest \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  node:18.8.0-alpine \
	  sh -c "npm install -g pnpm && \
	  chown -R 1000:1000 /root && cd /react-gosh && pnpm install && cd /workdir && pnpm run update-react-gosh && \
	  pnpm install && pnpm run wasm && pnpm run build:$(ENV)"
	cp -r ./build/* $(TARGET_DIR)

run:
	mkdir -p build
	docker run \
	  -d \
	  --volume ${MOUNT_DIR}:/workdir \
	  --volume $(GOSH_PACKAGE_DIR):/react-gosh \
	  --env REACT_APP_ISDOCKEREXT=${REACT_APP_ISDOCKEREXT} \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  --name ${DOCKER_WEB_CONTAINER_NAME} \
	  ${DOCKER_RUN_ARGS} \
	  node:18.8.0-alpine \
	  sh -c "npm install -g pnpm && \
	  chown -R 1000:1000 /root && cd /react-gosh && pnpm install && cd /workdir && pnpm run update-react-gosh && \
	  pnpm install && pnpm run wasm && pnpm link run-if-modified && pnpm run start:$(ENV)"

.PHONY: build
