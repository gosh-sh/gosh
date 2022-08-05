CURRENT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
TARGET_DIR := $(abspath $(target-dir))

build:
	mkdir -p build
	docker run \
	  --rm \
	  --volume $(CURRENT_DIR):/workdir \
	  --env REACT_APP_ISDOCKEREXT=true \
	  --env BUILD_PATH=/dest \
	  --volume $(abspath ./build):/dest \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  node:18.2.0-alpine \
	  sh -c "npm install && cp -r ./eversdk-patch/lib-web/* ./node_modules/@eversdk/lib-web/ && \
	  npm run wasm && cd run-if-modified && npm link && cd - && npm link run-if-modified && npm run build:dockerprod"
	cp -r ./build/* $(TARGET_DIR)

run:
	mkdir -p build
	docker run \
	  -d \
	  --volume $(CURRENT_DIR):/workdir \
	  --env REACT_APP_ISDOCKEREXT=false \
	  --platform linux/amd64 \
	  --workdir "/workdir" \
	  --name gosh-web \
	  -p 3000:3000 \
	  node:18.2.0-alpine \
	  sh -c "npm install && cp -r ./eversdk-patch/lib-web/* ./node_modules/@eversdk/lib-web/ && \
	  npm run wasm && cd run-if-modified && npm link && cd - && npm link run-if-modified && npm run start:$(ENV)"

.PHONY: build
