#!/bin/sh

if [ -z "$1" ]; then
    echo "Usage: $0 target_image" 1>&2
    exit 1
fi

TARGET_IMAGE=$1

{
    if printf '%s' "$TARGET_IMAGE" | grep -Eqiv '^sha256:'; then
        docker pull "$TARGET_IMAGE"
    fi

    if ! CONTAINER_ID=$(docker create "$TARGET_IMAGE" /bin/sh); then
        exit 1
    fi

    mkdir -p "$CONTAINER_ID"

    cd "$CONTAINER_ID" || exit 2
    docker export "$CONTAINER_ID" | tar --exclude=etc/mtab --exclude=proc --exclude=dev -xf -
    GOSH_SHA256=$(find . -type f -exec sha256sum -b {} + | LC_ALL=C sort | sha256sum | awk '{ print $1 }')
    cd .. || exit 3

    docker rm -fv "$CONTAINER_ID" >/dev/null
    rm -rf "$CONTAINER_ID"
} >/dev/null

printf 'sha256:%s' "$GOSH_SHA256"
