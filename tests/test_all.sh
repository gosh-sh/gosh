#!/bin/bash
set -e 
set -o pipefail

. set-vars.sh
./01-clone_empty_repo.test.sh
./02-create_branch.test.sh
./03-push_multiple_updates_in_a_single_commit.test.sh
./04-push_parallel_diffs_in_multiple_commite.test.sh
./05-bin_test.test.sh
./06-sequential_merges.test.sh
./07-push_to_empty_main.test.sh
./08-repo_with_canceled_diffs.test.sh
./09-ipfs_onchain_transition.test.sh
./10-ensure_blobs_onchain.test.sh
./11-git_submodules.test.sh