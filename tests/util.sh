if [ -e env.env ]; then
    . ./env.env
fi

function delay {
    sleep_for=$1

    echo "falling asleep for ${sleep_for} sec"
    sleep $sleep_for
}

function wait_account_active {
    stop_at=$((SECONDS+120))
    contract_addr=$1
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

function deploy_DAO_and_repo {
  echo "Deploy DAO"
  echo "DAO_NAME=$DAO_NAME"
  gosh-cli -j call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS deployDao \
    "{\"systemcontract\":\"$SYSTEM_CONTRACT_ADDR\", \"name\":\"$DAO_NAME\", \"pubmem\":[\"$USER_PROFILE_ADDR\"]}"
  DAO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR getAddrDao "{\"name\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "***** awaiting dao deploy *****"
  wait_account_active $DAO_ADDR
  echo "DAO_ADDR=$DAO_ADDR"

  WALLET_ADDR=$(gosh-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "WALLET_ADDR=$WALLET_ADDR"

  echo "***** turn DAO on *****"
  gosh-cli -j call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
    "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"

  sleep 10

  GRANTED_PUBKEY=$(gosh-cli -j run --abi $WALLET_ABI $WALLET_ADDR getAccess {} | jq -r .value0)
  echo $GRANTED_PUBKEY

  echo "***** repo01 deploy *****"
  gosh-cli -j call --abi $WALLET_ABI --sign $WALLET_KEYS $WALLET_ADDR deployRepository \
      "{\"nameRepo\":\"$REPO_NAME\", \"previous\":null}" || exit 1
  REPO_ADDR=$(gosh-cli -j run $SYSTEM_CONTRACT_ADDR getAddrRepository "{\"name\":\"$REPO_NAME\",\"dao\":\"$DAO_NAME\"}" --abi $SYSTEM_CONTRACT_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "REPO_ADDR=$REPO_ADDR"

  echo "***** awaiting repo deploy *****"
  wait_account_active $REPO_ADDR
  sleep 3
}

function upgrade_DAO {
  TEST_VERSION=$TEST_VERSION1
  PROP_ID=$PROP_ID1
  NEW_SYSTEM_CONTRACT_ADDR=$SYSTEM_CONTRACT_ADDR_1

  echo "***** start proposal for upgrade *****"
  gosh-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForUpgradeDao --newversion $TEST_VERSION --description "" --num_clients 1

  sleep 60

  echo "***** get data for proposal *****"
  tip3VotingLocker=$(gosh-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
  echo "tip3VotingLocker=$tip3VotingLocker"

  platform_id=$(gosh-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "platform_id=$platform_id"

  sleep 3

  gosh-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount 20 --num_clients 1

  wallet_tombstone=$(gosh-cli -j runx --addr $WALLET_ADDR -m getTombstone --abi $WALLET_ABI | sed -n '/value0/ p' | cut -d':' -f 2)
  echo "WALLET tombstone: $wallet_tombstone"

  if [ "$wallet_tombstone" = " false" ]; then
    echo "Tombstone was not set"
    exit 1
  fi

  echo "gosh-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI --name $DAO_NAME"
  DAO_ADDR=$(gosh-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI --name $DAO_NAME | sed -n '/value0/ p' | cut -d'"' -f 4)

  echo "New DAO address: $DAO_ADDR"

  WALLET_ADDR=$(gosh-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "NEW_WALLET_ADDR=$WALLET_ADDR"

  gosh-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
    "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"
}

function upgrade_DAO_2 {
  TEST_VERSION=$TEST_VERSION2
  NEW_SYSTEM_CONTRACT_ADDR=$SYSTEM_CONTRACT_ADDR_2

  echo "***** start proposal for upgrade *****"
  gosh-cli -j callx --abi $WALLET_ABI_1 --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForUpgradeDao --newversion $TEST_VERSION --description "" --comment "" --num_clients 1 --reviewers []
  NOW_ARG=$(gosh-cli account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
  echo "NOW_ARG=$NOW_ARG"

  sleep 60

  echo "***** get data for proposal *****"
  tip3VotingLocker=$(gosh-cli -j run $WALLET_ADDR  --abi $WALLET_ABI_1 tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
  echo "tip3VotingLocker=$tip3VotingLocker"

  PROP_ID=$(tvm_linker test node_se_scripts/prop_id_gen --gas-limit 1000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method get_upgrade_prop_id_2 --abi-params \
  "{\"newversion\":\"$TEST_VERSION\",\"description\":\"\",\"comment\":\"\",\"_now\":\"$NOW_ARG\"}"  --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)

  platform_id=$(gosh-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI_1 --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "platform_id=$platform_id"

  sleep 3

  gosh-cli -j callx --abi $WALLET_ABI_1 --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount 20 --num_clients 1 --note ""

  wallet_tombstone=$(gosh-cli -j runx --addr $WALLET_ADDR -m getTombstone --abi $WALLET_ABI_1 | sed -n '/value0/ p' | cut -d':' -f 2)
  echo "WALLET tombstone: $wallet_tombstone"

  if [ "$wallet_tombstone" = " false" ]; then
    echo "Tombstone was not set"
    exit 1
  fi

  echo "gosh-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI_1 --name $DAO_NAME"
  DAO_ADDR=$(gosh-cli -j runx --addr $NEW_SYSTEM_CONTRACT_ADDR -m getAddrDao --abi $SYSTEM_CONTRACT_ABI_1 --name $DAO_NAME | sed -n '/value0/ p' | cut -d'"' -f 4)

  echo "New DAO address: $DAO_ADDR"

  WALLET_ADDR=$(gosh-cli -j run $DAO_ADDR getAddrWallet "{\"pubaddr\":\"$USER_PROFILE_ADDR\",\"index\":0}" --abi $DAO_ABI_1 | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "NEW_WALLET_ADDR=$WALLET_ADDR"

  gosh-cli call --abi $USER_PROFILE_ABI $USER_PROFILE_ADDR --sign $WALLET_KEYS turnOn \
    "{\"pubkey\":\"$WALLET_PUBKEY\",\"wallet\":\"$WALLET_ADDR\"}"
}

function add_protected_branch {
  echo "***** start proposal for add protected branch *****"
  gosh-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForAddProtectedBranch --repoName $REPO_NAME --branchName $BRANCH_NAME --num_clients 1
  NOW_ARG=$(gosh-cli account $WALLET_ADDR | grep last_paid | sed  's/last_paid:     //')
  echo "NOW_ARG=$NOW_ARG"

  sleep 60

  echo "***** get data for proposal *****"
  tip3VotingLocker=$(gosh-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
  echo "tip3VotingLocker=$tip3VotingLocker"

  PROP_ID=$(tvm_linker test node_se_scripts/prop_id_gen --gas-limit 1000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method get_add_protected_prop_id --abi-params \
  "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"_now\":\"$NOW_ARG\"}"  --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)

  echo "PROP_ID=$PROP_ID"

  platform_id=$(gosh-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "platform_id=$platform_id"

  sleep 3

  gosh-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount 20 --num_clients 1
}

function set_commit_proposal {
  echo "***** start proposal for set commit *****"
  gosh-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m startProposalForSetCommit --repoName $REPO_NAME --branchName $BRANCH_NAME --commit $COMMIT_ID --numberChangedFiles 1  --numberCommits 1 --num_clients 1

  sleep 60
  echo "***** get data for proposal *****"
  tip3VotingLocker=$(gosh-cli -j run $WALLET_ADDR  --abi $WALLET_ABI tip3VotingLocker "{}" | sed -n '/tip3VotingLocker/ p' | cut -d'"' -f 4)
  echo "tip3VotingLocker=$tip3VotingLocker"

  PROP_ID=$(tvm_linker test node_se_scripts/prop_id_gen --gas-limit 1000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method get_set_commit_prop_id --abi-params \
  "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"commit\":\"$COMMIT_ID\",\"numberChangedFiles\":1,\"numberCommits\":1}"  --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)

  echo "PROP_ID=$PROP_ID"

  platform_id=$(gosh-cli -j runx --addr $WALLET_ADDR -m getPlatfotmId --abi $WALLET_ABI --propId $PROP_ID --platformType 1 --_tip3VotingLocker $tip3VotingLocker | sed -n '/value0/ p' | cut -d'"' -f 4)
  echo "platform_id=$platform_id"

  sleep 3

  gosh-cli -j callx --abi $WALLET_ABI --addr $WALLET_ADDR --keys $WALLET_KEYS -m voteFor --platform_id $platform_id --choice true --amount 20 --num_clients 1
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