#!/bin/bash

set -ex

REPO_OWNER=gosh-sh
REPO=gosh
RELEASE=rc-3.0.10
SUPPORTED_CONTRACTS_VERSIONS=("1_0_0")

# Define variables.
if [[ "$OSTYPE" == "linux-gnu" ]]; then
  TAR="git-remote-gosh-linux-amd64.tar"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  TAR="git-remote-gosh-darwin-amd64.tar"
else
  echo "Only \"MacOS\" and \"Linux\" are supported - not \"$OSTYPE\""
  exit 1;
fi

TAG=$(echo $RELEASE | tr -d 'rc-')
EXECUTABLE_DIR=/usr/local/bin

GH_API="https://api.github.com"
GH_REPO="$GH_API/repos/${REPO_OWNER}/${REPO}"
GH_TAGS="$GH_REPO/releases/tags/$TAG"

# dir
cd $EXECUTABLE_DIR

# Download release
echo ""
echo "Downloading $EXECUTABLE release \"$TAG\""
echo ""

# Read asset tags.
response=$(curl -s $GH_TAGS)

# Get ID of the asset based on given name.
eval $(echo "$response" | grep -C3 "name.:.\+$TAR" | grep -w id | tr : = | tr -cd '[[:alnum:]]=')
[ "$id" ] || { echo "Error: Failed to get asset id, response: $response" | awk 'length($0)<100' >&2; exit 1; }

sudo wget --content-disposition --no-cookie --header "Accept: application/octet-stream" "$GH_REPO/releases/assets/$id" --show-progress

# unpack
sudo tar -xf $TAR
sudo rm -f $TAR

# make executable
sudo chmod +x git-remote-gosh
sudo chmod +x git-remote-gosh_v${SUPPORTED_CONTRACTS_VERSIONS[0]}

if [[ "$OSTYPE" == "linux-gnu" ]]; then
  mkdir -p /home/$USER/.gosh/
  echo git-remote-gosh_v${SUPPORTED_CONTRACTS_VERSIONS[0]} > /home/$USER/.gosh/dispatcher.ini
elif [[ "$OSTYPE" == "darwin"* ]]; then
  mkdir -p /Users/$USER/.gosh/
  echo git-remote-gosh_v${SUPPORTED_CONTRACTS_VERSIONS[0]} > /Users/$USER/.gosh/dispatcher.ini
else
  echo "Only \"MacOS\" and \"Linux\" are supported - not \"$OSTYPE\""
  exit 1;
fi

echo ""
# smoke test executable installation
if ! [ -f $EXECUTABLE_DIR/git-remote-gosh ]; then
  echo "git-remote-gosh setup failed"
  exit 1
fi

echo "$EXECUTABLE download successful"
