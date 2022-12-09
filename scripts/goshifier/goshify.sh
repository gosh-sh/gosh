#!/bin/bash

set -e
set -o pipefail

ORG_NAME=$1
REPO_NAME=$2

SYSTEM_CONTRACT_ADDR=$3
DAO_NAME=$4
REPO_NAME=$5

if [[ "$5" == "" ]]; then
    echo "Usage: $0 git_user_or_organization_name git_repository_name gosh_system_contract_addr gosh_dao_name gosh_repo_name"
    exit 1
fi

. prepare.sh

DIR="repos/$ORG_NAME-$REPO_NAME"
rm -rf "$DIR"

echo "[$(date)] Clone start"
CLONE_START=$SECONDS
git clone "git@github.com:$ORG_NAME/$REPO_NAME.git" "$DIR"
CLONE_END=$SECONDS
echo "[$(date)] Clone end"
CLONE_DURATION=$((CLONE_END-CLONE_START))

echo "[$(date)] $ORG_NAME/$REPO_NAME cloned from github in $CLONE_DURATION seconds" | tee -a timings.txt

GOSH_REPO="$ORG_NAME-$REPO_NAME"

echo "[$(date)] Create start"
CREATE_START=$SECONDS
./create-repo.sh "$GOSH_REPO"
CREATE_END=$SECONDS
CREATE_DURATION=$((CREATE_END-CREATE_START))
echo "[$(date)] Create end"

echo "[$(date)] $GOSH_REPO gosh repository created in $CREATE_DURATION seconds" | tee -a timings.txt

# ......................................................................................................................
cd "$DIR"

MAIN_BRANCH=$(git rev-parse --abbrev-ref HEAD)

ALL_PUSH_START=$SECONDS
echo "[$(date)] Repository push start"

echo "[$(date)] Push start ($MAIN_BRANCH)"
PUSH_START=$SECONDS
git remote add gosh "gosh://$SYSTEM_CONTRACT_ADDR/$DAO_NAME/$GOSH_REPO"
git push -v gosh
PUSH_END=$SECONDS
PUSH_DURATION=$((PUSH_END-PUSH_START))
echo "[$(date)] Push end ($MAIN_BRANCH)"

echo "[$(date)] $ORG_NAME-$REPO_NAME/$MAIN_BRANCH successfully pushed to gosh in $PUSH_DURATION seconds" | tee -a ../../timings.txt

for branch in $(git branch -r -l 'origin/*' --format '%(refname:short)'); do
    if [[ "$branch" == "origin/HEAD" ]]; then
        continue
    fi
    if [[ "$branch" == "origin/$MAIN_BRANCH" ]]; then
        continue
    fi
    brname=${branch#"origin/"}
    git checkout "$brname"

    echo "[$(date)] Push start ($brname)"
    PUSH_START=$SECONDS
    git push -v gosh
    PUSH_END=$SECONDS
    PUSH_DURATION=$((PUSH_END-PUSH_START))
    echo "[$(date)] Push end ($brname)"

    echo "[$(date)] $ORG_NAME-$REPO_NAME/$brname successfully pushed to gosh in $PUSH_DURATION seconds" | tee -a ../../timings.txt
done

ALL_PUSH_END=$SECONDS
echo "[$(date)] Repository push end"
ALL_PUSH_DURATION=$((ALL_PUSH_END-ALL_PUSH_START))

echo "[$(date)] $ORG_NAME-$REPO_NAME successfully pushed to gosh in $ALL_PUSH_DURATION seconds" | tee -a ../../timings.txt

cd ../..
# ......................................................................................................................
