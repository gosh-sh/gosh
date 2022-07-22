#!/bin/sh

# Note:
# This script must be removed in the very first patch after release. 
# It was added due to the timeline shift.

if [ -z "$1" ]; then
    echo "Usage: $0 target_image"
    exit 1
fi

TARGET_IMAGE=$1
shift;

{
    docker pull "$TARGET_IMAGE"
} > /dev/null 2>&1

docker run "$TARGET_IMAGE" $@
