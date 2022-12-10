# syntax=docker/dockerfile:1.4.2

ARG GOSH_GIT_IMAGE=teamgosh/git

FROM ${GOSH_GIT_IMAGE} as gosh_git
FROM --platform=${BUILDPLATFORM} node:18-bullseye-slim as node_slim


FROM node_slim
ARG gosh_abi_local_dir
ARG detailed_description
ARG this_version_updates
ARG ui_v2

LABEL org.opencontainers.image.title="Gosh" \
    org.opencontainers.image.description="Build your decentralized and secure software supply chain with Docker and Git Open Source Hodler" \
    org.opencontainers.image.vendor="GOSH" \
    com.docker.desktop.extension.api.version=">=0.2.1" \
    com.docker.desktop.extension.icon="http://icons.gosh.run/Gosh%20icon%20-%20black.svg" \
    com.docker.extension.detailed-description=${detailed_description} \
    com.docker.extension.publisher-url="https://www.gosh.sh" \
    com.docker.extension.changelog=${this_version_updates}

RUN <<EOF
    set -ex
    apt-get update -qy
    apt-get install -qy git docker.io bash ca-certificates
EOF

COPY --link --from=docker/buildx-bin:latest /buildx /usr/libexec/docker/cli-plugins/docker-buildx

COPY --link metadata.json /
COPY --link ./vm/docker-compose.yaml /
COPY --link ./vm/commands/ /command/
COPY --link $gosh_abi_local_dir /command/tools/gosh
COPY --link $ui_v2 /ui/v2

COPY --link icon.svg /
COPY --link index.html /ui/index.html

ARG TARGETOS TARGETARCH
COPY --link --from=gosh_git /usr/local/bin/git-remote-gosh /usr/local/bin/git-remote-gosh

ENV GOSH_PROTO=http
ENV DOCKER_BUILDKIT=1
ENV DOCKER_CLI_EXPERIMENTAL=enabled
ENV NODE_ENV=production

CMD [ "sleep", "infinity" ]
