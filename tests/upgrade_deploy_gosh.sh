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

case $2 in
  1) VERSION2="v1_x";;
  2) VERSION2="v2_x";;
  3) VERSION2="v3_x";;
  4) VERSION2="v4_x";;
  5) VERSION2="v5_x/v5.1.0";;
  *) VERSION2="v${2}_x/v${2}.0.0";;
esac

echo "Version=$VERSION,Version2=$VERSION2"

./node_se_scripts/deploy.sh $VERSION $3
. set-vars.sh $VERSION $3
./upgrade_tests/set_up.sh $VERSION $VERSION2 $3
