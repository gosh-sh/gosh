#!/bin/bash
set -e
set -o pipefail
. "$(dirname "$0")/util.sh"
. "$(dirname "$0")/gosh.sh"

PROPOSAL_CODE_HASH=$1
REPO_NAME=$2
PROPOSAL_ABI=abi/SMVProposal.abi.json

ensure_provided NETWORK
ensure_provided PROPOSAL_CODE_HASH
ensure_provided REPO_NAME
ensure_abi_exists PROPOSAL_ABI

accounts=$(curl -s "$NETWORK/graphql" \
    -H 'Accept-Encoding: gzip, deflate, br' \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H 'Connection: keep-alive' \
    -H 'DNT: 1' \
    -H "Origin: $NETWORK" \
    --data-binary "{\"query\":\"query { accounts(filter: { code_hash: { eq: \\\"${PROPOSAL_CODE_HASH}\\\" } }) { id } }\"}" \
    --compressed \
    | jq -r '.data.accounts[] | .id?'
)

for account in $accounts; do
    status=$(get_proposal_deploy_repo_status $account)
    if [ -n "$status" ]; then
        name=$(get_proposal_deploy_repo_name $account)
        if [ $name == $REPO_NAME ]; then
            echo "${status}"
            exit
        fi
    else
        echo ""
    fi
done
