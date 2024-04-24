#!/bin/bash
set -xeu -o pipefail

git init -q

git checkout -b main
touch this
git add this
git commit -q -m c1
echo hello >>this
git commit -q -am c2

mkdir -p some/very/deeply/nested/subdir
(
    cd some/very/deeply/nested/subdir
    touch test
)

git add .
git commit -q -am c3

git remote add origin gosh://0:54fdd2ac8027b16c83b2b8b0cc4360ff4135a936c355bdb5c4776bdd3190fefc/test_dao/test_repo
