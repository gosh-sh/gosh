#!/bin/bash
set -e
set -o pipefail

# - Create BigTask
# - Create SubTask
# - Delete BigTask

. ./util.sh
. ./bigtask_tests/bigtask.sh

NOW=$(date +%s)
REPO_NAME="bt_repo03-${NOW}"

deploy_repo
REPO_ADDR=$(get_repo_addr)
wait_account_active $REPO_ADDR

echo "REPO_NAME=${REPO_NAME}"
echo "REPO_ADDR=${REPO_ADDR}"

TOKEN=100
mint_tokens_3
delay 10

TOKEN_RESERVE_AT_START=$TOKEN

BIGTASK_NAME=big_task_3
BIGTASK_ADDR=$(get_bigtask_address "${BIGTASK_NAME}")
SUBTASK_NAME=sub_task_3_1

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
SUBTASK_WORKERS="{\"pubaddrassign\": {\"$USER_PROFILE_ADDR\": true}, \"pubaddrreview\": {}, \"pubaddrmanager\": {}, \"daoMembers\": {}}"

SUBTASK_ADDR=$(create_subtask "${BIGTASK_NAME}" "${SUBTASK_NAME}" "${SUBTASK_CFG_GRANT}" "[]" "${SUBTASK_WORKERS}")

TOKEN_RESERVE=$(get_dao_token_reserve)

# check that reserve doesn't changed after the subtask was created
if (( $TOKEN_RESERVE != $EXPECTED_RESERVE )); then
    echo "TEST FAILED: incorrect reserve after big task was created"
    exit 1
fi

destroy_bigtask "${BIGTASK_NAME}"
delay 10

EXPECTED_RESERVE=100
TOKEN_RESERVE_FINAL=$(get_dao_token_reserve)

if (( $TOKEN_RESERVE_FINAL != $EXPECTED_RESERVE )); then
    echo "TEST FAILED"
    exit 1
fi

echo "TEST SUCCEEDED"
