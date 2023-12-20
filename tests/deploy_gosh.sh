#!/bin/bash
set -e
set -o pipefail

case $1 in
  1) VERSION="v1_x";;
  2) VERSION="v2_x";;
  3) VERSION="v3_x";;
  4) VERSION="v4_x";;
  5) VERSION="v5_x/v5.1.0";;
  6) VERSION="v6_x/v6.1.0";;
  7) VERSION="v6_x/v6.2.0";;
  *) VERSION="v${1}_x/v${1}.0.0";;
esac

echo "Version=$VERSION"

./node_se_scripts/deploy.sh $VERSION $NETWORK
. set-vars.sh $VERSION $NETWORK
