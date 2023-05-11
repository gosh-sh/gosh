if [ -e env.env ]; then
    . ./env.env
fi

export TVM_LINKER=~/.everdev/solidity/tvm_linker

function delay {
    sleep_for=$1

    echo "falling asleep for ${sleep_for} sec"
    sleep $sleep_for
}

function list_branches {
    repo_addr=$1
    tonos-cli -j -u $NETWORK run $repo_addr getAllAddress {} --abi ../$REPO_ABI | jq -r '.value0[].branchname'
}

function get_account_status {
    contract_addr=$1
    tonos-cli -j -u $NETWORK account $contract_addr | jq -r '."'"$contract_addr"'".acc_type'
}

function get_snapshot_status {
    repo_addr=$1
    branch=$2
    file_path=$3

    params='{"branch": "'"$branch"'", "name": "'"$file_path"'"}'
    snapshot_addr=`tonos-cli -j -u $NETWORK run $repo_addr getSnapshotAddr "$params" --abi ../$REPO_ABI | jq -r .value0`
    status=`get_account_status $snapshot_addr`
    echo $status
}

function delete_snapshot {
    repo_addr=$1
    branch=$2
    file_path=$3

    echo Deleting snapshot: branch=$2, file=$3 ...
    params='{"branch": "'"$branch"'", "name": "'"$file_path"'"}'
    snapshot_addr=`tonos-cli -j -u $NETWORK run $repo_addr getSnapshotAddr "$params" --abi ../$REPO_ABI | jq -r .value0`
    echo Got snapshot address: $snapshot_addr
    tonos-cli -u $NETWORK call --abi ../$WALLET_ABI --sign ../$WALLET_KEYS $WALLET_ADDR deleteSnapshot \
      "{\"snap\":\"$snapshot_addr\"}" || exit 1
    echo Deleted snapshot: branch=$2, file=$3 - OK
}

function wait_account_active {
    stop_at=$((SECONDS+120))
    contract_addr=$1
    is_ok=0
    while [ $SECONDS -lt $stop_at ]; do
        status=`tonos-cli -j -u $NETWORK account $contract_addr | jq -r '."'"$contract_addr"'".acc_type'`
        if [ "$status" = "Active" ]; then
            is_ok=1
            echo account is active
            break
        fi
        sleep 5
    done

    if [ "$is_ok" = "0" ]; then
        echo account is not active
        exit 2
    fi
}

function wait_set_commit {
    stop_at=$((SECONDS+300))
    repo_addr=$1
    branch=$2
    expected_commit=`git rev-parse HEAD`

    expected_commit_addr=`tonos-cli -j -u $NETWORK run $repo_addr getCommitAddr '{"nameCommit":"'"$expected_commit"'"}' --abi ../$REPO_ABI | jq -r .value0`

    is_ok=0

    while [ $SECONDS -lt $stop_at ]; do
        last_commit_addr=`tonos-cli -j -u $NETWORK run $repo_addr getAddrBranch '{"name":"'"$branch"'"}' --abi ../$REPO_ABI | jq -r .value0.commitaddr`
        if [ "$last_commit_addr" = "$expected_commit_addr" ]; then
            is_ok=1
            echo set_commit success
            break
        fi

        sleep 5
    done

    if [ "$is_ok" = "0" ]; then
        echo set_commit failed
        exit 2
    fi
}

function deploy_DAO {
  echo "Deploy DAO"
  echo "DAO_NAME=$DAO_NAME"
  tonos-cli -j call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS deployDao \
    "{\"systemcontract\":\"$SYSTEM_CONTRACT_ADDR\", \"name\":\"$DAO_NAME\", \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"
  DAO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "***** awaiting dao deploy *****"
  wait_account_active $DAO_ADDR
  echo "DAO_ADDR=$DAO_ADDR"

  WALLET_ADDR=$(tonos-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "WALLET_ADDR=$WALLET_ADDR"

  echo "***** turn DAO on *****"
  tonos-cli -j call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
    "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"

  sleep 10

  GRANTED_PUBKEY=$(tonos-cli -j run --abi $WALLET_ABI $WALLET_ADDR getAccess {} | jq -r .value0)
  echo $GRANTED_PUBKEY
}

function deploy_DAO_and_repo {
  echo "Deploy DAO"
  echo "DAO_NAME=$DAO_NAME"
  tonos-cli -j call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS deployDao \
    "{\"systemcontract\":\"$SYSTEM_CONTRACT_ADDR\", \"name\":\"$DAO_NAME\", \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"
  DAO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "***** awaiting dao deploy *****"
  wait_account_active $DAO_ADDR
  echo "DAO_ADDR=$DAO_ADDR"

  WALLET_ADDR=$(tonos-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "WALLET_ADDR=$WALLET_ADDR"

  echo "***** turn DAO on *****"
  tonos-cli -j call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
    "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"

  sleep 10

  GRANTED_PUBKEY=$(tonos-cli -j run --abi $WALLET_ABI $WALLET_ADDR getAccess {} | jq -r .value0)
  echo $GRANTED_PUBKEY

  echo "***** repo deploy *****"
  deploy_repo
  REPO_ADDR=$(tonos-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "REPO_ADDR=$REPO_ADDR"

  echo "***** awaiting repo deploy *****"
  wait_account_active $REPO_ADDR
  sleep 3
}

function upgrade_DAO {
  if [ $# -lt 2 ]; then
    TEST_VERSION=$TEST_VERSION1
    NEW_SYSTEM_CONTRACT_ADDR=$SYSTEM_CONTRACT_ADDR_1
  else
    TEST_VERSION=$1
    NEW_SYSTEM_CONTRACT_ADDR=$2
  fi
  if [[ $VERSION =~ "v1_x" ]]; then
    upgrade_DAO_1 $TEST_VERSION $NEW_SYSTEM_CONTRACT_ADDR
  else
    upgrade_DAO_2 $TEST_VERSION $NEW_SYSTEM_CONTRACT_ADDR
  fi
}

function upgrade_DAO_1 {
  TEST_VERSION=$1
  PROP_ID=$PROP_ID1
  NEW_SYSTEM_CONTRACT_ADDR=$2

  echo "***** start proposal for upgrade *****"
  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForUpgradeDao --newversion $TEST_VERSION --description "" --num_clients 1

  sleep 60

  echo "***** get data for proposal *****"
  tip3VotingLocker=$(tonos-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
  echo "tip3VotingLocker=$tip3VotingLocker"

  platform_id=$(tonos-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "platform_id=$platform_id"

  sleep 3

  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount 20 --num_clients 1

  wait_wallet_tombstone $WALLET_ADDR

  echo "tonos-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI --name $DAO_NAME"
  DAO_ADDR=$(tonos-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI --name $DAO_NAME | sed -n '/value0/ p' | cut -d'"' -f 4)

  echo "New DAO address: $DAO_ADDR"
  wait_account_active $DAO_ADDR

  WALLET_ADDR=$(tonos-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "NEW_WALLET_ADDR=$WALLET_ADDR"
  wait_account_active $WALLET_ADDR

  tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
    "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"
}

function upgrade_DAO_2 {
  TEST_VERSION=$1
  NEW_SYSTEM_CONTRACT_ADDR=$2

  echo "***** start proposal for upgrade *****"
  tonos-cli -j callx --abi $WALLET_ABI_1 --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForUpgradeDao --newversion $TEST_VERSION --description "" --comment "" --num_clients 1 --reviewers []
  NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"

  sleep 10

  echo "***** get data for proposal *****"
  tip3VotingLocker=$(tonos-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
  echo "tip3VotingLocker=$tip3VotingLocker"

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 1000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method get_upgrade_prop_id_2 --abi-params \
  "{\"newversion\":\"$TEST_VERSION\",\"description\":\"\",\"comment\":\"\",\"_now\":\"$NOW_ARG\"}"  --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)

  platform_id=$(tonos-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI_1 --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "platform_id=$platform_id"

  sleep 3

  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount 20 --num_clients 1 --note ""

  sleep 10

  wallet_tombstone=$(tonos-cli -j runx --addr $WALLET_ADDR -m getTombstone --abi $WALLET_ABI | sed -n '/value0/ p' | cut -d':' -f 2)
  echo "WALLET tombstone: $wallet_tombstone"

  if [ "$wallet_tombstone" = " false" ]; then
    echo "Tombstone was not set"
    exit 1
  fi

  echo "tonos-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI_1 --name $DAO_NAME"
  DAO_ADDR=$(tonos-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI_1 --name $DAO_NAME | sed -n '/value0/ p' | cut -d'"' -f 4)

  echo "New DAO address: $DAO_ADDR"

  WALLET_ADDR=$(tonos-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI_1 | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "NEW_WALLET_ADDR=$WALLET_ADDR"

  sleep 5

  tonos-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
    "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"
}

function add_protected_branch {
  echo "***** start proposal for add protected branch *****"
  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForAddProtectedBranch --repoName $REPO_NAME --branchName $BRANCH_NAME --num_clients 1
  NOW_ARG=$(tonos-cli account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"

  sleep 60

  echo "***** get data for proposal *****"
  tip3VotingLocker=$(tonos-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
  echo "tip3VotingLocker=$tip3VotingLocker"

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 1000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method get_add_protected_prop_id --abi-params \
  "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"_now\":\"$NOW_ARG\"}"  --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)

  echo "PROP_ID=$PROP_ID"

  platform_id=$(tonos-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "platform_id=$platform_id"

  sleep 3

  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount 20 --num_clients 1
}

function wait_wallet_tombstone {
    stop_at=$((SECONDS+120))
    contract_addr=$1
    while [ $SECONDS -lt $stop_at ]; do
        wallet_tombstone=$(tonos-cli -j runx --addr $contract_addr -m getTombstone --abi $WALLET_ABI | sed -n '/value0/ p' | cut -d':' -f 2)
        echo "WALLET tombstone: $wallet_tombstone"

        if [ "$wallet_tombstone" = " true" ]; then
          is_ok=1
          echo "Tombstone is set"
          break
        fi
        sleep 5
    done

    if [ "$is_ok" = "0" ]; then
        echo "Wallet tombstone was not set"
        exit 2
    fi
}

function wait_account_balance {
    stop_at=$((SECONDS+120))
    contract_addr=$1
    balance_min=$2
    while [ $SECONDS -lt $stop_at ]; do
        balance=`tonos-cli -j -u $NETWORK account $contract_addr | jq -r '."'"$contract_addr"'".balance'`
        if [ "$balance" -ge "$balance_min" ]; then
            is_ok=1
            echo account has enough balance
            break
        fi
        sleep 5
    done

    if [ "$is_ok" = "0" ]; then
        echo account has not enough balance
        exit 2
    fi
}

function deploy_repo {
  if [[ $VERSION =~ "v1_x" ]]; then
    tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
      "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1
  else
    tonos-cli call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR AloneDeployRepository \
      "{\"nameRepo\":\"$REPO_NAME\",\"descr\":\"\",\"previous\":null}" || exit 1
  fi
}

function deploy_task_with_proposal {
  echo "***** start proposal for task deploy *****"
  LOCK=100
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellTaskDeploy \
    "{\"taskName\":\"$TASK_NAME\",\"repoName\":\"$REPO_NAME\",\"tag\":[],\"comment\":\"\",\"grant\":{\"assign\":[{\"grant\":1,\"lock\":1},{\"grant\":1,\"lock\":$LOCK}],\"review\":[],\"manager\":[]}}" | sed -n '/value0/ p' | cut -d'"' -f 4)
  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForTaskDeploy \
    "{\"taskName\":\"$TASK_NAME\",\"repoName\":\"$REPO_NAME\",\"tag\":[],\"comment\":\"\",\"grant\":{\"assign\":[{\"grant\":1,\"lock\":1},{\"grant\":1,\"lock\":$LOCK}],\"review\":[],\"manager\":[]},\"num_clients\":1,\"reviewers\":[]}"

  echo "TVMCELL=$TVMCELL"
  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  vote_for_proposal
}

function deploy_task_with_proposal_3 {
  echo "***** start proposal for task deploy *****"
  LOCK=100
  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForTaskDeploy \
    "{\"taskName\":\"$TASK_NAME\",\"repoName\":\"$REPO_NAME\",\"tag\":[],\"comment\":\"\",\"grant\":{\"assign\":[{\"grant\":1,\"lock\":1},{\"grant\":1,\"lock\":$LOCK}],\"review\":[],\"manager\":[]},\"num_clients\":1,\"reviewers\":[]}"
  NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellTaskDeploy \
    "{\"taskName\":\"$TASK_NAME\",\"repoName\":\"$REPO_NAME\",\"tag\":[],\"comment\":\"\",\"grant\":{\"assign\":[{\"grant\":1,\"lock\":1},{\"grant\":1,\"lock\":$LOCK}],\"review\":[],\"manager\":[]},\"time\":$NOW_ARG}" | sed -n '/value0/ p' | cut -d'"' -f 4)

  echo "TVMCELL=$TVMCELL"
  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  vote_for_proposal
}

# Needs $PROP_ID
function vote_for_proposal {
    echo "PROP_ID=$PROP_ID"
    echo "***** get data for proposal *****"
    tip3VotingLocker=$(tonos-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
    echo "tip3VotingLocker=$tip3VotingLocker"

    platform_id=$(tonos-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
    echo "platform_id=$platform_id"

    sleep 3

    VOTE_TOKENS="${VOTE_TOKENS:-20}"
    tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount $VOTE_TOKENS --num_clients 1 --note ""
}

function mint_tokens {
    tonos-cli runx --abi $DAO_ABI --addr $DAO_ADDR -m getTokenBalance
    echo "***** start proposal for mint tokens *****"
    TOKEN=5
    TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellMintToken --token $TOKEN --comment "" | sed -n '/value0/ p' | cut -d'"' -f 4)
    tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForMintDaoReserve \
      --token $TOKEN --comment "" --num_clients 1 --reviewers []
    echo "TVMCELL=$TVMCELL"

    sleep 10

    PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
      --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
      "{\"data\":\"$TVMCELL\"}" \
       --decode-c6 | grep value0 \
      | sed -n '/value0/ p' | cut -d'"' -f 4)

    vote_for_proposal

    sleep 3

    tonos-cli runx --abi $DAO_ABI --addr $DAO_ADDR -m getTokenBalance
}

function mint_tokens_3 {
    tonos-cli runx --abi $DAO_ABI --addr $DAO_ADDR -m getTokenBalance
    echo "***** start proposal for mint tokens *****"
    TOKEN="${TOKEN:-5}"
    tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForMintDaoReserve \
      --token $TOKEN --comment "" --num_clients 1 --reviewers []
    NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
    echo "NOW_ARG=$NOW_ARG"
    TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellMintToken --token $TOKEN --comment "" --time $NOW_ARG | sed -n '/value0/ p' | cut -d'"' -f 4)

    echo "TVMCELL=$TVMCELL"

    sleep 10

    PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
      --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
      "{\"data\":\"$TVMCELL\"}" \
       --decode-c6 | grep value0 \
      | sed -n '/value0/ p' | cut -d'"' -f 4)

    vote_for_proposal

    sleep 3

    tonos-cli runx --abi $DAO_ABI --addr $DAO_ADDR -m getTokenBalance
}

function set_commit_proposal {
  tonos-cli runx --abi $REPO_ABI --addr $REPO_ADDR -m getAllAddress

  echo "***** start proposal for set commit *****"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellSetCommit \
    "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"commit\":\"$COMMIT_ID\",\"numberChangedFiles\":1,\"numberCommits\":1,\"comment\":\"\",\"task\":{\"task\":\"$TASK_ADDR\",\"pubaddrassign\":{\"$USER_PROFILE_ADDR\":true},\"pubaddrreview\":{},\"pubaddrmanager\":{}}}" | sed -n '/value0/ p' | cut -d'"' -f 4)
  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForSetCommit \
    "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"commit\":\"$COMMIT_ID\",\"numberChangedFiles\":1,\"numberCommits\":1,\"comment\":\"\",\"task\":{\"task\":\"$TASK_ADDR\",\"pubaddrassign\":{\"$USER_PROFILE_ADDR\":true},\"pubaddrreview\":{},\"pubaddrmanager\":{}},\"num_clients\":1,\"reviewers\":[]}"
  echo "TVMCELL=$TVMCELL"

  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  vote_for_proposal

  sleep 10

  tonos-cli runx --abi $REPO_ABI --addr $REPO_ADDR -m getAllAddress
}

function set_commit_proposal_3 {
  tonos-cli runx --abi $REPO_ABI --addr $REPO_ADDR -m getAllAddress

  echo "***** start proposal for set commit *****"
  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForSetCommit \
    "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"commit\":\"$COMMIT_ID\",\"numberChangedFiles\":1,\"numberCommits\":1,\"comment\":\"\",\"task\":{\"task\":\"$TASK_ADDR\",\"pubaddrassign\":{\"$TASK_OWNER\":true},\"pubaddrreview\":{},\"pubaddrmanager\":{},\"daoMembers\":{}},\"num_clients\":1,\"reviewers\":[]}"
  NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellSetCommit \
    "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"commit\":\"$COMMIT_ID\",\"numberChangedFiles\":1,\"numberCommits\":1,\"comment\":\"\",\"task\":{\"task\":\"$TASK_ADDR\",\"pubaddrassign\":{\"$TASK_OWNER\":true},\"pubaddrreview\":{},\"pubaddrmanager\":{},\"daoMembers\":{}},\"time\":$NOW_ARG}" | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "TVMCELL=$TVMCELL"

  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  vote_for_proposal

  sleep 10

  tonos-cli runx --abi $REPO_ABI --addr $REPO_ADDR -m getAllAddress
}

function set_commit_proposal_3_dao {
  tonos-cli runx --abi $REPO_ABI --addr $REPO_ADDR -m getAllAddress

  echo "***** start proposal for set commit *****"
  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForSetCommit \
    "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"commit\":\"$COMMIT_ID\",\"numberChangedFiles\":1,\"numberCommits\":1,\"comment\":\"\",\"task\":{\"task\":\"$TASK_ADDR\",\"pubaddrassign\":{\"$TASK_OWNER\":true},\"pubaddrreview\":{},\"pubaddrmanager\":{},\"daoMembers\":{\"$TASK_OWNER\":\"$CHILD_DAO_NAME\"}},\"num_clients\":1,\"reviewers\":[]}"
  NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellSetCommit \
    "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"commit\":\"$COMMIT_ID\",\"numberChangedFiles\":1,\"numberCommits\":1,\"comment\":\"\",\"task\":{\"task\":\"$TASK_ADDR\",\"pubaddrassign\":{\"$TASK_OWNER\":true},\"pubaddrreview\":{},\"pubaddrmanager\":{},\"daoMembers\":{\"$TASK_OWNER\":\"$CHILD_DAO_NAME\"}},\"time\":$NOW_ARG}" | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "TVMCELL=$TVMCELL"

  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  vote_for_proposal

  sleep 10

  tonos-cli runx --abi $REPO_ABI --addr $REPO_ADDR -m getAllAddress
}


function upgrade_task_proposal {
  echo "***** start proposal for set commit *****"
  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForTaskUpgrade \
    "{\"nametask\":\"$TASK_NAME\",\"reponame\":\"$REPO_NAME\",\"oldversion\":\"$OLD_VERSION\",\"oldtask\":\"$TASK_ADDR\",\"hashtag\":[],\"comment\":\"\",\"num_clients\":1,\"reviewers\":[]}"
  NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellForTaskUpgrade \
    "{\"nametask\":\"$TASK_NAME\",\"reponame\":\"$REPO_NAME\",\"oldversion\":\"$OLD_VERSION\",\"oldtask\":\"$TASK_ADDR\",\"hashtag\":[],\"comment\":\"\",\"time\":$NOW_ARG}"  | sed -n '/value0/ p' | cut -d'"' -f 4)
  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  vote_for_proposal

  sleep 10

  tonos-cli runx --abi $REPO_ABI --addr $REPO_ADDR -m getAllAddress
}

function add_dao_to_dao {
  echo "***** start proposal for add dao to dao *****"
#  struct MemberToken {
#      address member;
#      uint128 count;
#  }
  CHILD_TOKEN="${CHILD_TOKEN:-1}"
  tonos-cli -j callx --abi $WALLET_ABI --addr $PARENT_WALLET_ADDR --keys $WALLET_KEYS -m startProposalForDeployWalletDao \
    "{\"pubaddr\":[{\"member\":\"$CHILD_DAO_ADDR\",\"count\":$CHILD_TOKEN}],\"dao\":[\"$CHILD_DAO_NAME\"],\"comment\":\"\",\"num_clients\":1,\"reviewers\":[]}"
  NOW_ARG=$(tonos-cli -j account $PARENT_WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $PARENT_WALLET_ADDR -m getCellDeployWalletDao \
    "{\"pubaddr\":[{\"member\":\"$CHILD_DAO_ADDR\",\"count\":$CHILD_TOKEN}],\"dao\":[\"$CHILD_DAO_NAME\"],\"comment\":\"\",\"time\":$NOW_ARG}"  | sed -n '/value0/ p' | cut -d'"' -f 4)
  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  vote_for_proposal

  sleep 10

}

function add_members_to_dao {
  echo "***** start proposal for add members to dao *****"
  echo "Number of members $MEMBERS_CNT"
  PARAMS="{\"pubaddr\":["
  i=1
  ADDR_TEMPLATE="0:f04965b9fe7366b81aa2c44e9cfd7056a13170d9cf1bf4509db6c5627782eb"
  DAO="["
  while [[ $i -le $MEMBERS_CNT ]]
  do
    echo "generate member #$i"
    INDEX=$(printf '%02d' $i)
    PARAMS="$PARAMS{\"member\":\""$ADDR_TEMPLATE""$INDEX"\",\"count\":0}"
    DAO="$DAO""null"
    if [ "$i" != "$MEMBERS_CNT" ]; then
      PARAMS="$PARAMS,"
      DAO="$DAO,"
    fi
    ((i = i + 1))
  done
  DAO="$DAO]"
  PARAMS_START="$PARAMS],\"dao\":$DAO,\"comment\":\"\",\"num_clients\":1,\"reviewers\":[]}"
  echo "PARAMS_START=$PARAMS_START"
  tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForDeployWalletDao $PARAMS_START
  NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"
  PARAMS_GET_CELL="$PARAMS],\"dao\":$DAO,\"comment\":\"\",\"time\":$NOW_ARG}"
  echo "PARAMS_GET_CELL=$PARAMS_GET_CELL"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellDeployWalletDao \
    $PARAMS_GET_CELL | sed -n '/value0/ p' | cut -d'"' -f 4)
  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  vote_for_proposal

  sleep 10

}

function child_dao_ask_granted {
  echo "***** start proposal for ask dao reward *****"

  tonos-cli -j callx --abi $WALLET_ABI --addr $CHILD_WALLET_ADDR --keys $WALLET_KEYS -m startProposalForDaoAskGrant \
    "{\"wallet\":\"$CHILD_DAO_WALLET_ADDR\",\"repoName\":\"$REPO_NAME\",\"taskName\":\"$TASK_NAME\",\"comment\":\"\",\"num_clients\":1,\"reviewers\":[]}"
  NOW_ARG=$(tonos-cli -j account $CHILD_WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $CHILD_WALLET_ADDR -m getCellForDaoAskGrant \
    "{\"wallet\":\"$CHILD_DAO_WALLET_ADDR\",\"repoName\":\"$REPO_NAME\",\"taskName\":\"$TASK_NAME\",\"comment\":\"\",\"time\":$NOW_ARG}"  | sed -n '/value0/ p' | cut -d'"' -f 4)
  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  WALLET_ADDR=$CHILD_WALLET_ADDR

  vote_for_proposal

  sleep 10

}

function child_dao_lock_vote {
  echo "***** start proposal *****"
  IS_LOCK=true
  GRANT=0
  tonos-cli -j callx --abi $WALLET_ABI --addr $NEW_CHILD_WALLET_ADDR --keys $WALLET_KEYS -m startProposalForDaoLockVote \
    "{\"wallet\":\"$NEW_CHILD_DAO_WALLET_ADDR\",\"isLock\":$IS_LOCK,\"grant\":$GRANT,\"comment\":\"\",\"num_clients\":1,\"reviewers\":[]}"
  NOW_ARG=$(tonos-cli -j account $NEW_CHILD_WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $NEW_CHILD_WALLET_ADDR -m getCellForDaoLockVote \
    "{\"wallet\":\"$NEW_CHILD_DAO_WALLET_ADDR\",\"isLock\":$IS_LOCK,\"grant\":$GRANT,\"comment\":\"\",\"time\":$NOW_ARG}"  | sed -n '/value0/ p' | cut -d'"' -f 4)
  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  WALLET_ADDR=$NEW_CHILD_WALLET_ADDR

  vote_for_proposal

  sleep 10
}

function dao_transfer_tokens {
  echo "***** start proposal *****"
  GRANT=2
  OLD_VERSION=$CUR_VERSION
  tonos-cli -j callx --abi $WALLET_ABI --addr $NEW_CHILD_WALLET_ADDR --keys $WALLET_KEYS -m startProposalForDaoTransferTokens \
    "{\"wallet\":\"$CHILD_DAO_WALLET_ADDR\",\"newwallet\":\"$NEW_CHILD_DAO_WALLET_ADDR\",\"grant\":$GRANT,\"oldversion\":\"$OLD_VERSION\",\"comment\":\"\",\"num_clients\":1,\"reviewers\":[]}"
  NOW_ARG=$(tonos-cli -j account $NEW_CHILD_WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"
  TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $NEW_CHILD_WALLET_ADDR -m getCellDaoTransferTokens \
    "{\"wallet\":\"$CHILD_DAO_WALLET_ADDR\",\"newwallet\":\"$NEW_CHILD_DAO_WALLET_ADDR\",\"grant\":$GRANT,\"oldversion\":\"$OLD_VERSION\",\"comment\":\"\",\"time\":$NOW_ARG}"  | sed -n '/value0/ p' | cut -d'"' -f 4)
  sleep 10

  PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
        --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
        "{\"data\":\"$TVMCELL\"}" \
         --decode-c6 | grep value0 \
        | sed -n '/value0/ p' | cut -d'"' -f 4)

  WALLET_ADDR=$NEW_CHILD_WALLET_ADDR

  vote_for_proposal

  sleep 10
}

function get_number_of_members {
  MEMBERS_LEN=$(tonos-cli -j runx --abi $DAO_ABI --addr $DAO_ADDR -m getDetails | grep -c member)
}

function start_paid_membership {
    echo "***** start proposal for paid membership *****"
    VALUE="${VALUE:-25}"
    VALUE_PER_SUB="${VALUE_PER_SUB:-10}"
    TIME_FOR_SUB="${TIME_FOR_SUB:-60}"
    KEY_FOR_SERVICE="0x"$(cat $WALLET_KEYS | jq .public | cut -d '"' -f 2)

    tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForStartPaidMembership \
      "{\"newProgram\":{\"paidMembershipValue\":$VALUE,\"valuePerSubs\":$VALUE_PER_SUB,\"timeForSubs\":$TIME_FOR_SUB,\"accessKey\":\"$KEY_FOR_SERVICE\"},\"Programindex\":1,\"comment\":\"\",\"num_clients\":1,\"reviewers\":[]}"
    NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
    echo "NOW_ARG=$NOW_ARG"
    TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellStartPaidMembership "{\"newProgram\":{\"paidMembershipValue\":$VALUE,\"valuePerSubs\":$VALUE_PER_SUB,\"timeForSubs\":$TIME_FOR_SUB,\"accessKey\":\"$KEY_FOR_SERVICE\"},\"Programindex\":1,\"comment\":\"\",\"time\":$NOW_ARG}" | sed -n '/value0/ p' | cut -d'"' -f 4)

    echo "TVMCELL=$TVMCELL"

    sleep 10

    PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
      --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
      "{\"data\":\"$TVMCELL\"}" \
       --decode-c6 | grep value0 \
      | sed -n '/value0/ p' | cut -d'"' -f 4)

    vote_for_proposal

}

function stop_paid_membership {
    echo "***** start proposal for stop paid membership *****"
    tonos-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForStopPaidMembership \
      --Programindex 1 --comment "" --num_clients 1 --reviewers []
    NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
    echo "NOW_ARG=$NOW_ARG"
    TVMCELL=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m getCellStopPaidMembership --Programindex 1 --comment "" --time $NOW_ARG | sed -n '/value0/ p' | cut -d'"' -f 4)

    echo "TVMCELL=$TVMCELL"

    sleep 10

    PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
      --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getHash --abi-params \
      "{\"data\":\"$TVMCELL\"}" \
       --decode-c6 | grep value0 \
      | sed -n '/value0/ p' | cut -d'"' -f 4)

    vote_for_proposal

}
