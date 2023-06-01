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
SUBTASK_WORKERS="{\"pubaddrassign\": {}, \"pubaddrreview\": {}, \"pubaddrmanager\": {}, \"daoMembers\": {}}"

SUBTASK_ADDR=$(create_subtask "${BIGTASK_NAME}" "${SUBTASK_NAME}" "${SUBTASK_CFG_GRANT}" "[]" "${SUBTASK_WORKERS}")

TOKEN_RESERVE=$(get_dao_token_reserve)

# check that reserve doesn't changed after the subtask was created
if (( $TOKEN_RESERVE != $EXPECTED_RESERVE )); then
    echo "TEST FAILED: incorrect reserve after big task was created"
    exit 1
fi


deploy_repo
wait_account_active $REPO_ADDR

echo "REPO_NAME=${REPO_NAME}"
echo "REPO_ADDR=${REPO_ADDR}"

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

# commit_id=$(git rev-parse --short HEAD)
commit_id="58b40b0819a3e4547e9e5f9fdb5154a07702b342"

cd ..

set -x

get_subtask_status $SUBTASK_ADDR

branch=main
num_files=1
num_commits=1
task=$(echo $SUBTASK_WORKERS | jq --arg task "${SUBTASK_ADDR}" --argjson pubaddrassign "{\"$USER_PROFILE_ADDR\": true}" '. += $ARGS.named')
complete_subtask "${branch}" "${commit_id}" $num_files $num_commits "${task}"
# ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

get_subtask_status $SUBTASK_ADDR

TOKEN_RESERVE_FINAL=$(get_dao_token_reserve)

if (( $TOKEN_RESERVE_FINAL != $EXPECTED_RESERVE )); then
    echo "TEST FAILED"
    exit 1
fi

echo "TEST SUCCEEDED"
