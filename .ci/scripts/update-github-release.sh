#!/bin/bash

set -e 
set -o pipefail

TOKEN=$1
VERSION=$2
BRANCH=$3

RELEASE_ID=$(curl -sH "Authorization: token ${TOKEN}" \
    "https://api.github.com/repos/gosh-sh/gosh/releases/tags/${VERSION}" | jq -r '.id' | cut -d'{' -f1)

curl -X PATCH -H "Accept: application/vnd.github+json" -H "Authorization: token ${TOKEN}" \
    https://api.github.com/repos/gosh-sh/gosh/releases/${RELEASE_ID} \
    -d "{\"name\":\"Version: ${VERSION}\", \"prerelease\":false}"