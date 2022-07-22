#!/bin/sh

if [ -z "$1" ]; then
    echo "Usage: $0 target_image"
    exit 1
fi

TARGET_IMAGE=$1

{
    docker pull "$TARGET_IMAGE"
    CONTAINER_ID=$(docker create "$TARGET_IMAGE" /bin/sh)

    mkdir -p "$CONTAINER_ID"

    cd "$CONTAINER_ID" || exit 1
    docker export "$CONTAINER_ID" | tar --exclude=etc/mtab --exclude=proc --exclude=dev -xf -
    GOSH_SHA256=$(find . -type f -exec sha256sum -b {} + | LC_ALL=C sort | sha256sum | awk '{ print $1 }')
    cd .. || exit 1

    docker rm -fv "$CONTAINER_ID" >/dev/null
    rm -rf "$CONTAINER_ID"
} > /dev/null 2>&1

printf 'sha256:%s' "$GOSH_SHA256"
