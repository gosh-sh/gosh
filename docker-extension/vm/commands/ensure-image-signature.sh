#!/bin/sh

NET_ENDPOINTS=$1
PUBLISHER_KEY=$2
IMAGE_HASH=$3

cd /command/tools/content-signature/
node cli check --network $NET_ENDPOINTS $PUBLISHER_KEY $IMAGE_HASH

