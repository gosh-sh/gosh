REPO_NAME=repo01
BRANCH_NAME=parent_branch
NOW_ARG="0x6543"

PROP_ID=$(tvm_linker test prop_id_gen --gas-limit 1000000 \
--abi-json ./prop_id_gen.abi.json --abi-method get_add_protected_prop_id --abi-params \
"{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"_now\":\"$NOW_ARG\"}"  --decode-c6 | grep value0 \
| sed -n '/value0/ p' | cut -d'"' -f 4)

echo "PROP_ID=$PROP_ID"
