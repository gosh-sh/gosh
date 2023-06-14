#!/bin/bash
set -e
set -o pipefail
set -x
# - Create BigTask
# - Create SubTask
# - Delete SubTask
# - Create SubTask
# - Complete SubTask
# - Complete BigTask
# - Delete SubTask (failed)
# - Collect reward

. ./util.sh
. ./bigtask_tests/bigtask.sh

NOW=$(date +%s)
REPO_NAME="bt_repo05-${NOW}"
REPO_ADDR=$(get_repo_addr)

TOKEN=100
mint_tokens_3
delay 10

TOKEN_RESERVE_AT_START=$TOKEN

BIGTASK_NAME=big_task_5
BIGTASK_ADDR=$(get_bigtask_address "${BIGTASK_NAME}")
SUBTASK_NAME=sub_task_5_1

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
SUBTASK_WORKERS=$(jq << JSON
{
    "pubaddrassign": {"$USER_PROFILE_ADDR": true},
    "pubaddrreview": {},
    "pubaddrmanager": {},
    "daoMembers": {}
}
JSON
)

SUBTASK_ADDR=$(create_subtask "${BIGTASK_NAME}" "${SUBTASK_NAME}" "${SUBTASK_CFG_GRANT}" "[]" "${SUBTASK_WORKERS}")

TOKEN_RESERVE=$(get_dao_token_reserve)

# check that reserve doesn't changed after the subtask was created
if (( $TOKEN_RESERVE != $EXPECTED_RESERVE )); then
    echo "TEST FAILED: incorrect reserve after big task was created"
    exit 1
fi

delete_subtask "${BIGTASK_NAME}" "${SUBTASK_NAME}" 0

SUBTASK_NAME=sub_task_5_2

SUBTASK_ADDR=$(create_subtask "${BIGTASK_NAME}" "${SUBTASK_NAME}" "${SUBTASK_CFG_GRANT}" "[]" "${SUBTASK_WORKERS}")

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

# get_subtask_status $SUBTASK_ADDR

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
get_subtask_status $SUBTASK_ADDR
status=$(get_subtask_status $SUBTASK_ADDR | jq .candidates[1])
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

# - Complete BigTask
confirm_bigtask "${BIGTASK_NAME}"
delay 5

BIGTASK_STATUS=$(get_bigtask_status "${BIGTASK_ADDR}" | jq -r .ready)

if (( $BIGTASK_STATUS != "true" )); then
    echo "TEST FAILED: bigtask wasn't confirmed"
fi

# - Delete SubTask (failed)
delete_subtask "${BIGTASK_NAME}" "${SUBTASK_NAME}" 0 "Active"

# - Collect reward
ASSIGNER_ROLE=1
MANAGER_ROLE=3

EXPECTED_WALLET_TOKEN_BALANCE=10
request_subtask_reward "${SUBTASK_NAME}" $ASSIGNER_ROLE
delay 5

WALLET_TOKEN_BALANCE=$(get_wallet_token_balance)

if (( $EXPECTED_WALLET_TOKEN_BALANCE != $WALLET_TOKEN_BALANCE )); then
    request_subtask_reward "${SUBTASK_NAME}" $ASSIGNER_ROLE
    delay 5
    WALLET_TOKEN_BALANCE=$(get_wallet_token_balance)

    if (( $EXPECTED_WALLET_TOKEN_BALANCE != $WALLET_TOKEN_BALANCE )); then
        echo "TEST FAILED: reward for subtask wasn't received"
    fi
fi

EXPECTED_WALLET_TOKEN_BALANCE=11
request_bigtask_reward "${BIGTASK_NAME}" $MANAGER_ROLE
delay 10

WALLET_TOKEN_BALANCE=$(get_wallet_token_balance)

if (( $EXPECTED_WALLET_TOKEN_BALANCE != $WALLET_TOKEN_BALANCE )); then
    echo "TEST FAILED: reward for bigtask wasn't received"
fi

echo "wallet balance: ${WALLET_TOKEN_BALANCE}"
echo "TEST SUCCEEDED"
