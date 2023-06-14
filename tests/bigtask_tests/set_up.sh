#!/bin/bash
set -e
set -o pipefail
. ./util.sh

set -x

CUR_VERSION=$1
NEW_VERSION=$2

CUR_GOSH_CONTRACTS_PATH="../v${CUR_VERSION}_x/contracts/gosh"
NEW_GOSH_CONTRACTS_PATH="../v${NEW_VERSION}_x/contracts/gosh"

if [ ! -d "../v${NEW_VERSION}_x" ]; then
    # CLEAN_NEW_CONTRACTS=1
    rsync -av --progress "../v${CUR_VERSION}_x/" "../v${NEW_VERSION}_x/" --exclude git-remote-gosh/

    LIST_FOR_REPLACE_VERSION=$(grep -rnwl --include=\*.sol $NEW_GOSH_CONTRACTS_PATH -e "${CUR_VERSION}.0.0")

    regexp=" *string *constant\(.*version.*\)= *\"${CUR_VERSION}.0.0\";"
    replacement="    string constant\1= \"${NEW_VERSION}.0.0\";"
    for file in $LIST_FOR_REPLACE_VERSION; do
        sed -i "s/$regexp/$replacement/" $file
    done
fi
