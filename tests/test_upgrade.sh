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

#  ./node_se_scripts/deploy.sh v1_x
#fi

# $1 = VERSION (v1_x, v2_x)  ignore
# $2 = NETWORK

# put under flag deploy of 9999
. set-vars.sh v1_x $2
./upgrade_tests/set_up.sh
./upgrade_tests/01-clone_rewritten_repo.test.sh
./upgrade_tests/02_1-clone_upgraded_repo.test.sh
./upgrade_tests/02_2-push_after_upgrade.test.sh
./upgrade_tests/02_3-push_after_upgrade_with_several_commits.test.sh
./upgrade_tests/03-branch_from_parent.test.sh
#./upgrade_tests/04-branch_from_grandparent.test.sh ignore # renamed to 04-branch_from_grandparent.test.sh.ignore
./upgrade_tests/05-merge_branch_from_parent.test.sh
./upgrade_tests/05_1-merge_branch_from_parent_with_several_commits.test.sh
./upgrade_tests/05_2-push_after_merge.test.sh
./upgrade_tests/05_3-create_file_in_branch.test.sh
#./upgrade_tests/06-merge_branch_from_grandparent.test.sh ignore # renamed to 06-merge_branch_from_grandparent.test.sh.ignore
#./upgrade_tests/07-branch_from_unrelated_commit.test.sh ignore # renamed to 07-branch_from_unrelated_commit.test.sh.ignore
./upgrade_tests/08-tagging_after_upgrade.test.sh
./upgrade_tests/09-delete_tag_after_upgrade.test.sh
./upgrade_tests/10-tagless_after_upgrade.test.sh

./clean.sh
echo "All tests passed"
