cd ~/.cargo/bin/
VERSION="$(git-remote-gosh_unknown supported_contract_version | cut -d '"' -f 2 | sed "s/\./_/g")"
mv git-remote-gosh_unknown git-remote-gosh_v$VERSION
cd -
