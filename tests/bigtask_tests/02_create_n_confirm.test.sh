#!/bin/bash
set -e
set -o pipefail

# - Create BigTask
# - Confirm BigTask
# - Retrieve tokens
# - Check BigTask (should be deleted)

. ./util.sh
. ./bigtask_tests/bigtask.sh

NOW=$(date +%s)
REPO_NAME="bt_repo02-${NOW}"

TOKEN=100
mint_tokens
delay 20

TOKEN_RESERVE_AT_START=$TOKEN

BIGTASK_NAME=big_task_1
BIGTASK_ADDR=$(get_bigtask_address "${BIGTASK_NAME}")

CFG_GRANT="{\"assign\": [], \"review\": [], \"manager\": [{\"grant\": 1, \"lock\": 1}], \"subtask\": [{\"grant\": 10, \"lock\": 1}]}"
CFG_COMMIT="{\"task\":\"$BIGTASK_ADDR\", \"pubaddrassign\":{}, \"pubaddrreview\":{}, \"pubaddrmanager\":{\"$USER_PROFILE_ADDR\": true}, \"daoMembers\":{}}"
TAG=[]

create_bigtask "${BIGTASK_NAME}" "${CFG_GRANT}" "${CFG_COMMIT}" "${TAG}"
delay 20

BIGTASK_ACCOUNT_STATUS=$(get_account_status $BIGTASK_ADDR)

if [ $BIGTASK_ACCOUNT_STATUS != "Active" ]; then
    echo "TEST FAILED: bigtask contract wasn't created"
fi

BIGTASK_STATUS=$(get_bigtask_status "${BIGTASK_ADDR}" | jq -r .ready)

confirm_bigtask "${BIGTASK_NAME}"
delay 20

BIGTASK_STATUS=$(get_bigtask_status "${BIGTASK_ADDR}" | jq -r .ready)

if (( $BIGTASK_STATUS != "true" )); then
    echo "TEST FAILED: bigtask wasn't confirmed"
fi

EXPECTED_RESERVE=89  # -10 (subtask), -1 (manager)
TOKEN_RESERVE=$(get_dao_token_reserve)

# check that reserve doesn't changed after the task was confirmed
if (( $TOKEN_RESERVE != $EXPECTED_RESERVE )); then
    echo "TEST FAILED: incorrect reserve after big task was confirmed"
    exit 1
fi

WALLET_TOKEN_BALANCE_AT_START=$(get_wallet_token_balance)

if (( $WALLET_TOKEN_BALANCE_AT_START != 0 )); then
    echo "TEST FAILED: incorrect token balance at user wallet"
fi

request_bigtask_reward "${BIGTASK_NAME}"
delay 20

WALLET_TOKEN_BALANCE=$(get_wallet_token_balance)
EXPECTED_WALLET_TOKEN_BALANCE=$(echo $CFG_GRANT | jq -r .manager[].grant)

if (( $WALLET_TOKEN_BALANCE != $EXPECTED_WALLET_TOKEN_BALANCE )); then
    echo "TEST FAILED: tokens weren not received"
fi

echo "TEST SUCCEEDED"
