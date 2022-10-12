#!/bin/bash
set -e 
set -o pipefail

. set-vars.sh
#./01-clone_empty_repo.sh
#./02-create_branch.sh
#./03-push_multiple_updates_in_a_single_commit.sh
#./04-push_parallel_diffs_in_multiple_commite.sh
#./05-bin_test.sh
#./06-sequential_merges.sh
./07-push_to_empty_main.sh
./08-repo_with_canceled_diffs.sh