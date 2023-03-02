#!/bin/bash

set -e

REPO_OWNER=gosh-sh
REPO=gosh
RELEASE=rc-3.0.12
# TODO: get it from one source with binary
SUPPORTED_CONTRACTS_VERSIONS=("2_0_0" "1_0_0")

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

TAG=$(echo $RELEASE | tr -d 'rc-')
GH_API="https://api.github.com"
GH_REPO="$GH_API/repos/${REPO_OWNER}/${REPO}"
GH_TAGS="$GH_REPO/releases/tags/$TAG"

# dir

mkdir -p "$HOME"/.gosh
echo git-remote-gosh_v"${SUPPORTED_CONTRACTS_VERSIONS[0]}" >"$HOME"/.gosh/dispatcher.ini
echo git-remote-gosh_v"${SUPPORTED_CONTRACTS_VERSIONS[1]}" >"$HOME"/.gosh/dispatcher.ini

# Download release
echo ""
echo "Downloading $EXECUTABLE release \"$TAG\""
echo ""

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

# make executable
chmod +x git-remote-gosh
chmod +x git-remote-gosh_v"${SUPPORTED_CONTRACTS_VERSIONS[0]}"
chmod +x git-remote-gosh_v"${SUPPORTED_CONTRACTS_VERSIONS[1]}"

mv git-remote-gosh "$HOME"/.gosh/
mv git-remote-gosh_v"${SUPPORTED_CONTRACTS_VERSIONS[0]}" "$HOME"/.gosh/
mv git-remote-gosh_v"${SUPPORTED_CONTRACTS_VERSIONS[1]}" "$HOME"/.gosh/

echo "export PATH=\$PATH:\$HOME/.gosh" >>"$HOME"/.bash_profile
echo "export PATH=\$PATH:\$HOME/.gosh" >>"$HOME"/.bashrc

echo ======================================================
echo 'Run the following command to finish your installation:'
echo ======================================================
echo 'export PATH=$PATH:$HOME/.gosh'
echo ======================================================
