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
	  --volume ${MOUNT_DIR}:/workdir \
	  --volume $(GOSH_PACKAGE_DIR):/react-gosh \
	  --env REACT_APP_ISDOCKEREXT=${REACT_APP_ISDOCKEREXT} \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  --name ${DOCKER_WEB_CONTAINER_NAME} \
	  ${DOCKER_RUN_ARGS} \
	  node:18.8.0-alpine \
	  sh -c "chown -R 1000:1000 /root && cd ../react-gosh && npm install && npm run build && \
	  cd - && npm install && npm run wasm && cd run-if-modified && npm link && \
	  cd - && npm link run-if-modified && npm run start:$(ENV)"

.PHONY: build
