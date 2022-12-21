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
RUN apt update && apt install -y jq ca-certificates
# TODO: will go away after ever sdk supports deno land
WORKDIR /app/node_modules/@eversdk/lib-web
COPY --link node_modules/@eversdk/lib-web/index.js ./
COPY --link node_modules/@eversdk/lib-web/eversdk.wasm ./

COPY --link --from=tonos-cli /usr/local/cargo/bin/tonos-cli /usr/local/bin/tonos-cli
WORKDIR /app
COPY --link src src
COPY --link bin bin
COPY --link abi abi
RUN deno cache src/_deps.ts

ENV TONOSCLI_CONFIG=/tonos-cli.conf.json
RUN <<EOF
tonos-cli config --is_json true
tonos-cli config \
    endpoint add \
    gosh https://bhs01.network.gosh.sh/,https://eri01.network.gosh.sh,https://gra01.network.gosh.sh
tonos-cli config --url gosh
EOF
