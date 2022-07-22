#!/bin/bash
set -e

# 

# params: repo commit_hash
# output: gosh_hash
NETWORKS=$1
GOSH_NETWORK=$2
GOSH_ROOT_CONTRACT_ADDRESS=$3
REPOSITORY_NAME=$4
COMMIT_HASH=$5

GOSH_NETWORK="net.ton.dev"

GOSH_REMOTE_URL=gosh::${GOSH_NETWORK}://${GOSH_ROOT_CONTRACT_ADDRESS}/"$REPOSITORY_NAME"


{
    LAST_PWD=$(pwd)
    mkdir -p /workdir/"$REPOSITORY_NAME"
    cd /workdir/"$REPOSITORY_NAME"
    rm -rf *

    git clone "$GOSH_REMOTE_URL" "$REPOSITORY_NAME"

    cd "$REPOSITORY_NAME"
    git fetch -a
    git checkout "$COMMIT_HASH"

    IDDFILE=/workdir/"$REPOSITORY_NAME".iidfile

    docker buildx build \
        -f goshfile.yaml \
        --load \
        --iidfile "$IDDFILE" \
        --no-cache \
        .

    TARGET_IMAGE=$(< "$IDDFILE")

    if [[ -z "$TARGET_IMAGE" ]]; then
        echo "Error: Image was not built"
        exit 1
    fi

    GOSH_SHA=$(/command/gosh-image-sha.sh "$TARGET_IMAGE")
    docker rmi "$TARGET_IMAGE" || true

    cd "$LAST_PWD"
} >&2

echo "$GOSH_SHA"
