#!/bin/bash
set -e
set -o pipefail

case $1 in
  1) INPUT_VERSION="v1_x";;
  2) INPUT_VERSION="v2_x";;
  3) INPUT_VERSION="v3_x";;
  4) INPUT_VERSION="v4_x";;
  5) INPUT_VERSION="v5_x/v5.1.0";;
  6) INPUT_VERSION="v6_x/v6.0.0";;
  *) INPUT_VERSION="v${1}_x/v${1}.0.0";;
esac

case $2 in
  1) INPUT_VERSION2="v1_x";;
  2) INPUT_VERSION2="v2_x";;
  3) INPUT_VERSION2="v3_x";;
  4) INPUT_VERSION2="v4_x";;
  5) INPUT_VERSION2="v5_x/v5.1.0";;
  6) INPUT_VERSION2="v6_x/v6.1.0";;
  *) INPUT_VERSION2="v${2}_x/v${2}.0.0";;
esac

echo "Version=$INPUT_VERSION,Version2=$INPUT_VERSION2"

./node_se_scripts/deploy.sh $INPUT_VERSION $3
. set-vars.sh $INPUT_VERSION $3
./upgrade_tests/set_up.sh $INPUT_VERSION $INPUT_VERSION2 $3
