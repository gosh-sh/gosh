DOCKER_REG      = teamgosh
VERSION         = latest
IMAGE_REFERENCE = ${DOCKER_REG}/sign-cli
DOCKER          = docker

# TODO: docker image tags support

all: image push_image

.PHONE: image
image:
	${DOCKER} build -f Dockerfile -t ${IMAGE_REFERENCE}:${VERSION} .

.PHONE: push_image
push_image: image
	${DOCKER} push ${IMAGE_REFERENCE}:${VERSION}

.PHONE: clean
clean:
	find . -name '*.js' -type f -delete
	find . -name '*.js.map' -type f -delete
	find . -name '*.d.ts' -type f -delete
	find . -name '*.d.ts.map' -type f -delete
	rm -f tsconfig.tsbuildinfo
