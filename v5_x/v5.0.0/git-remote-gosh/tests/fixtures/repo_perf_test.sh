#!/bin/bash
#
# Usage: bash repo_perf_test.sh gosh://... [repo_dir_name]

set -ex
export GOSH_OPENTELEMETRY=1

[[ -z "$1" ]] && echo create repo first && exit

GOSH_REPO_URL=$1
GOSH_REPO_DIR=${2:-repo_perf}

git clone "$GOSH_REPO_URL" "$GOSH_REPO_DIR"
cd "$GOSH_REPO_DIR" || exit 1

# init README
touch README.md
git add .
git commit -m 'add README.md'
git push

# test20
touch test{1..20}
git add .
git commit -m 'test20'
git push

# test20 100kb
for fout in rnd_100k_{1..20}
    do dd if=/dev/urandom of=$fout bs=1024 count=100
done
git add .
git commit -m 'test20 100kb'
git push
