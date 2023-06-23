#!/bin/bash

function ensure_provided {
    if [ -z "${!1}" ]; then
        echo "Assertion error. Variable ${1} was not passed" 1>&2
        exit 1
    fi
}

function optional {
    if [ -z "${!1}" ]; then
        echo "Optional variable ${1} was not passed"
    fi
}

function ensure_abi_exists {
    ensure_provided "$1"
    if [ ! -f "${!1}" ]; then
        echo "ABI file does not exist at the address provided: ${1} -> ${!1}" 1>&2
        exit 1
    fi
}

function log {
    echo "[$(date +%s)] $1" >>"$LOG_FILE"
}

convertsecs() {
    ((h = ${1} / 3600))
    ((m = (${1} % 3600) / 60))
    ((s = ${1} % 60))
    printf "%02d:%02d:%02d\n" $h $m $s
}
