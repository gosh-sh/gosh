BIGTASK_ABI=../v5_x/contracts/gosh/bigtask.abi.json
SUBTASK_ABI=../v5_x/contracts/gosh/task.abi.json
LOCKER_ABI=../v5_x/contracts/gosh/smv/SMVTokenLocker.abi.json

function get_bigtask_address {
    repo=$REPO_NAME
    task=$1

    tonos-cli -j -u $NETWORK run $SYSTEM_CONTRACT_ADDR --abi $SYSTEM_CONTRACT_ABI  \
        getBigTaskAddr "{\"nametask\": \"$task\", \"dao\": \"$DAO_NAME\", \"repoName\": \"$repo\"}" \
        | jq -r .value0 \
    || exit 1
}

function get_bigtask_status {
    task_addr=$1

    tonos-cli -j -u $NETWORK run $task_addr --abi $BIGTASK_ABI getStatus {}
}

function get_subtask_addr {
    subtask=$1
    repo=${2:-$REPO_NAME}

    params=$(jq -n --arg reponame "${repo}" --arg nametask "${subtask}" '$ARGS.named')

    tonos-cli -j -u $NETWORK run $WALLET_ADDR --abi $WALLET_ABI \
        getTaskAddr "${params}" | jq -r .value0
}

function get_subtask_status {
    subtask_addr=$1

    tonos-cli -j -u $NETWORK run $subtask_addr --abi $SUBTASK_ABI getStatus {}
}

function create_bigtask {
    repo=$REPO_NAME
    task=$1
    grant=$2
    assignersdata=$3
    tag=$4
    freebalance=$(echo $grant | jq -r '[.subtask[].grant] | add')  # sum(grant.subtask[].grant), must be > 0
    comment=""
    num_clients=$(get_num_clients)
    reviewers=[]

    params=$(jq -n \
        --arg repoName "${repo}" --arg taskName "${task}" --arg comment "${comment}" \
        --arg num_clients "${num_clients}" --argjson reviewers $reviewers \
        --argjson grant "${grant}" --argjson tag "${tag}" --argjson assignersdata "${assignersdata}" \
        --arg freebalance "${freebalance}" '$ARGS.named')

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        startProposalForBigTaskDeploy "${params}" || exit 1

    TIME=$(get_account_last_paid $WALLET_ADDR)
    params=$(echo $params | jq --arg time "${TIME}" 'del(.num_clients, .reviewers) | . += $ARGS.named')

    TVMCELL=$(tonos-cli -j -u $NETWORK run $WALLET_ADDR --abi $WALLET_ABI \
        getCellBigTaskDeploy "${params}" | jq -r .value0)

    echo "TVMCELL=$TVMCELL"

    PROP_ID=$(calculate_prop_id "${TVMCELL}")
    echo "PROP_ID[deploy BigTask]=$PROP_ID"

    vote_for_proposal
}

function destroy_bigtask {
    repo=$REPO_NAME
    task=$1
    comment=""
    num_clients=$(get_num_clients)
    reviewers=[]

    params=$(jq -n \
        --arg repoName "${repo}" --arg taskName "${task}" --arg comment "${comment}" \
        --arg num_clients "${num_clients}" --argjson reviewers $reviewers '$ARGS.named')

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        startProposalForBigTaskDestroy "${params}" || exit 1

    TIME=$(get_account_last_paid $WALLET_ADDR)
    params=$(echo $params | jq --arg time "${TIME}" 'del(.num_clients, .reviewers) | . += $ARGS.named')

    TVMCELL=$(tonos-cli -j -u $NETWORK run $WALLET_ADDR --abi $WALLET_ABI \
        getCellBigTaskDestroy "${params}" | jq -r .value0)

    echo "TVMCELL=$TVMCELL"

    PROP_ID=$(calculate_prop_id "${TVMCELL}")
    echo "PROP_ID[destroy BigTask]=$PROP_ID"

    vote_for_proposal
}

function confirm_bigtask {
    task=$1
    repo=$REPO_NAME
    comment=""
    num_clients=$(get_num_clients)
    reviewers=[]

    params=$(jq -n \
        --arg repoName "${repo}" --arg taskName "${task}" --arg comment "${comment}" \
        --arg num_clients "${num_clients}" --argjson reviewers $reviewers '$ARGS.named')

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        startProposalForBigTaskConfirm "${params}" || exit 1

    TIME=$(get_account_last_paid $WALLET_ADDR)
    params=$(echo $params | jq --arg time "${TIME}" 'del(.num_clients, .reviewers) | . += $ARGS.named')

    TVMCELL=$(tonos-cli -j -u $NETWORK run $WALLET_ADDR --abi $WALLET_ABI \
        getCellTaskConfirm "${params}" | jq -r .value0)

    PROP_ID=$(calculate_prop_id "${TVMCELL}")

    echo "Vote for BigTask ('$bigtask') confirmation"
    vote_for_proposal
}

function upgrade_bigtask {
    repo=$REPO_NAME
    bigtask=$1
    prev_version=$2
    prev_version_addr=$3
    hashtag=[]
    comment=""
    num_clients=$(get_num_clients)
    reviewers=[]

    params=$(jq -n \
        --arg nametask "$bigtask" --arg reponame "$repo" --arg oldversion "$prev_version" \
        --arg oldtask "$prev_version_addr" --argjson hashtag "$hashtag" --arg comment "$comment" \
        --arg num_clients "$num_clients" --argjson reviewers "$reviewers" '$ARGS.named')

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        startProposalForBigTaskUpgrade "${params}" || exit 1

    TIME=$(get_account_last_paid $WALLET_ADDR)
    params=$(echo $params | jq --arg time "${TIME}" 'del(.num_clients, .reviewers) | . += $ARGS.named')

    TVMCELL=$(tonos-cli -j -u $NETWORK run $WALLET_ADDR --abi $WALLET_ABI \
        getCellForBigTaskUpgrade "${params}" | jq -r .value0)

    PROP_ID=$(calculate_prop_id "${TVMCELL}")

    echo "Vote for BigTask ('$bigtask') upgrade"
    vote_for_proposal
}

function upgrade_subtask {
    repo=$REPO_NAME
    subtask=$1
    prev_version=$2
    prev_version_addr=$3
    hashtag=[]
    comment=""
    num_clients=$(get_num_clients)
    reviewers=[]

    params=$(jq -n \
        --arg nametask "$subtask" --arg reponame "$repo" --arg oldversion "$prev_version" \
        --arg oldtask "$prev_version_addr" --argjson hashtag "$hashtag" --arg comment "$comment" \
        --arg num_clients "$num_clients" --argjson reviewers "$reviewers" '$ARGS.named')

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        startProposalForTaskUpgrade "${params}" || exit 1

    TIME=$(get_account_last_paid $WALLET_ADDR)
    params=$(echo $params | jq --arg time "${TIME}" 'del(.num_clients, .reviewers) | . += $ARGS.named')

    TVMCELL=$(tonos-cli -j -u $NETWORK run $WALLET_ADDR --abi $WALLET_ABI \
        getCellForTaskUpgrade "${params}" | jq -r .value0)

    PROP_ID=$(calculate_prop_id "${TVMCELL}")

    echo "Vote for SubTask ('$bigtask') upgrade"
    vote_for_proposal
}

function request_bigtask_reward {
    repo=$REPO_NAME
    task=$1
    role=${2:-3}  # assigner = 1, reviewer = 2, manager (by default) = 3

    params=$(jq -n \
        --arg repoName "${repo}" --arg nametask "${task}" --arg typegrant "${role}" '$ARGS.named')

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        askGrantBigToken "${params}" || exit 1
}

function request_subtask_reward {
    repo=$REPO_NAME
    task=$1
    role=${2:-3}  # assigner = 1, reviewer = 2, manager (by default) = 3

    params=$(jq -n \
        --arg repoName "${repo}" --arg nametask "${task}" --arg typegrant "${role}" '$ARGS.named')

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        askGrantToken "${params}" || exit 1
}

function create_subtask {
    bigtask=$1
    repo=$REPO_NAME
    subtask=$2
    grant=$3
    hashtag=$4
    value=10
    workers=$5

    subtask_addr=$(get_subtask_addr "${subtask}")
    if [[ $workers != null ]]; then
        # workers=$(echo $workers | jq --arg task "${subtask_addr}" '. += $ARGS.named')
        workers=$(echo $workers | jq --arg task "" '. += $ARGS.named')
    fi

    params=$(jq -n \
        --arg repoName "${repo}" --arg namebigtask "${bigtask}" --arg nametask "${subtask}" \
        --argjson hashtag "${hashtag}" --argjson grant "${grant}"  --argjson workers "${workers}" \
        --arg value "${value}" '$ARGS.named')

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        deploySubTask "${params}" &> /dev/null || exit 1

    subtask_account_status=$(get_account_status "${subtask_addr}")

    if [ $subtask_account_status != "Active" ]; then
        echo "TEST FAILED: subtask '${subtask}' wasn't created (status: ${subtask_account_status})"
        exit 1
    fi

    echo $subtask_addr
}

function delete_subtask {
    bigtask=$1
    subtask=$2
    index=$3
    expected_status=${4:-"NonExist"}
    repo=$REPO_NAME

    subtask_addr=$(get_subtask_addr "${subtask}")

    params=$(jq -n \
        --arg namebigtask "${bigtask}" --arg repoName "${repo}" --arg index "${index}" '$ARGS.named')

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        destroySubTask "${params}" &> /dev/null || exit 1

    subtask_account_status=$(get_account_status "${subtask_addr}")

    if [ $subtask_account_status != $expected_status ]; then
        echo "TEST FAILED: subtask '${subtask}' wasn't deleted (status: ${subtask_account_status})"
        exit 1
    fi
}

function complete_subtask {
    repo=$REPO_NAME
    branch=$1
    commit=$2
    num_files=$3
    num_commits=$4
    comment="task completed"
    num_clients=$(get_num_clients)
    task=$5
    reviewers=[]

    params=$(jq -n \
        --arg repoName "$repo" --arg branchName "$branch" --arg commit "$commit" \
        --arg numberChangedFiles "$num_files" --arg numberCommits "$num_commits" \
        --arg comment "$comment" --arg num_clients "$num_clients" --argjson task "$task" \
        --argjson reviewers "$reviewers" '$ARGS.named')

    delay 10

    tonos-cli -u $NETWORK call $WALLET_ADDR --abi $WALLET_ABI --sign $WALLET_KEYS \
        startProposalForSetCommit "${params}" || exit 1

    delay 10

    TIME=$(get_account_last_paid $WALLET_ADDR)
    params=$(echo $params | jq --arg time "${TIME}" 'del(.num_clients, .reviewers) | . += $ARGS.named')

    TVMCELL=$(tonos-cli -j -u $NETWORK run $WALLET_ADDR --abi $WALLET_ABI \
        getCellSetCommit "${params}" | jq -r .value0)

    echo "TVMCELL=$TVMCELL"

    PROP_ID=$(calculate_prop_id "${TVMCELL}")
    echo "PROP_ID[complete SubTask]=$PROP_ID"

    vote_for_proposal
}

function get_num_clients {
    locker=$(tonos-cli -j -u $NETWORK run $WALLET_ADDR --abi $WALLET_ABI \
        tip3VotingLocker {} | jq -r .tip3VotingLocker)

    tonos-cli -j -u $NETWORK run $locker --abi $LOCKER_ABI m_num_clients {} | jq -r .m_num_clients
}

function create_config_grant {
    echo
}

function create_config_commit {
    echo
}
