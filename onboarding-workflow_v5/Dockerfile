# syntax=docker/dockerfile:1.5.2

FROM denoland/deno:debian-1.34.3 as base_deno
RUN apt update && apt install -y jq git wget libssl-dev libc6 curl

FROM base_deno
# TODO: will go away after ever sdk supports deno land
WORKDIR /app/node_modules/@eversdk/lib-web
COPY --link node_modules/@eversdk/lib-web/index.js ./
COPY --link node_modules/@eversdk/lib-web/eversdk.wasm ./

COPY --link --from=teamgosh/gosh-cli:0.2.0 /usr/local/bin/gosh-cli /usr/local/bin/gosh-cli

WORKDIR /workdir
ARG BRANCH=dev
ENV BRANCH=${BRANCH}
RUN <<EOF
    set -ex
    echo "$BRANCH"
    git clone --branch "$BRANCH" --depth 1 https://github.com/gosh-sh/gosh.git gosh
    cd gosh
    bash install.sh
    mv $HOME/.gosh/git-remote-gosh* /usr/local/bin/
    cd ..
    rm -rf gosh
EOF
# WARNING: change workdir after

WORKDIR /app/src
COPY --link src/_deps.ts _deps.ts
RUN deno cache _deps.ts

WORKDIR /app
COPY --link src src
COPY --link bin bin
COPY --link abi abi
COPY --link emails emails

ARG GOSH_ENDPOINTS
ENV GOSH_ENDPOINTS=${GOSH_ENDPOINTS}
ENV GOSHCLI_CONFIG=/gosh-cli.conf.json

# TODO fix endpoints
RUN <<EOF
    gosh-cli config --is_json true
    gosh-cli config -e ${GOSH_ENDPOINTS}
EOF
