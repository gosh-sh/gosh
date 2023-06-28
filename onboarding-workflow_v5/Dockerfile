# syntax=docker/dockerfile:1.5.2

FROM denoland/deno:debian-1.33.2 as base_deno
RUN apt update && apt install -y jq git wget libssl1.1 libc6 curl

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
#    echo "$BRANCH"
#    git clone --branch "$BRANCH" --depth 1 https://github.com/gosh-sh/gosh.git gosh
#    cd gosh
#    bash install.sh
#    mv $HOME/.gosh/git-remote-gosh* /usr/local/bin/
#    cd ..
#    rm -rf gosh
    wget "https://artprodsu6weu.artifacts.visualstudio.com/A1e9816a3-e2da-406c-be55-fff7d5f4b640/9c7d72d7-ac17-46c4-9a51-22e640f7c2f5/_apis/artifact/cGlwZWxpbmVhcnRpZmFjdDovL3NhbS1nb3NoL3Byb2plY3RJZC85YzdkNzJkNy1hYzE3LTQ2YzQtOWE1MS0yMmU2NDBmN2MyZjUvYnVpbGRJZC8xMTk2L2FydGlmYWN0TmFtZS9saW51eC1hbWQ2NA2/content?format=file&subPath=%2Fgit-remote-gosh_v5_1_0" -O git-remote-gosh_v5_1_0
    wget "https://artprodsu6weu.artifacts.visualstudio.com/A1e9816a3-e2da-406c-be55-fff7d5f4b640/9c7d72d7-ac17-46c4-9a51-22e640f7c2f5/_apis/artifact/cGlwZWxpbmVhcnRpZmFjdDovL3NhbS1nb3NoL3Byb2plY3RJZC85YzdkNzJkNy1hYzE3LTQ2YzQtOWE1MS0yMmU2NDBmN2MyZjUvYnVpbGRJZC8xMTc4L2FydGlmYWN0TmFtZS9saW51eC1hbWQ2NA2/content?format=file&subPath=%2Fgit-remote-gosh" -O git-remote-gosh
    chmod +x git-remote-gosh_v5_1_0
    chmod +x git-remote-gosh
    ./git-remote-gosh --version
    ./git-remote-gosh_v5_1_0 --version
    echo git-remote-gosh_v5_1_0 > dispatcher.ini
    mv git-remote-gosh* /usr/local/bin/
    mv dispatcher.ini /usr/local/bin/
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
