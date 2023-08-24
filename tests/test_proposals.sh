#!/bin/bash
# set -e
set -o pipefail

#if [ $DEPLOY_LOCAL = TRUE ]; then
  #https://github.com/tonlabs/evernode-se#how-to-change-the-blockchain-configuration
#  docker run -d --name local-node -e USER_AGREEMENT=yes -p80:80 \
#       -v /home/user/GOSH/dev/gosh/tests/node_se_scripts/blockchain.conf.json:/ton-node/blockchain.conf.json \
#       tonlabs/local-node:0.36.3
#  docker start local-node
#  sleep 20

  # ./node_se_scripts/deploy.sh $1 $4
#fi

# $1 = VERSION FROM
# $2 = VERSION TO
# $4 = NETWORK

proposals_tests/auto_transfer_tokens.sh
echo 1 $? >> prop_res.txt
proposals_tests/dao_member_of_dao.sh
echo 2 $? >> prop_res.txt
proposals_tests/dao_member_of_dao_vote.sh
echo 3 $? >> prop_res.txt
proposals_tests/graceful_upgrade_task.sh
echo 4 $? >> prop_res.txt
proposals_tests/paid_membership_upgrade.sh
echo 5 $? >> prop_res.txt
proposals_tests/test_repo_description_upgrade.sh
echo 7 $? >> prop_res.txt

proposals_tests/upgrade_with_mint_flag.sh
echo 6 $? >> prop_res.txt
./clean.sh
echo "All tests passed"
