#!/bin/bash
set -e
set -o pipefail

NETWORK=localhost ./node_se_scripts/deploy.sh v5_x
. set-vars.sh v5_x
./bigtask_tests/set_up.sh 5 6
./bigtask_tests/09_upgrade.test.sh

# ./clean.sh
echo "All tests passed"
