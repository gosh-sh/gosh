CURRENT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
GOSH_PACKAGE_DIR := $(abspath $(CURRENT_DIR)/../react-gosh)
TARGET_DIR := $(abspath $(target-dir))
DOCKER_WEB_PORT_OUT ?= 3000
DOCKER_WEB_CONTAINER_NAME ?= gosh-web
DOCKER_RUN_ARGS ?= -p ${DOCKER_WEB_PORT_OUT}:3000
REACT_APP_ISDOCKEREXT ?= true
ENV ?= dockerprod
MOUNT_DIR ?= $(CURRENT_DIR)


.PHONY: build
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
	# need this to have general solution for both: docker extension and no-extension
	sudo chown -R $$USER:$$USER ./build
	cp -r ./build/* $(TARGET_DIR)

.PHONY: run
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
	  pnpm install && pnpm run wasm && pnpm run start:$(ENV)"

.PHONY: clean
clean:
	-rm -rf ../react-gosh/.pnpm-store
	-rm -rf ../react-gosh/dist
	-rm -rf ../react-gosh/node_modules
	-rm -rf ../react-gosh/package-lock.json
	-rm -rf ../react-gosh/pnpm-lock.yaml
	-rm -rf ../react-gosh/react-gosh-1.0.0.tgz
	-rm -rf .pnpm-store
	-rm -rf build
	-rm -rf node_modules
	-rm -rf package-lock.json
	-rm -rf pnpm-lock.yaml
	-rm -rf rim.cache.json
