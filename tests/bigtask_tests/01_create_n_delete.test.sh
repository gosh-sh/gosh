#!/bin/bash
set -e
set -o pipefail

# - Create BigTask
# - Delete BigTask

. ./util.sh
. ./bigtask_tests/bigtask.sh

NOW=$(date +%s)
REPO_NAME="bt_repo01-${NOW}"

TOKEN=100
mint_tokens_3
delay 20

TOKEN_RESERVE_AT_START=$TOKEN

BIGTASK_NAME=big_task_1
BIGTASK_ADDR=$(get_bigtask_address "${BIGTASK_NAME}")

CFG_GRANT="{\"assign\": [], \"review\": [], \"manager\": [{\"grant\": 1, \"lock\": 1}], \"subtask\": [{\"grant\": 10, \"lock\": 1}]}"
CFG_COMMIT="{\"task\":\"$BIGTASK_ADDR\", \"pubaddrassign\":{}, \"pubaddrreview\":{}, \"pubaddrmanager\":{\"$USER_PROFILE_ADDR\": true}, \"daoMembers\":{}}"
TAG=[]

create_bigtask "${BIGTASK_NAME}" "${CFG_GRANT}" "${CFG_COMMIT}" "${TAG}"
delay 20

get_account_status $BIGTASK_ADDR

EXPECTED_RESERVE=89  # -10 (subtask), -1 (manager)
TOKEN_RESERVE_AFTER_BIG_TASK=$(get_dao_token_reserve)

if (( $TOKEN_RESERVE_AFTER_BIG_TASK != $EXPECTED_RESERVE )); then
    echo "TEST FAILED"
    exit 1
fi

destroy_bigtask "${BIGTASK_NAME}"
delay 20

EXPECTED_RESERVE=100
TOKEN_RESERVE_FINAL=$(get_dao_token_reserve)

if (( $TOKEN_RESERVE_FINAL != $EXPECTED_RESERVE )); then
    echo "TEST FAILED"
    exit 1
fi

echo "TEST SUCCEEDED"
