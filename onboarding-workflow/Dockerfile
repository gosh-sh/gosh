# syntax=docker/dockerfile:1.5

FROM denoland/deno:debian-1.31.1 as base_deno
RUN apt update && apt install -y jq ca-certificates git libssl1.1 libc6 curl

FROM base_deno as git_remote_gosh
WORKDIR /workdir
RUN <<EOF
    set -ex
    curl -fsSLO --compressed https://github.com/gosh-sh/gosh/releases/download/3.0.10/git-remote-gosh-linux-amd64.tar
    tar xf git-remote-gosh-linux-amd64.tar
    chmod +x git-remote-gosh_v2_0_0
    mv git-remote-gosh_v2_0_0 /usr/local/bin/git-remote-gosh
EOF

FROM base_deno
# TODO: will go away after ever sdk supports deno land
WORKDIR /app/node_modules/@eversdk/lib-web
COPY --link node_modules/@eversdk/lib-web/index.js ./
COPY --link node_modules/@eversdk/lib-web/eversdk.wasm ./

COPY --link --from=teamgosh/gosh-cli:0.2.0 /usr/local/bin/gosh-cli /usr/local/bin/gosh-cli
COPY --link --from=git_remote_gosh /usr/local/bin/git-remote-gosh /usr/local/bin/git-remote-gosh

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
