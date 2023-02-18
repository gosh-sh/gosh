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