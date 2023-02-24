# syntax=docker/dockerfile:1.5

FROM denoland/deno:debian-1.30.3
RUN apt update && apt install -y jq ca-certificates git libssl1.1 libc6
# TODO: will go away after ever sdk supports deno land
WORKDIR /app/node_modules/@eversdk/lib-web
COPY --link node_modules/@eversdk/lib-web/index.js ./
COPY --link node_modules/@eversdk/lib-web/eversdk.wasm ./

COPY --link --from=teamgosh/gosh-cli:0.2.0 /usr/local/bin/gosh-cli /usr/local/bin/gosh-cli
COPY --link --from=teamgosh/git:3.0.9 /usr/local/bin/git-remote-gosh /usr/local/bin/git-remote-gosh

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
