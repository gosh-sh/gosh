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
