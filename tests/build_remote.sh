#!/bin/bash
set -e
set -o pipefail


cd ../gosh-dispatcher/
cargo install --path .

cd ../git-remote-gosh/
sed -i 's/1]/2]/' src/git_helper/mod.rs
sed -i 's/"1.0.0"/"1.0.0", "9999.0.0"/' src/git_helper/mod.rs

make install

sed -i 's/2]/1]/' src/git_helper/mod.rs
sed -i 's/"1.0.0", "9999.0.0"/"1.0.0"/' src/git_helper/mod.rs

cd ../tests

REMOTE_VERSION=$(grep -r "name = 'git-remote-gosh_v" ../git-remote-gosh/Cargo.toml | sed "s/name = '//i" | sed "s/'//i")
echo "Remote name:"
echo "$REMOTE_VERSION"
echo $REMOTE_VERSION > dispatcher.ini

export GOSH_INI_PATH=$PWD/dispatcher.ini
echo "export GOSH_INI_PATH=$GOSH_INI_PATH" >> env.env
echo "$GOSH_INI_PATH"
