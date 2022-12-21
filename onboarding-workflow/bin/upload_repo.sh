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
ensure_provided GOSH_BOT_WALLET_ADDRESS
ensure_provided GOSH_BOT_WALLET_PUBKEY
ensure_provided GOSH_BOT_WALLET_SECRET
ensure_provided GOSH_ENDPOINT
ensure_provided GOSH_ABI_DIR
optional GOSH_REPOSITORY_ADDRESS

cd "$GOSH_ABI_DIR"
GOSH_ABI_DIR="$(pwd)"
cd - 1> /dev/null
SYSTEM_CONTRACT_ABI="${GOSH_ABI_DIR}/systemcontract.abi.json"
ensure_abi_exists SYSTEM_CONTRACT_ABI
#
# Prepare constants for this run
#
THIS_RUN_WORKDIR="${WORKDIR}/${GIT_REPO_URL//[^a-zA-Z0-9]}-${BASHPID}-$(date +%s)"
mkdir -p $THIS_RUN_WORKDIR
cd $THIS_RUN_WORKDIR
LOG_FILE="$(pwd)/log.txt"
GOSH_CONFIG_PATH="$(pwd)/config.json"


log "This task is to clone to gosh from ${GIT_REPO_URL}."
# ---------
log "Getting access keys..."
# stub
GRANTED_PUBKEY=GOSH_BOT_WALLET_PUBKEY
log "...granted"

# ---------
log "Cloning github repo..."
CLONE_START=$SECONDS
git clone $GIT_REPO_URL "repo"
CLONE_END=$SECONDS
log "...clone complete. Cloned from github in $((CLONE_END-CLONE_START)) seconds."

# ---------
# log "Creating gosh repository..."
# Stub
# TODO:
# It's either created in this script
# or GOSH_REPOSITORY_ADDRESS is passed
# Either way GOSH_REPOSITORY_ADDRESS must be available after this stage
# log "...gosh repository created."

if [ -z "${GOSH_REPOSITORY_ADDRESS}" ]; then
    log "Getting gosh repository address..."
    GOSH_REPOSITORY_ADDRESS=$(tonos-cli -u "${GOSH_ENDPOINT}" -j run "$GOSH_SYSTEM_CONTRACT_ADDR" getAddrRepository "{\"dao\":\"${GOSH_DAO_NAME}\", \"name\":\"${GOSH_REPO_NAME}\"}" --abi "$SYSTEM_CONTRACT_ABI" | jq -r '.value0')
    log "...repository address acquired. ${GOSH_REPOSITORY_ADDRESS}"
fi

# ---------
log "creating config.json"
cat > ${GOSH_CONFIG_PATH} <<EOF
{
    "primary-network": "mainnet",
    "networks": {
        "user-wallet": {
            "profile": "${GOSH_BOT_NAME}",
            "pubkey": "${GOSH_BOT_WALLET_PUBKEY}",
            "secret": "${GOSH_BOT_WALLET_SECRET}"
        },
        "endpoints": [
            "${GOSH_ENDPOINT}"
        ]
    }
}
EOF
export GOSH_CONFIG_PATH
# ---------
ensure_provided GOSH_REPOSITORY_ADDRESS
log "Pushing github repo to gosh...\n________________"
PUSH_START=$SECONDS
cd ./repo
git remote add gosh "gosh://$GOSH_SYSTEM_CONTRACT_ADDR/$GOSH_DAO_NAME/$GOSH_REPO_NAME"
git push --all -v gosh >> $LOG_FILE
PUSH_END=$SECONDS
PUSH_DURATION=$((PUSH_END-PUSH_START))
log "...complete. Push took $(convertsecs $PUSH_DURATION)."
