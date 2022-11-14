#!/bin/bash
set -xeu -o pipefail

git init -q

git checkout -b main
touch test1{1..10000} &
touch test2{1..10000} &
touch test3{1..10000} &
touch test4{1..10000} &
wait
git add .
git commit -q -am c2

git remote add origin gosh://0:54fdd2ac8027b16c83b2b8b0cc4360ff4135a936c355bdb5c4776bdd3190fefc/test_dao/test_repo
