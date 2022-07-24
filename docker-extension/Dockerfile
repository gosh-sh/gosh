# syntax=docker/dockerfile:1.4
FROM --platform=${BUILDPLATFORM} node:18-slim as base


FROM --platform=$BUILDPLATFORM node:18.6.0 AS client-builder
WORKDIR /ui
# cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui /ui
# RUN yarn install --silent
# RUN yarn build --silent
RUN npm install
RUN npm run build


FROM base
ARG content_signature_local_dir
ARG git_remote_gosh_local_dir
ARG gosh_abi_local_dir
ARG detailed_description
ARG ui_v2

LABEL org.opencontainers.image.title="Gosh" \
    org.opencontainers.image.description="Build your decentralized and secure software supply chain with Docker and Git Open Source Hodler" \
    org.opencontainers.image.vendor="EverX" \
    com.docker.desktop.extension.api.version=">=0.2.1" \
    com.docker.desktop.extension.icon="http://icons.gosh.run/Gosh%20icon%20-%20black.svg" \
    com.docker.extension.detailed-description=${detailed_description} \
    com.docker.extension.publisher-url="https://www.gosh.sh"

RUN <<EOF
    set -ex
    apt-get update -qy
    apt-get install -qy git docker bash ca-certificates
EOF

COPY --link --from=docker/buildx-bin:latest /buildx /usr/libexec/docker/cli-plugins/docker-buildx

COPY --link metadata.json /
COPY --link ./vm/docker-compose.yaml /
COPY --link ./vm/commands/ /command/
COPY --link $content_signature_local_dir /command/tools/content-signature
COPY --link $git_remote_gosh_local_dir /command/tools/git-remote-gosh
COPY --link $gosh_abi_local_dir /command/tools/gosh
COPY --link $ui_v2 /ui/v2
COPY --from=client-builder /ui/build ui/v1

ENV GOSH_PROTO=http
ENV DOCKER_BUILDKIT=1
ENV DOCKER_CLI_EXPERIMENTAL=enabled
ENV NODE_ENV=production

ARG TARGETOS TARGETARCH

COPY --link icon.svg /

COPY --link index.html /ui/index.html

CMD [ "sleep", "infinity" ]
