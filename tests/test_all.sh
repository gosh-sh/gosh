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

#  ./node_se_scripts/deploy.sh $1 $2
#fi

# $1 = VERSION (v1_x, v2_x, v3_x, v4_x)

# . set-vars.sh $1 $2
./01-clone_empty_repo.test.sh
echo 1 $? >> res.txt
./02-create_branch.test.sh
echo 2 $? >> res.txt
./03-push_multiple_updates_in_a_single_commit.test.sh
echo 3 $? >> res.txt
./04-push_parallel_diffs_in_multiple_commite.test.sh
echo 4 $? >> res.txt
./05-bin_test.test.sh
echo 5 $? >> res.txt
./06-sequential_merges.test.sh
echo 6 $? >> res.txt
./07-push_to_empty_main.test.sh
echo 7 $? >> res.txt
./08-repo_with_canceled_diffs.test.sh
echo 8 $? >> res.txt
./09-ipfs_onchain_transition.test.sh
echo 9 $? >> res.txt
./10-ensure_blobs_onchain.test.sh
echo 10 $? >> res.txt
./11-git_submodules.test.sh
echo 11 $? >> res.txt
./12-clone_tree_with_rename.test.sh
echo 12 $? >> res.txt
./13-push_protected_branch.test.sh
echo 13 $? >> res.txt
./14-pull_request_details.test.sh
echo 14 $? >> res.txt
./15-diamond_merge_several_commits.test.sh
echo 15 $? >> res.txt
./16-push_after_diamond_merge.test.sh
echo 16 $? >> res.txt
./17-create_file_in_branch.test.sh
echo 17 $? >> res.txt
./18-push_several_commits.test.sh
echo 18 $? >> res.txt
./19-push_many_files.test.sh
echo 19 $? >> res.txt
./09_1-push_many_files_no_ipfs.test.sh
echo 091 $? >> res.txt
./20-delete-branch.test.sh
echo 20 $? >> res.txt
./21-delete-snapshots.test.sh
echo 21 $? >> res.txt
./22-push_many_commits.test.sh
echo 22 $? >> res.txt
./23_1-squash_n_delete.test.sh
echo 23 $? >> res.txt
./24_several_branches_from_one_commit.test.sh
echo 24 $? >> res.txt
./25_empty_commit.test.sh
echo 25 $? >> res.txt
./26_tree_file_order.test.sh
echo 26 $? >> res.txt
./27_snap_check_readiness_before_create_branch.test.sh
echo 27 $? >> res.txt
./28-ipfs_repetitive_requests.test.sh
echo 28 $? >> res.txt
./29_push_merged_commits.test.sh
echo 29 $? >> res.txt
./30_remove_file_in_branch.sh 
echo 30 $? >> res.txt
./30_1_remove_file.test.sh
echo 30_1 $? >> res.txt
./32-push_branch_with_existing_commit.test.sh 
echo 32 $? >> res.txt

./clean.sh
echo "All tests passed"
