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

LOG_DIR=/tmp/logs-git-remote-gosh
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

# ---------
export GOSH_CONFIG_PATH
log "Check if repo was already uploaded"
if git clone "gosh://$GOSH_SYSTEM_CONTRACT_ADDR/$GOSH_DAO_NAME/$GOSH_REPO_NAME" "repo_clone"; then
  log "Repo already exists on GOSH. Compare it with the original"
  if  diff --brief --recursive "repo" "repo_clone" --exclude ".git" --no-dereference; then
      log "Repos are equal"
      exit 0
  fi
  log "Repos are not equal. Trying to upload it again"
  rm -rf "repo_clone"
fi

# ---------
log "Pushing github repo to gosh...\n________________"
PUSH_START=$SECONDS
cd ./repo
git remote add gosh "gosh://$GOSH_SYSTEM_CONTRACT_ADDR/$GOSH_DAO_NAME/$GOSH_REPO_NAME"
git push --all -vvv gosh >>"$LOG_FILE"
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

exit $DIFF_STATUS
