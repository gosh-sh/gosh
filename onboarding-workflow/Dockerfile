# syntax=docker/dockerfile:1.4.3

FROM rust:1.65.0-bullseye as tonos-cli
WORKDIR /workdir
RUN git clone --depth 1 --branch v0.28.1 https://github.com/tonlabs/tonos-cli.git tonos-cli
RUN \
    --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/target \
    cargo install \
    --path /workdir/tonos-cli \
    --target-dir=/target

FROM denoland/deno:debian-1.29.1
RUN apt update && apt install -y jq ca-certificates git libssl1.1 libc6
# TODO: will go away after ever sdk supports deno land
WORKDIR /app/node_modules/@eversdk/lib-web
COPY --link node_modules/@eversdk/lib-web/index.js ./
COPY --link node_modules/@eversdk/lib-web/eversdk.wasm ./

COPY --link --from=tonos-cli /usr/local/cargo/bin/tonos-cli /usr/local/bin/tonos-cli

COPY --link --from=teamgosh/git:3.0.5 /usr/local/bin/git-remote-gosh /usr/local/bin/git-remote-gosh

WORKDIR /app/src
COPY --link src/_deps.ts _deps.ts
RUN deno cache _deps.ts

WORKDIR /app
COPY --link src src
COPY --link bin bin
COPY --link abi abi

ARG GOSH_ENDPOINTS
ENV GOSH_ENDPOINTS=${GOSH_ENDPOINTS}
ENV TONOSCLI_CONFIG=/tonos-cli.conf.json

RUN <<EOF
tonos-cli config --is_json true
tonos-cli config \
    endpoint add \
    gosh ${GOSH_ENDPOINTS}
tonos-cli config --url gosh
EOF
