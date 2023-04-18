#!/bin/bash

set -e

REPO_OWNER=gosh-sh
REPO=gosh
if [[ -z "${TAG}" ]]; then
  echo ""
  echo "Downloading latest release of git-remote-gosh"
  echo ""
  TAG=latest
else
  echo ""
  echo "Downloading git-remote-gosh tag: $TAG"
  echo ""
  TAG="tags/$TAG"
fi

# TODO: get it from one source with binary

# Check OS and architecture
if [[ "$OSTYPE" == "linux-gnu" ]]; then
    if [[ $(uname -m) == "x86_64" ]]; then
        TAR="git-remote-gosh-linux-amd64.tar"
    else
        TAR="git-remote-gosh-linux-arm64.tar"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    if [[ $(uname -m) == "x86_64" ]]; then
        TAR="git-remote-gosh-darwin-amd64.tar"
    else
        TAR="git-remote-gosh-darwin-arm64.tar"
    fi
else
    echo "Only \"MacOS\" and \"Linux\" are supported - not \"$OSTYPE\""
    exit 1
fi

GH_API="https://api.github.com"
GH_REPO="$GH_API/repos/${REPO_OWNER}/${REPO}"
GH_TAGS="$GH_REPO/releases/$TAG"

# create dir and dummy config
mkdir -p "$HOME"/.gosh
if [ ! -f "$HOME"/.gosh/config.json ]; then
  tee "$HOME"/.gosh/config.json <<EOF
{
  "primary-network": "mainnet",
  "networks": {
    "mainnet": {
      "user-wallet": {
        "profile": "user_name",
        "pubkey": "00000000000000000000",
        "secret": "00000000000000000000"
      },
      "endpoints": [
        "https://bhs01.network.gosh.sh",
        "https://eri01.network.gosh.sh",
        "https://gra01.network.gosh.sh"
      ]
    }
  }
}
EOF
fi

# Read asset tags.
response=$(curl -s "$GH_TAGS")

# Get ID of the asset based on given name.
eval $(echo "$response" | grep -C3 "name.:.\+$TAR" | grep -w id | tr : = | tr -cd '[[:alnum:]]=')
[ "$id" ] || {
    echo "Error: Failed to get asset id, response: $response" | awk 'length($0)<100' >&2
    exit 1
}

wget --content-disposition --no-cookie -q --header "Accept: application/octet-stream" "$GH_REPO/releases/assets/$id" --show-progress

# unpack
tar -xf $TAR
rm -f $TAR

DEFAULT_PATH=$HOME/.gosh/
BINARY_PATH="${BINARY_PATH:-$DEFAULT_PATH}"

mv git-remote-gosh $BINARY_PATH
mv git-remote-gosh_v* $BINARY_PATH
mv dispatcher.ini $HOME/.gosh/

echo ""
echo "Binaries were installed to $BINARY_PATH"
echo ""

# check that binary path is added to bashrc
ALREADY_ADDED=$(cat "$HOME"/.bashrc | grep "export PATH=\$PATH:\$HOME/.gosh" | wc -l)
if [ $ALREADY_ADDED -lt 1 ]; then
  echo "export PATH=\$PATH:\$HOME/.gosh" >>"$HOME"/.bashrc
  export PATH=$PATH:\$HOME/.gosh
fi

NUMBER_OF_BINARIES=$(whereis -b git-remote-gosh | sed 's/git-remote-gosh://' | sed 's/ /\n/g' | grep git | wc -l)
if [ $NUMBER_OF_BINARIES -gt 1 ]; then
  echo "There is more than one version of git-remote-gosh installed in your system. Remove extra versions except for '"$BINARY_PATH"git-remote-gosh'!"
  echo "Currently installed binaries:"
  whereis -b git-remote-gosh | sed 's/git-remote-gosh: //' | sed 's/ /\n/'
fi

if [ $NUMBER_OF_BINARIES -eq 0 ]; then
  echo "Restart the terminal to use git-remote-gosh or if you use non-standard shell (not bash), please manually add 'export PATH=\$PATH:\$HOME/.gosh' to your .bashrc analog"
fi

if [ $NUMBER_OF_BINARIES -eq 1 ]; then
  IS_PATH_RIGHT=$(whereis -b git-remote-gosh | sed 's/git-remote-gosh://' | grep $BINARY_PATH | wc -l)
  if [ ! $IS_PATH_RIGHT -eq 1 ]; then
    echo "You have an old version of git-remote-gosh installed on your system. Please remove it. Path:"
    whereis -b git-remote-gosh | sed 's/git-remote-gosh: //'
    echo "Seems like you use non-standard shell, please manually add 'export PATH=\$PATH:\$HOME/.gosh' to your .bashrc analog"
  fi
fi
