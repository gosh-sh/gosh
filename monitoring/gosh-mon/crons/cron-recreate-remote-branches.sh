#!/bin/bash

cd "$(dirname "$0")" || exit

docker rm -f \
  gosh-cron-rem-rotate-small \
  gosh-cron-rem-rotate-large \
  gosh-cron-rem-rotate-small-next \
  gosh-cron-rem-rotate-large-next

docker-compose up -d --build \
  gosh-cron-rem-rotate-small \
  gosh-cron-rem-rotate-large \
  gosh-cron-rem-rotate-small-next \
  gosh-cron-rem-rotate-large-next
