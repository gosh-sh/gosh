#!/bin/bash

if test ! -f "Cargo.toml"; then
    echo "Should be run from root folder (where Cargo.toml locates)" >&2
    exit 1
fi

CWD=$(pwd)
echo CWD: "$CWD"

PATH="$(pwd)"/bin:"$PATH"
export PATH
echo "$PATH" | tr : '\n' | head

if test -f "log/output.log"; then
    mv -f "log/output.log" "log/prev-output.log"
fi

echo Current git-remote-gosh: "$(which git-remote-gosh)"
git clone gosh::network.gosh.sh://0:078d7efa815982bb5622065e7658f89b29ce8a24bce90e5ca0906cdfd2cc6358/gosh/binary-experiments
