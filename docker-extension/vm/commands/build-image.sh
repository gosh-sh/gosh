#!/bin/bash
set -e

# params: repo commit_hash
# output: gosh_hash
GOSH_ADDRESS=$1
REPOSITORY_NAME=$2
COMMIT_HASH=$3
DOCKERFILE=$4
TAG=$5
LABEL_GOSH_ADDRESS=$6
LABEL_GOSH_COMMIT=$7
LABEL_GOSH_IMAGE_DOCKERFILE=$8

# TODO: fix potential race condition for directories
{
    LAST_PWD=$(pwd)
    mkdir -p /workdir/"$REPOSITORY_NAME"
    cd /workdir/"$REPOSITORY_NAME"
    rm -rf ./*

    git clone "$GOSH_ADDRESS" "$REPOSITORY_NAME"

    cd "$REPOSITORY_NAME"
    git fetch -a
    git checkout "$COMMIT_HASH"

    IDDFILE=/workdir/"$REPOSITORY_NAME".iidfile

    docker buildx build \
        -f "$DOCKERFILE" \
        --load \
        --iidfile "$IDDFILE" \
        --no-cache \
        --tag "$TAG" \
        --label "$LABEL_GOSH_ADDRESS"="$GOSH_ADDRESS" \
        --label "$LABEL_GOSH_COMMIT"="$COMMIT_HASH" \
        --label "$LABEL_GOSH_IMAGE_DOCKERFILE"="$DOCKERFILE" \
        .

    TARGET_IMAGE=$(<"$IDDFILE")

    if [[ -z "$TARGET_IMAGE" ]]; then
        echo "Error: Image was not built"
        exit 1
    fi

    GOSH_SHA=$(/command/gosh-image-sha.sh "$TARGET_IMAGE")

    cd "$LAST_PWD"
} >&2

echo "$GOSH_SHA"
