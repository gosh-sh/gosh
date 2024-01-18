# Parse k=v args
for ARGUMENT in "$@"
do
   KEY=$(echo $ARGUMENT | cut -f1 -d=)

   KEY_LENGTH=${#KEY}
   VALUE="${ARGUMENT:$KEY_LENGTH+1}"

   export "$KEY"="$VALUE"
done

function get_account_balance {
    addr=$1
    tonos-cli -j -u $network account $addr | jq -r '."'"$addr"'".balance'
}

function get_account_status {
    addr=$1
    tonos-cli -j -u $network account $addr | jq -r '."'"$addr"'".acc_type'
}

function wait_account_balance {
    stop_at=$((SECONDS+120))
    addr=$1
    balance_min=$2
    while [ $SECONDS -lt $stop_at ]; do
        balance=`tonos-cli -j -u $network account $addr | jq -r '."'"$addr"'".balance'`
        if [ "$balance" -ge "$balance_min" ]; then
            is_ok=1
            break
        fi
        sleep 5
    done

    if [ "$is_ok" = "0" ]; then
        echo "> Account has not enough balance"
        exit 2
    fi
}

function wait_account_active {
    stop_at=$((SECONDS+120))
    addr=$1
    while [ $SECONDS -lt $stop_at ]; do
        balance=`tonos-cli -j -u $network account $addr | jq -r '."'"$addr"'".acc_type'`
        if [ "$balance" == "Active" ]; then
            is_ok=1
            break
        fi
        sleep 5
    done

    if [ "$is_ok" = "0" ]; then
        echo "> Account was not deployed within 2m"
        exit 2
    fi
}