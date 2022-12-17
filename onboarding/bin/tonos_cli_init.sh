#!/bin/bash

tonos-cli config
tonos-cli config --is_json true
tonos-cli config \
    endpoint add \
    gosh https://bhs01.network.gosh.sh/,https://eri01.network.gosh.sh,https://gra01.network.gosh.sh

tonos-cli config --url gosh
