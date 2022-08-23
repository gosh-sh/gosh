#!/bin/bash

set -e 
set -o pipefail

TOKEN=$1
VERSION=$2
BRANCH=$3

curl -sX POST -H "Accept: application/vnd.github+json" -H "Authorization: token ${TOKEN}" \
    https://api.github.com/repos/gosh-sh/gosh/releases \
    -d "{\"tag_name\":\"${VERSION}\", \"target_commitish\":\"${BRANCH}\", \
    \"name\":\"Version: rc-${VERSION}\", \"body\":\"GOSH release\", \"draft\":false, \
    \"prerelease\":true, \"generate_release_notes\":false}"