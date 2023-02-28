#!/bin/bash

set -e
set -o pipefail

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

LOG_DIR=/tmp/logs/git-remote-gosh
mkdir -p $LOG_DIR
LOG_FILE="$LOG_DIR"/"$GOSH_DAO_NAME"-"$GOSH_REPO_NAME".log
touch "$LOG_FILE"

#
# Prepare constants for this run
#
THIS_RUN_WORKDIR="${WORKDIR}/${GIT_REPO_URL//[^a-zA-Z0-9]/}-${BASHPID}-$(date +%s)"
mkdir -p "$THIS_RUN_WORKDIR"
cd "$THIS_RUN_WORKDIR"

# ---------
log "Cloning github repo..."
CLONE_START=$SECONDS
git clone "$GIT_REPO_URL" "repo"
CLONE_END=$SECONDS
log "...clone complete. Cloned from github in $((CLONE_END - CLONE_START)) seconds."

export GOSH_CONFIG_PATH
# ---------
log "Pushing github repo to gosh...\n________________"
PUSH_START=$SECONDS
cd ./repo
git remote add gosh "gosh://$GOSH_SYSTEM_CONTRACT_ADDR/$GOSH_DAO_NAME/$GOSH_REPO_NAME"
git push --all -vvv gosh >>"$LOG_FILE"
PUSH_END=$SECONDS
PUSH_DURATION=$((PUSH_END - PUSH_START))
log "...complete. Push took $(convertsecs $PUSH_DURATION)."
