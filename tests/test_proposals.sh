#!/bin/bash
set -e
set -o pipefail

#if [ $DEPLOY_LOCAL = TRUE ]; then
  #https://github.com/tonlabs/evernode-se#how-to-change-the-blockchain-configuration
#  docker run -d --name local-node -e USER_AGREEMENT=yes -p80:80 \
#       -v /home/user/GOSH/dev/gosh/tests/node_se_scripts/blockchain.conf.json:/ton-node/blockchain.conf.json \
#       tonlabs/local-node:0.36.3
#  docker start local-node
#  sleep 20

  ./node_se_scripts/deploy.sh $1 $4
#fi

# $1 = VERSION FROM
# $2 = VERSION TO
# $4 = NETWORK

. set-vars.sh $1 $4
./upgrade_tests/set_up.sh $1 $2
if [ "$1" == "v4_x" ]; then
  proposals_tests/auto_transfer_tokens.sh
fi
proposals_tests/dao_member_of_dao.sh
proposals_tests/dao_member_of_dao_vote.sh
proposals_tests/graceful_upgrade_task_v3.sh
#proposals_tests/upgrade_with_mint_flag.sh

./clean.sh
echo "All tests passed"
