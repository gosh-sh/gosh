#!/bin/bash

cd "$(dirname "$0")" || exit

docker restart \
  gosh-mon-next-rem-la-rd \
  gosh-mon-next-rem-la-wr \
  gosh-mon-rem-la-rd \
  gosh-mon-rem-la-wr
