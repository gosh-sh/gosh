#!/bin/bash

set -e
set -o pipefail
set -x
. "$(dirname "$0")/util.sh"

#
# Assumptions check
#
ensure_provided WORKDIR
ensure_provided GIT_REPO_URL
ensure_provided GOSH_SYSTEM_CONTRACT_ADDR
ensure_provided GOSH_DAO_NAME
ensure_provided GOSH_DAO_ADDRESS
ensure_provided GOSH_REPO_NAME
ensure_provided GOSH_BOT_NAME
ensure_provided GOSH_CONFIG_PATH

LOG_DIR=/tmp/logs-git-remote-gosh
mkdir -p $LOG_DIR
LOG_FILE="$LOG_DIR"/"$GOSH_DAO_NAME"-"$GOSH_REPO_NAME".log
touch "$LOG_FILE"

#
# Prepare constants for this run
#
BASE_REPO_DIRNAME="${WORKDIR}/${GIT_REPO_URL//[^a-zA-Z0-9]/}"
# Check workdir existence
set +e
set +o pipefail
LS=$(ls -dc $BASE_REPO_DIRNAME* 2>/dev/null)
set -e
set -o pipefail

if [ -n "$LS" ]; then
    THIS_RUN_WORKDIR=$(printf '%s\n' $LS | head -n 1)
else
    THIS_RUN_WORKDIR="${BASE_REPO_DIRNAME}-${BASHPID}-$(date +%s)"
fi

log "THIS_RUN_WORKDIR=${THIS_RUN_WORKDIR}"

mkdir -p "$THIS_RUN_WORKDIR"
cd "$THIS_RUN_WORKDIR"

if [ ! -d "repo" ]; then
    # ---------
    log "Cloning github repo..."
    CLONE_START=$SECONDS
    git clone "$GIT_REPO_URL" "repo"
    CLONE_END=$SECONDS
    log "...clone complete. Cloned from github in $((CLONE_END - CLONE_START)) seconds."
fi

# ---------
export GOSH_CONFIG_PATH
log "Check if repo was already uploaded"
git clone "gosh://$GOSH_SYSTEM_CONTRACT_ADDR/$GOSH_DAO_NAME/$GOSH_REPO_NAME" "repo_clone" || true
log "Repo already exists on GOSH. Compare it with the original"
if  diff --brief --recursive "repo" "repo_clone" --exclude ".git" --no-dereference; then
    log "Repos are equal"
    exit 0
fi
log "Repos are not equal. Trying to upload it again"
rm -rf "repo_clone"

# ---------
log "Pushing github repo to gosh...\n________________"
PUSH_START=$SECONDS
cd ./repo
git-remote-gosh_v6_1_0 --version
git-remote-gosh dispatcher_ini
REMOTE_GOSH_TRACKED=$(git remote | grep gosh || true)
if [ -z "$REMOTE_GOSH_TRACKED" ]; then
    git remote add gosh "gosh://$GOSH_SYSTEM_CONTRACT_ADDR/$GOSH_DAO_NAME/$GOSH_REPO_NAME"
fi
export GOSH_TRACE=5
export GOSH_REMOTE_WAIT_TIMEOUT=600
export GOSH_REMOTE_WALLET_PARALLELISM=10
git push --all gosh &>>"$LOG_FILE"
PUSH_END=$SECONDS
PUSH_DURATION=$((PUSH_END - PUSH_START))
log "...complete. Push took $(convertsecs $PUSH_DURATION)."
cd ..

sleep 60

log "Cloning after push\n"
git clone "gosh://$GOSH_SYSTEM_CONTRACT_ADDR/$GOSH_DAO_NAME/$GOSH_REPO_NAME" "repo_clone"

log "***** comparing repositories *****"
DIFF_STATUS=1
if  diff --brief --recursive "repo" "repo_clone" --exclude ".git" --no-dereference; then
    DIFF_STATUS=0
fi
log "Compare status: $DIFF_STATUS"

if (( $DIFF_STATUS == 0 )); then
    cd /tmp
    rm $LOG_FILE
    rm -fr $THIS_RUN_WORKDIR
fi

exit $DIFF_STATUS
