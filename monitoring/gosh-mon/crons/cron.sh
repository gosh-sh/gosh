#!/bin/bash

cd "$(dirname "$0")" || exit

docker rm -f gosh-cron-rem-rotate-small
docker rm -f gosh-cron-rem-rotate-large
docker rm -f gosh-cron-rem-rotate-small-next
docker rm -f gosh-cron-rem-rotate-large-next

docker-compose up -d --build
