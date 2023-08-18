#!/bin/bash
set -e
set -o pipefail

case $1 in
  1) VERSION="v1_x";;
  2) VERSION="v2_x";;
  3) VERSION="v3_x";;
  4) VERSION="v4_x";;
  5) VERSION="v5_x/v5.1.0";;
  *) VERSION="v${1}_x/v${1}.0.0";;
esac

echo "Version=$VERSION"

./node_se_scripts/deploy.sh $VERSION $2
. set-vars.sh $VERSION $2
