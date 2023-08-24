#!/bin/bash
set -e
set -o pipefail
set -x

#add fix to remove env.env

. ./util.sh

#Deploy DAO v2
#creat task
#solve task
#get first reward
#upgrade DAO to v3
#redeploy task
#get second part of reward

#парсить данные таски
#getCellForTask
#getCellForRedeployTask
#
#при ап с 3 на 4 надо провер что таска удалилась

#./node_se_scripts/deploy.sh v2_x
#. set-vars.sh v2_x
#./upgrade_tests/set_up.sh v2_x v3_x
#exit 0

REPO_NAME=prop_repo05
DAO_NAME="dao-prop_$(date +%s)"
NEW_REPO_PATH=prop_repo05_v2
COMMIT_ABI="../v2_x/contracts/gosh/commit.abi.json"
SNAPSHOT_ABI="../v2_x/contracts/gosh/snapshot.abi.json"
TASK_ABI="../v2_x/contracts/gosh/task.abi.json"


# delete folders
[ -d $REPO_NAME ] && rm -rf $REPO_NAME
[ -d $NEW_REPO_PATH ] && rm -rf $NEW_REPO_PATH

#echo "0:427957f83cc1b7691afe6a23b37995e3a94a91dbd87ae272d67ab663e19507cf" | sed -r "s/:/x/"
#gosh-cli runx -m getWalletsFull | jq '.value0."0x3523b82fc597261e996f63ac0da83418447311f323e6cb3151b315bdfc39de38".count'

# deploy new DAO that will be upgraded
deploy_DAO_and_repo

mint_tokens_v2

TASK_NAME="task1"
deploy_task_with_proposal_v2

TASK_ADDR=$(tonos-cli -j runx --addr $WALLET_ADDR -m getTaskAddr --abi $WALLET_ABI --nametask $TASK_NAME --repoName $REPO_NAME | sed -n '/value0/ p' | cut -d'"' -f 4)
wait_account_active $TASK_ADDR

USER_ADDR=$(echo $USER_PROFILE_ADDR | sed -r "s/:/x/")

export OLD_LINK="gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$REPO_NAME"
echo "OLD_LINK=$OLD_LINK"

echo "***** cloning old version repo *****"
git clone $OLD_LINK

# check
cd $REPO_NAME
git config user.email "foo@bar.com"
git config user.name "My name"
git branch -m main

# push 1 file
echo "***** Pushing file to old repo *****"
echo old_ver > 1.txt
git add 1.txt
git commit -m test
COMMIT_ID=$(git rev-parse --short HEAD)
#GOSH_TRACE=5 git push -u origin main &> ../trace.log
cd ..
#cat trace.log | grep "call start" > filtered_trace.log

BRANCH_NAME=main

#function: deployTree, args: Some(Object {"shaTree": String("3cc611957f6b92c2c77e6d4704d3bcf85a6da915"), "repoName": String("prop_repo01"), "datatree": Object {"0x4b4ccbf84f760ad40b606b57dc874c4414a453d93a5573c39cb382c3c8ccc349": Object {"flags": String("2"), "mode": String("100644"), "typeObj": String("blob"), "name": String("1.txt"), "sha1": String("5b030b5b4adb9d8ee0174925ddbd7e06772b6b21"), "sha256": String("0xcd70f1f599c08be09ff4d7743d075b0cc8b7c8a4a177ab52c36231bcfdd18731")}}, "ipfs": Null})
tonos-cli callx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m deployTree "{\"shaTree\":\"3cc611957f6b92c2c77e6d4704d3bcf85a6da915\",\"repoName\":\"$REPO_NAME\",\"datatree\":{\"0x4b4ccbf84f760ad40b606b57dc874c4414a453d93a5573c39cb382c3c8ccc349\":{\"flags\":\"2\",\"mode\":\"100644\",\"typeObj\":\"blob\",\"name\":\"1.txt\",\"sha1\":\"5b030b5b4adb9d8ee0174925ddbd7e06772b6b21\",\"sha256\":\"0xcd70f1f599c08be09ff4d7743d075b0cc8b7c8a4a177ab52c36231bcfdd18731\"}},\"ipfs\":null}"

TREE_ADDR=$(tonos-cli -j run "$REPO_ADDR" getTreeAddr "{\"treeName\":\"3cc611957f6b92c2c77e6d4704d3bcf85a6da915\"}" --abi "$REPO_ABI" | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "tree address: $TREE_ADDR"
wait_account_active "$TREE_ADDR"

#function: deployNewSnapshot, args: Some(Object {"repo": String("0:0cc8673b597735beb7e035b440972b7a53fc7f364c2308250872fd5287d46fba"), "branch": String("main"), "commit": String(""), "name": String("1.txt"), "snapshotdata": String(""), "snapshotipfs": Null})

tonos-cli callx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m deployNewSnapshot "{\"branch\":\"$BRANCH_NAME\",\"commit\":\"\",\"repo\":\"$REPO_ADDR\",\"snapshotipfs\":null,\"name\":\"1.txt\",\"snapshotdata\":\"\"}"

SNAPSHOT_ADDR=$(tonos-cli -j run "$WALLET_ADDR" getSnapshotAddr "{\"branch\":\"$BRANCH_NAME\",\"repo\":\"$REPO_ADDR\",\"name\":\"1.txt\"}" --abi "$WALLET_ABI" | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "snapshot address: $SNAPSHOT_ADDR"
wait_account_active $SNAPSHOT_ADDR

#function: deployCommit, args: Some(Object {"repoName": String("prop_repo01"), "branchName": String("main"), "commitName": String("f034ac6f5d7ce90726a8d9d99918ec4e4e78e259"), "fullCommit": String("tree 3cc611957f6b92c2c77e6d4704d3bcf85a6da915\nauthor My name <foo@bar.com> 1679605778 +0300\ncommitter My name <foo@bar.com> 1679605778 +0300\n\ntest\n"), "parents": Array [Object {"addr": String("0:687f1ae8af47020b451b3a7d3c222bb93d8bbc9fcd3c565553caa4fdecd26597"), "version": String("2.0.0")}], "tree": String("0:bdb0aaccf4e4fbec3ca82b772096e313f6f6771d117e3879fff417bf4309b809"), "upgrade": Bool(false)})

PREV_COMMIT_ADDR=$(tonos-cli -j runx --abi $REPO_ABI --addr $REPO_ADDR -m getAllAddress | jq '.value0[0].commitaddr' | cut -d'"' -f 2)

tonos-cli callx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m deployCommit "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"commitName\":\"$COMMIT_ID\",\"fullCommit\":\"tree 3cc611957f6b92c2c77e6d4704d3bcf85a6da915\nauthor My name <foo@bar.com> 1679605778 +0300\ncommitter My name <foo@bar.com> 1679605778 +0300\n\ntest\n\",\"parents\":[{\"addr\":\"$PREV_COMMIT_ADDR\",\"version\":\"2.0.0\"}],\"tree\":\"$TREE_ADDR\",\"upgrade\":false}"

#function: deployDiff, args: Some(Object {"repoName": String("prop_repo01"), "branchName": String("main"), "commitName": String("f034ac6f5d7ce90726a8d9d99918ec4e4e78e259"), "diffs": Array [Object {"snap": String("0:d2bd257e70b482e16e1ce1b0edc35c5c7af11d70e77a73c78fd572730842b6f4"), "commit": String("f034ac6f5d7ce90726a8d9d99918ec4e4e78e259"), "patch": String("28b52ffd00588901002d2d2d206f726967696e616c0a2b2b2b206d6f6469666965640a4040202d302c30202b312040400a2b6f6c645f7665720a"), "ipfs": Null, "removeIpfs": Bool(false), "sha1": String("5b030b5b4adb9d8ee0174925ddbd7e06772b6b21"), "sha256": String("0xcd70f1f599c08be09ff4d7743d075b0cc8b7c8a4a177ab52c36231bcfdd18731")}], "index1": Number(0), "index2": Number(0), "last": Bool(true)})

tonos-cli callx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m deployDiff "{\"repoName\":\"$REPO_NAME\",\"branchName\":\"$BRANCH_NAME\",\"commitName\":\"$COMMIT_ID\",\"diffs\":[{\"snap\":\"$SNAPSHOT_ADDR\",\"commit\":\"$COMMIT_ID\",\"patch\":\"28b52ffd00588901002d2d2d206f726967696e616c0a2b2b2b206d6f6469666965640a4040202d302c30202b312040400a2b6f6c645f7665720a\",\"ipfs\":null,\"removeIpfs\":\"false\",\"sha1\":\"5b030b5b4adb9d8ee0174925ddbd7e06772b6b21\",\"sha256\":\"0xcd70f1f599c08be09ff4d7743d075b0cc8b7c8a4a177ab52c36231bcfdd18731\"}],\"index1\":0,\"index2\":0,\"last\":\"true\"}"

COMMIT_ADDR=$(tonos-cli -j run "$REPO_ADDR" getCommitAddr "{\"nameCommit\":\"$COMMIT_ID\"}" --abi "$REPO_ABI" | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "commit address: $COMMIT_ADDR"
wait_account_active $COMMIT_ADDR

tonos-cli -j runx --abi $COMMIT_ABI --addr $COMMIT_ADDR -m getCommit
tonos-cli -j runx --abi $SNAPSHOT_ABI --addr $SNAPSHOT_ADDR -m getSnapshot

set_commit_proposal_v2

sleep 20

LAST_COMMIT_ADDR=$(tonos-cli -j runx --abi $REPO_ABI --addr $REPO_ADDR -m getAllAddress | jq '.value0[0].commitaddr' | cut -d'"' -f 2)

tonos-cli -j runx --abi $COMMIT_ABI --addr $LAST_COMMIT_ADDR -m getCommit

task_status=$(tonos-cli -j runx --addr $TASK_ADDR --abi $TASK_ABI -m getStatus | jq '.ready')

if [ "$task_status" != "true" ]; then
    echo task is not ready
    exit 2
fi

tonos-cli callx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m askGrantToken --repoName $REPO_NAME --nametask $TASK_NAME --typegrant 1

sleep 10

NEW_TOKEN_CNT=$(tonos-cli -j runx --abi $DAO_ABI --addr $DAO_ADDR -m getWalletsFull | jq '.value0."'$USER_ADDR'".count' | cut -d'"' -f 2)

if [ "$TOKEN_CNT" == "$NEW_TOKEN_CNT" ]; then
    echo Did not get token
    exit 2
fi

data=$(tonos-cli -j decode account data --addr $TASK_ADDR --abi $TASK_ABI)

OLD_WALLET_ADDR=$WALLET_ADDR

echo "Upgrade DAO"
upgrade_DAO

# for old version
#UpdateHead
#UnlockVoting(0)
#Sendtokentonewversion

tonos-cli callx --addr "$OLD_WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m updateHead
sleep 5
tonos-cli callx --addr "$OLD_WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m unlockVoting --amount 0
sleep 5
tonos-cli callx --addr "$OLD_WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m sendTokenToNewVersion --grant 21 --newversion "3.0.0"

sleep 20

NEW_TOKEN_CNT=$(tonos-cli -j runx --abi $DAO_ABI --addr $DAO_ADDR -m getWalletsFull | jq '.value0."'$USER_ADDR'".count' | cut -d'"' -f 2)
tonos-cli -j runx --abi $DAO_ABI --addr $DAO_ADDR -m getTokenBalance

tonos-cli callx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m lockVoting --amount 0

sleep 60

tonos-cli -j runx --abi $DAO_ABI --addr $DAO_ADDR -m getTokenBalance

# string
nametask=$(echo $data | jq ._nametask)

# address
#repo=$(echo $data | jq ._repo)

# string
repoName="\"$REPO_NAME\""

# bool
ready=$(echo $data | jq ._ready)

# ConfigCommitBase[]      NEED TO ADD DAO_MEMBERS daoMembers:{}
candidates="$(echo $data | jq '._candidates[0] += {"daoMembers":{}}' | jq ._candidates | tr -d '[:space:]')"

# ConfigGrant
grant="$(echo $data | jq ._grant | tr -d '[:space:]')"

# string[]
hashtag=$(echo $data | jq ._hashtag)

# uint128
indexFinal=$(echo $data | jq ._indexFinal | tr -d '"')

# uint128
locktime=$(echo $data | jq ._locktime | tr -d '"')

# uint128
fullAssign=$(echo $data | jq ._fullAssign | tr -d '"')

# uint128
fullReview=$(echo $data | jq ._fullReview | tr -d '"')

# uint128
fullManager=$(echo $data | jq ._fullManager | tr -d '"')

# mapping(address => uint128)
assigners="$(echo $data | jq ._assigners | tr -d '[:space:]')"

# mapping(address => uint128)
reviewers=$(echo $data | jq ._reviewers)

# mapping(address => uint128)
managers=$(echo $data | jq ._managers)

# uint128
assignfull=$(echo $data | jq ._assignfull | tr -d '"')

# uint128
reviewfull=$(echo $data | jq ._reviewfull | tr -d '"')

# uint128
managerfull=$(echo $data | jq ._managerfull | tr -d '"')

# uint128
assigncomplete=$(echo $data | jq ._assigncomplete | tr -d '"')

# uint128
reviewcomplete=$(echo $data | jq ._reviewcomplete | tr -d '"')

# uint128
managercomplete=$(echo $data | jq ._managercomplete | tr -d '"')

# bool
allassign=$(echo $data | jq ._allassign)

# bool
allreview=$(echo $data | jq ._allreview)

# bool
allmanager=$(echo $data | jq ._allmanager)

# uint128
lastassign=$(echo $data | jq ._lastassign | tr -d '"')

# uint128
lastreview=$(echo $data | jq ._lastreview | tr -d '"')

# uint128
lastmanager=$(echo $data | jq ._lastmanager | tr -d '"')

# uint128
balance=$(echo $data | jq ._balance | tr -d '"')

params="{"
params+="\"nametask\":$nametask,"
#params+="\"repo\":$repo,"
params+="\"repoName\":$repoName,"
params+="\"ready\":$ready,"
params+="\"candidates\":$candidates,"
params+="\"grant\":$grant,"
params+="\"hashtag\":$hashtag,"
params+="\"indexFinal\":$indexFinal,"
params+="\"locktime\":$locktime,"
params+="\"fullAssign\":$fullAssign,"
params+="\"fullReview\":$fullReview,"
params+="\"fullManager\":$fullManager,"
params+="\"assigners\":$assigners,"
params+="\"reviewers\":$reviewers,"
params+="\"managers\":$managers,"
params+="\"assignfull\":$assignfull,"
params+="\"reviewfull\":$reviewfull,"
params+="\"managerfull\":$managerfull,"
params+="\"assigncomplete\":$assigncomplete,"
params+="\"reviewcomplete\":$reviewcomplete,"
params+="\"managercomplete\":$managercomplete,"
params+="\"allassign\":$allassign,"
params+="\"allreview\":$allreview,"
params+="\"allmanager\":$allmanager,"
params+="\"lastassign\":$lastassign,"
params+="\"lastreview\":$lastreview,"
params+="\"lastmanager\":$lastmanager,"
params+="\"balance\":$balance"
params+="}"

TVMCELL=$(tonos-cli -j runx --addr $WALLET_ADDR --abi $WALLET_ABI_1 -m getCellForTask $params | sed -n '/value0/ p' | cut -d'"' -f 4)
echo "TVMCELL=$TVMCELL"

params="{\"reponame\":\"$REPO_NAME\",\"nametask\":\"$TASK_NAME\",\"hashtag\":[],\"data\":\"$TVMCELL\",\"time\":null}"

CELL_FOR_PROP=$(tonos-cli -j runx --addr $WALLET_ADDR --abi $WALLET_ABI_1 -m getCellForRedeployTask $params | sed -n '/value0/ p' | cut -d'"' -f 4)

CLOSE_PROP_CELL=$(tonos-cli -j runx --addr $WALLET_ADDR --abi $WALLET_ABI_1 -m getCellForRedeployedTask "{\"time\":null}" | sed -n '/value0/ p' | cut -d'"' -f 4)

FINAL_CELL=$(tonos-cli -j runx --addr $WALLET_ADDR --abi $WALLET_ABI_1 -m AddCell "{\"data1\":\"$CELL_FOR_PROP\",\"data2\":\"$CLOSE_PROP_CELL\"}" | sed -n '/value0/ p' | cut -d'"' -f 4)

echo "***** start multi proposal *****"
tonos-cli -j callx --abi $WALLET_ABI_1 --addr $WALLET_ADDR --keys $WALLET_KEYS -m startMultiProposal \
  "{\"number\":2,\"proposals\":\"$FINAL_CELL\",\"num_clients\":1,\"reviewers\":[]}"
NOW_ARG=$(tonos-cli -j account $WALLET_ADDR | grep last_paid | cut -d '"' -f 4)
echo "NOW_ARG=$NOW_ARG"

PROP_ID=$($TVM_LINKER test node_se_scripts/prop_id_gen --gas-limit 100000000 \
  --abi-json node_se_scripts/prop_id_gen.abi.json --abi-method getMultiProposal --abi-params \
  "{\"number\":2,\"proposals\":\"$FINAL_CELL\",\"_now\":$NOW_ARG}" \
   --decode-c6 | grep value0 \
  | sed -n '/value0/ p' | cut -d'"' -f 4)

sleep 60

vote_for_proposal

TASK_ADDR=$(tonos-cli -j runx --addr $WALLET_ADDR -m getTaskAddr --abi $WALLET_ABI_1 --nametask $TASK_NAME --reponame $REPO_NAME | sed -n '/value0/ p' | cut -d'"' -f 4)
wait_account_active $TASK_ADDR

sleep 10

tonos-cli callx --addr "$WALLET_ADDR" --abi "$WALLET_ABI" --keys "$WALLET_KEYS" -m askGrantToken --repoName $REPO_NAME --nametask $TASK_NAME --typegrant 1

sleep 10

TOKEN_CNT=$(tonos-cli -j runx --abi $WALLET_ABI --addr $WALLET_ADDR -m m_pseudoDAOBalance | jq '.m_pseudoDAOBalance' | cut -d'"' -f 2)
if [ "$TOKEN_CNT" != "1" ]; then
  echo Wrong amount of token
  exit 1
fi

echo "TEST SUCCEEDED"