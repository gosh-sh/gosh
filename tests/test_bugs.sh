#!/bin/bash
set -e
set -o pipefail

#if [ $DEPLOY_LOCAL = TRUE ]; then
  #https://github.com/tonlabs/evernode-se#how-to-change-the-blockchain-configuration
#  docker run -d --name local-node -e USER_AGREEMENT=yes -p80:80 \
#       -v /home/user/GOSH/dev/gosh/tests/node_se_scripts/blockchain.conf.json:/ton-node/blockchain.conf.json \
#       tonlabs/local-node:0.36.3
#  docker start local-node
#  sleep 10
#
#  ./node_se_scripts/deploy.sh $1 $2
#fi

# $1 = VERSION (v1_x, v2_x)

. set-vars.sh $1 $2
./bug_tests/01-create_branch.test.sh
./bug_tests/02-create_branch_without_commit.test.sh

./clean.sh
echo "All tests passed"
