#!/bin/bash
set -e
set -o pipefail

# - Create BigTask
# - Create SubTask
# - Confirm SubTask
# - Delete BigTask

. ./util.sh
. ./bigtask_tests/bigtask.sh

NOW=$(date +%s)
REPO_NAME="bt_repo04-${NOW}"
REPO_ADDR=$(get_repo_addr)

TOKEN=100
mint_tokens_3
delay 10

TOKEN_RESERVE_AT_START=$TOKEN

BIGTASK_NAME=big_task_4
BIGTASK_ADDR=$(get_bigtask_address "${BIGTASK_NAME}")
SUBTASK_NAME=sub_task_4_1

CFG_GRANT="{\"assign\": [], \"review\": [], \"manager\": [{\"grant\": 1, \"lock\": 2}], \"subtask\": [{\"grant\": 10, \"lock\": 2}]}"
CFG_COMMIT="{\"task\":\"$BIGTASK_ADDR\", \"pubaddrassign\":{}, \"pubaddrreview\":{}, \"pubaddrmanager\":{\"$USER_PROFILE_ADDR\": true}, \"daoMembers\":{}}"
TAG=[]

create_bigtask "${BIGTASK_NAME}" "${CFG_GRANT}" "${CFG_COMMIT}" "${TAG}"
delay 10

BIGTASK_ACCOUNT_STATUS=$(get_account_status $BIGTASK_ADDR)

if [ $BIGTASK_ACCOUNT_STATUS != "Active" ]; then
    echo "TEST FAILED: bigtask contract wasn't created"
fi

EXPECTED_RESERVE=89  # -10 (subtask), -1 (manager)
TOKEN_RESERVE=$(get_dao_token_reserve)

# check that reserve doesn't changed after the task was confirmed
if (( $TOKEN_RESERVE != $EXPECTED_RESERVE )); then
    echo "TEST FAILED: incorrect reserve after big task was created"
    exit 1
fi

SUBTASK_CFG_GRANT="{\"assign\": [{\"grant\": 10, \"lock\": 1}], \"review\": [], \"manager\": [], \"subtask\": []}"
SUBTASK_WORKERS=null

SUBTASK_ADDR=$(create_subtask "${BIGTASK_NAME}" "${SUBTASK_NAME}" "${SUBTASK_CFG_GRANT}" "[]" "${SUBTASK_WORKERS}")

TOKEN_RESERVE=$(get_dao_token_reserve)

# check that reserve doesn't changed after the subtask was created
if (( $TOKEN_RESERVE != $EXPECTED_RESERVE )); then
    echo "TEST FAILED: incorrect reserve after big task was created"
    exit 1
fi

deploy_repo
wait_account_active $REPO_ADDR

git clone gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME

#check
cd $REPO_NAME

# config git client
git config user.email "foo@bar.com"
git config user.name "My name"

git branch -m main

CHANGE=$(date +%s)
echo $CHANGE > now
git add now
git commit -m "main: created file"
git push -u origin main

git checkout -b test
git commit --allow-empty -m "empty commit"

parent_id=$(git rev-parse HEAD^1)
parent_addr=$(get_commit_addr $parent_id)

commit_id=$(git rev-parse HEAD)
commit_addr=$(get_commit_addr $commit_id)
commit_obj=$(git cat-file -p $commit_id)

tree_id=$(git show HEAD --format=format:%T | head -n 1)
tree_addr=$(get_tree_addr $tree_id)

parent0=$(jq -n --arg addr "$parent_addr" --arg version "5.0.0" '$ARGS.named')
parents="[$parent0]"

cd ..

params=$(jq -n \
    --arg repoName "$REPO_NAME" --arg branchName "main" --arg commitName "$commit_id" \
    --arg fullCommit "$commit_obj" --argjson parents "$parents" --arg tree "$tree_addr" \
    --arg upgrade "false" '$ARGS.named')

tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS deployCommit "${params}"

get_subtask_status $SUBTASK_ADDR

num_files=0
num_commits=1
task=$(jq << JSON
{
    "task": "${SUBTASK_ADDR}",
    "pubaddrassign": {"$USER_PROFILE_ADDR": true},
    "pubaddrreview": {},
    "pubaddrmanager": {},
    "daoMembers": {}
}
JSON
)

complete_subtask "main" "${commit_id}" $num_files $num_commits "${task}"

status=$(get_subtask_status $SUBTASK_ADDR | jq .candidates[0])
candidate_task=$(echo $status | jq -r .task)
candidate_commit=$(echo $status | jq -r .commit)
candidate_number_commit=$(echo $status | jq -r .number_commit)

if [ $candidate_task != $SUBTASK_ADDR ] || [ $candidate_commit != $commit_addr ] || [ $candidate_number_commit != $num_commits ]; then
    echo "TEST FAILED: subtask incomplete"
    exit 1
fi

TOKEN_RESERVE_FINAL=$(get_dao_token_reserve)

if (( $TOKEN_RESERVE_FINAL != $EXPECTED_RESERVE )); then
    echo "TEST FAILED"
    exit 1
fi

destroy_bigtask $BIGTASK_NAME

subtask_account_status=$(get_account_status $SUBTASK_ADDR)

if [ $subtask_account_status != "NonExist" ]; then
    echo "TEST FAILED: subtask '${SUBTASK_NAME}' wasn't deleted (status: ${subtask_account_status})"
    exit 1
fi

echo "TEST SUCCEEDED"
