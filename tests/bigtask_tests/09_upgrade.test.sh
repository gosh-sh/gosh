#!/bin/bash
set -e
set -o pipefail
set -x

#  - деплоим 5-ю версию
#  - Create BigTask
#  - Create SubTask 1
#  - Create SubTask 2
#  - Complete SubTask 1
#  - Deploy version 6
#  - Upgrade DAO to v6
#  - Transfer tokens from DAOv5 to DAOv6
#  - Upgrade BigTask and SubTasks
#  - Complete SubTask 2
#  - подтверждаем биг таску
#  - забираем награды из саб тасок
#  - забриаем награду из биг таски

#  - проверяем что биг/саб таски удалились
#  - проверяем что баланс на кошельке увеличился
#  - проверяем верный ли резерв у дао

. ./util.sh
. ./bigtask_tests/bigtask.sh

NOW=$(date +%s)
DAO_NAME="dao-${NOW}"
REPO_NAME="bt_repo09-${NOW}"

deploy_DAO_and_repo
# REPO_ADDR=$(get_repo_addr)

TOKEN=100
mint_tokens
delay 10

TOKEN_RESERVE_AT_START=$TOKEN

BIGTASK_NAME=big_task_9
BIGTASK_ADDR=$(get_bigtask_address "${BIGTASK_NAME}")

CFG_GRANT="{\"assign\": [], \"review\": [], \"manager\": [{\"grant\": 1, \"lock\": 1}], \"subtask\": [{\"grant\": 20, \"lock\": 1}]}"
CFG_COMMIT="{\"task\":\"$BIGTASK_ADDR\", \"pubaddrassign\":{}, \"pubaddrreview\":{}, \"pubaddrmanager\":{\"$USER_PROFILE_ADDR\": true}, \"daoMembers\":{}}"
TAG=[]

create_bigtask "${BIGTASK_NAME}" "${CFG_GRANT}" "${CFG_COMMIT}" "${TAG}"
delay 10

BIGTASK_ACCOUNT_STATUS=$(get_account_status $BIGTASK_ADDR)

if [ $BIGTASK_ACCOUNT_STATUS != "Active" ]; then
    echo "TEST FAILED: bigtask contract wasn't created"
fi

EXPECTED_RESERVE=79  # -20 (10 x 2 subtasks), -1 (manager)
TOKEN_RESERVE=$(get_dao_token_reserve)

# check that reserve doesn't changed after the task was confirmed
if (( $TOKEN_RESERVE != $EXPECTED_RESERVE )); then
    echo "TEST FAILED: incorrect reserve after big task was created"
    exit 1
fi

SUBTASK_1_NAME=sub_task_9_1
SUBTASK_1_CFG_GRANT="{\"assign\": [{\"grant\": 10, \"lock\": 1}], \"review\": [], \"manager\": [], \"subtask\": []}"
SUBTASK_1_WORKERS=null

SUBTASK_1_ADDR=$(create_subtask "${BIGTASK_NAME}" "${SUBTASK_1_NAME}" "${SUBTASK_1_CFG_GRANT}" "[]" "${SUBTASK_1_WORKERS}")

SUBTASK_2_NAME=sub_task_9_2
SUBTASK_2_CFG_GRANT="{\"assign\": [{\"grant\": 10, \"lock\": 1}], \"review\": [], \"manager\": [], \"subtask\": []}"
SUBTASK_2_WORKERS=null

SUBTASK_2_ADDR=$(create_subtask "${BIGTASK_NAME}" "${SUBTASK_2_NAME}" "${SUBTASK_2_CFG_GRANT}" "[]" "${SUBTASK_2_WORKERS}")

TOKEN_RESERVE=$(get_dao_token_reserve)

# check that reserve doesn't changed after the subtask was created
if (( $TOKEN_RESERVE != $EXPECTED_RESERVE )); then
    echo "TEST FAILED: incorrect reserve after big task was created"
    exit 1
fi

# deploy_repo
# wait_account_active $REPO_ADDR

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

git checkout -b "feature/$SUBTASK_1_NAME"
git commit --allow-empty -m "subtask ${SUBTASK_1_NAME}"

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
    "task": "${SUBTASK_1_ADDR}",
    "pubaddrassign": {"$USER_PROFILE_ADDR": true},
    "pubaddrreview": {},
    "pubaddrmanager": {},
    "daoMembers": {}
}
JSON
)

complete_subtask "main" "${commit_id}" $num_files $num_commits "${task}"
get_subtask_status $SUBTASK_1_ADDR
status=$(get_subtask_status $SUBTASK_1_ADDR | jq .candidates[0])
candidate_task=$(echo $status | jq -r .task)
candidate_commit=$(echo $status | jq -r .commit)
candidate_number_commit=$(echo $status | jq -r .number_commit)

if [ $candidate_task != $SUBTASK_1_ADDR ] || [ $candidate_commit != $commit_addr ] || [ $candidate_number_commit != $num_commits ]; then
    echo "TEST FAILED: subtask '$SUBTASK_1_NAME' is incompleted"
    exit 1
fi

TOKEN_RESERVE_FINAL=$(get_dao_token_reserve)

if (( $TOKEN_RESERVE_FINAL != $EXPECTED_RESERVE )); then
    echo "TEST FAILED"
    exit 1
fi


get_bigtask_status "${BIGTASK_ADDR}"
get_subtask_status "${SUBTASK_1_ADDR}"

delay 10

echo "Upgrade DAO"
upgrade_DAO
SYSTEM_CONTRACT_ADDR=$SYSTEM_CONTRACT_ADDR_1
delay 10

# upgrade repo
params=$(jq << JSON
{
    "nameRepo": "$REPO_NAME",
    "descr": "",
    "previous": {"addr": "$REPO_ADDR", "version": "$CUR_VERSION"}
}
JSON
)
tonos-cli call --abi $WALLET_ABI_1 --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
    "$params" || exit 1

REPO_ADDR_PREV=$REPO_ADDR
REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI_1 | jq -r .value0)
echo "upgraded REPO_ADDR=$REPO_ADDR"

echo "***** awaiting repo deploy *****"
wait_account_active $REPO_ADDR
sleep 3

# transfer tokens from the old DAO to the new one
EXPECTED_WALLET_TOKEN_BALANCE=0
WALLET_TOKEN_BALANCE=$(get_wallet_token_balance)

if (( $WALLET_TOKEN_BALANCE != $EXPECTED_WALLET_TOKEN_BALANCE )); then
    echo "TEST FAILED: incorrect amount of tokens in the new wallet"
fi

tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS sendTokenToNewVersionAuto {}
delay 10
tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS sendTokenToNewVersionAuto {}
delay 5

EXPECTED_WALLET_TOKEN_BALANCE=20
WALLET_TOKEN_BALANCE=$(get_wallet_token_balance)

if (( $WALLET_TOKEN_BALANCE != $EXPECTED_WALLET_TOKEN_BALANCE )); then
    echo "TEST FAILED: incorrect amount of tokens in the new wallet after auto-transfer"
fi

tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS lockVoting "{\"amount\": 0}"
###

# - Upgrade BigTask and SubTasks
BIGTASK_ADDR_PREV=$BIGTASK_ADDR
SUBTASK_1_ADDR_PREV=$SUBTASK_1_ADDR
SUBTASK_2_ADDR_PREV=$SUBTASK_2_ADDR

upgrade_bigtask "$BIGTASK_NAME" "5.0.0" "$BIGTASK_ADDR_PREV"
upgrade_subtask "$SUBTASK_1_NAME" "5.0.0" "$SUBTASK_1_ADDR_PREV"
upgrade_subtask "$SUBTASK_2_NAME" "5.0.0" "$SUBTASK_2_ADDR_PREV"
delay 10

VERSION_DAO=$(get_gosh_contract_version "$DAO_ADDR")

BIGTASK_ADDR=$(get_bigtask_address "$BIGTASK_NAME")
SUBTASK_1_ADDR=$(get_subtask_addr "$SUBTASK_1_NAME")
SUBTASK_2_ADDR=$(get_subtask_addr "$SUBTASK_2_NAME")

set +x
echo "DAO version: ${VERSION_DAO}"
echo "'${BIGTASK_NAME}' address before: ${BIGTASK_ADDR_PREV}"
echo "'${SUBTASK_1_NAME}' address before: ${SUBTASK_1_ADDR_PREV}"
echo "'${SUBTASK_2_NAME}' address before: ${SUBTASK_2_ADDR_PREV}"

echo "'${BIGTASK_NAME}' address after: ${BIGTASK_ADDR}"
echo "'${SUBTASK_1_NAME}' address after: ${SUBTASK_1_ADDR}"
echo "'${SUBTASK_2_NAME}' address after: ${SUBTASK_2_ADDR}"
set -x

get_wallet_details

cd $REPO_NAME

git checkout main
git pull # origin main

date +%s > now
git add now
git commit -m "main: updated file in new version"
GOSH_TRACE=5 git push &> trace-push.log
delay 10

git log --oneline
list_branches

git checkout -b "feature/$SUBTASK_2_NAME"
git commit --allow-empty -m "subtask ${SUBTASK_2_NAME}"

parent_id=$(git rev-parse HEAD^1)
parent_addr=$(get_commit_addr $parent_id)

commit_id=$(git rev-parse HEAD)
commit_addr=$(get_commit_addr $commit_id)
commit_obj=$(git cat-file -p $commit_id)

tree_id=$(git show HEAD --format=format:%T | head -n 1)
tree_addr=$(get_tree_addr $tree_id)

parent0=$(jq -n --arg addr "$parent_addr" --arg version "6.0.0" '$ARGS.named')
parents="[$parent0]"

cd ..

params=$(jq -n \
    --arg repoName "$REPO_NAME" --arg branchName "main" --arg commitName "$commit_id" \
    --arg fullCommit "$commit_obj" --argjson parents "$parents" --arg tree "$tree_addr" \
    --arg upgrade "false" '$ARGS.named')

tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS deployCommit "$params"
delay 10

num_files=0
num_commits=1
task=$(jq << JSON
{
    "task": "${SUBTASK_2_ADDR}",
    "pubaddrassign": {"$USER_PROFILE_ADDR": true},
    "pubaddrreview": {},
    "pubaddrmanager": {},
    "daoMembers": {}
}
JSON
)

complete_subtask "main" "$commit_id" $num_files $num_commits "$task"
delay 10
get_subtask_status $SUBTASK_2_ADDR
status=$(get_subtask_status $SUBTASK_2_ADDR | jq .candidates[0])
candidate_task=$(echo $status | jq -r .task)
candidate_commit=$(echo $status | jq -r .commit)
candidate_number_commit=$(echo $status | jq -r .number_commit)

if [ $candidate_task != $SUBTASK_2_ADDR ] || [ $candidate_commit != $commit_addr ] || [ $candidate_number_commit != $num_commits ]; then
    echo "TEST FAILED: subtask '${SUBTASK_2_NAME}' is incompleted"
    exit 1
fi
# - Complete BigTask
confirm_bigtask "${BIGTASK_NAME}"
delay 5

BIGTASK_STATUS=$(get_bigtask_status "${BIGTASK_ADDR}" | jq -r .ready)

if (( $BIGTASK_STATUS != "true" )); then
    echo "TEST FAILED: bigtask wasn't confirmed"
fi

# - Collect reward
ASSIGNER_ROLE=1
MANAGER_ROLE=3

EXPECTED_WALLET_TOKEN_BALANCE=10
request_subtask_reward "${SUBTASK_1_NAME}" $ASSIGNER_ROLE
delay 5

WALLET_TOKEN_BALANCE=$(get_wallet_token_balance)

if (( $EXPECTED_WALLET_TOKEN_BALANCE != $WALLET_TOKEN_BALANCE )); then
    request_subtask_reward "${SUBTASK_1_NAME}" $ASSIGNER_ROLE
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

get_bigtask_status "${BIGTASK_ADDR}"
get_subtask_status "${SUBTASK_1_ADDR}"
get_subtask_status "${SUBTASK_2_ADDR}"

echo "wallet balance: ${WALLET_TOKEN_BALANCE}"
echo "TEST SUCCEEDED"
