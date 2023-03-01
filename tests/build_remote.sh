#!/bin/bash
set -e
set -o pipefail


cd ../gosh-dispatcher/
cargo install --path .

cd ../git-remote-gosh_v1.0.0/
make install

cd ../git-remote-gosh/
make install_for_test

cd ../tests

cd ~/.cargo/bin/
ls git-remote-gosh_* > dispatcher.ini
echo "Remote names:"
cat dispatcher.ini

cd -
mv ~/.cargo/bin/dispatcher.ini .

export GOSH_INI_PATH=$PWD/dispatcher.ini
echo "export GOSH_INI_PATH=$GOSH_INI_PATH" >> env.env
echo "$GOSH_INI_PATH"
