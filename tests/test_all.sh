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

#  ./node_se_scripts/deploy.sh
#fi

. set-vars.sh
. build_remote.sh
./01-clone_empty_repo.test.sh
./02-create_branch.test.sh
./03-push_multiple_updates_in_a_single_commit.test.sh
./04-push_parallel_diffs_in_multiple_commite.test.sh
./05-bin_test.test.sh
./06-sequential_merges.test.sh
./07-push_to_empty_main.test.sh
./08-repo_with_canceled_diffs.test.sh
#./09-ipfs_onchain_transition.test.sh  !!!!!!!!!!!!
./10-ensure_blobs_onchain.test.sh
./11-git_submodules.test.sh
./12-clone_tree_with_rename.sh
./13_push_protected_branch.test.sh
./14_pull_request_details.test.sh
./15-diamond_merge_several_commits.test.sh
./16-push_after_diamond_merge.test.sh
./17-create_file_in_branch.test.sh

# upgrade tests.   Failing tests have ignore argument
./upgrade_tests/set_up_v2.sh
./upgrade_tests/01-clone_rewritten_repo.test.sh
./upgrade_tests/02_1-clone_upgraded_repo.test.sh
./upgrade_tests/02_2-push_after_upgrade.test.sh
./upgrade_tests/02_3-push_after_upgrade_with_several_commits.test.sh
./upgrade_tests/03-branch_from_parent.test.sh
./upgrade_tests/04-branch_from_grandparent.test.sh
./upgrade_tests/05-merge_branch_from_parent.test.sh
./upgrade_tests/05_1-merge_branch_from_parent_with_several_commits.test.sh
./upgrade_tests/05_2-push_after_merge.test.sh
./upgrade_tests/05_3-create_file_in_branch.test.sh
./upgrade_tests/06-merge_branch_from_grandparent.test.sh ignore
./upgrade_tests/07-branch_from_unrelated_commit.test.sh
./upgrade_tests/08-tagging_after_upgrade.test.sh ignore
./upgrade_tests/09-delete_tag_after_upgrade.test.sh ignore
./upgrade_tests/10-tagless_after_upgrade.test.sh ignore

./clean.sh
echo "All tests passed"
