# Description

This file describes test cases for git-remote-gosh and gosh-dispatcher.

## Preliminary actions
1) Compile git-remote-version with feature `for_test`
2) Deploy GOSH of the current version

## 1. Upgrade repo without link to the previous
Description:
Test checks user cant upgrade repo without linking it with one of the previous versions if any exists. 

Steps:
1) Deploy DAO `dao01`
2) Deploy repo `repo01` with current version and obtain link to the repository: <link>
3) Clone repo using the <link>
4) Push file with content `old_ver`
5) Upgrade GOSH to test version `9999.0.0`
6) Upgrade DAO `dao01` to test version `9999.0.0` with proposal
7) Deploy repo with the same name `repo01`, test version `9999.0.0` and `previous` argument set to `null`
8) Obtain new link to the repository: <new_link>
9) Clone repo using the <new_link>
10) Push file with content `new_ver`
11) Clone repo using the <old_link>
12) Check that cloned repo contains file with content equal to `new_ver`

## 2.1 Clone upgraded repo
Description:
Test checks that repo could be upgraded saving commits with old version and that dispatcher chooses the latest
repository version to clone.

Steps:
1) Deploy DAO `dao02`
2) Deploy repo `repo02` with current version and obtain link to the repository <old_link> and repo address <old_address>
3) Clone repo using the <old_link>
4) Push file with content `old_ver`
5) Upgrade GOSH with test version `9999.0.0`
6) Upgrade DAO `dao02` to test version `9999.0.0` with proposal
7) Deploy repo with the same name `repo02`, test version `9999.0.0` and `previous` argument set to <old_address>
8) Obtain new link to the repository: <new_link>
9) Clone repo using the <new_link>
10) Check that cloned repo contains file with content equal to `old_ver`
11) Change file content to `new_ver` and push

## 2.2 Push to the repo after upgrade
Description:
Test checks that after repo upgrade current working directory can still be used to work with a new version of the repo.

Steps:
1) Deploy DAO `dao02_2`
2) Deploy repo `repo02_2` with current version and obtain link to the repository <old_link> and repo address <old_address>
3) Clone repo using the <old_link>
4) Push file with content `old_ver`
5) Upgrade GOSH with test version `9999.0.0`
6) Upgrade DAO `dao02_2` to test version `9999.0.0` with proposal
7) Deploy repo with the same name `repo02_2`, test version `9999.0.0` and `previous` argument set to <old_address>
8) Obtain new link to the repository: <new_link>
9) Change the file content in the old working directory to `new_ver`
10) Push a commit to the repo
11) Clone repo using the <new_link>
12) Check that cloned repo contains file with content equal to `new_ver`

## 3. Create branch from parent version
Description:
Test checks that user can create a branch starting from the commit which was made in the parent version of the repo.

Steps:
1) Deploy DAO `dao03`
2) Deploy repo `repo03` with the current version
3) Push a commit to the repo and get <commit_id_0>
4) Upgrade DAO `dao03` to the test version `9999.0.0` with proposal
5) Upgrade repo `repo03` to the test version `9999.0.0` (by deploying a repo with the same name and link to the previous repo)
6) Push a commit to the repo
7) Create a branch `parent_branch` heading to the <commit_id_0>
8) Checkout the `parent_branch`
9) Check the current state of the repo folder
10) Push a commit to the branch `parent_branch`

## 4. Create branch from grandparent version
Description:
Test checks that user can create a branch starting from the commit which was made in the grandparent version of the
repo.

Steps:
1) Deploy DAO `dao04`
2) Deploy repo `repo04` with the current version
3) Push a commit to the repo and get <commit_id_0>
4) Upgrade DAO `dao04` to the test version `9998.0.0` with proposal
5) Upgrade repo `repo04` to the test version `9998.0.0`
6) Push a commit to the repo
7) Upgrade DAO `dao04` to the test version `9999.0.0` with proposal
8) Upgrade repo `repo04` to the test version `9999.0.0`
9) Push a commit to the repo
10) Create a branch `grandparent_branch` heading to the <commit_id_0>
11) Checkout the `grandparent_branch`
12) Check the current state of the repo folder
13) Push a commit to the branch `grandparent_branch`


## 5.1. Merge branch from parent version
Description:
Test checks that user can update and merge a branch starting from the commit which was made in the parent version of
the repo to the main branch with the latest version.

Steps:
1) Deploy DAO `dao05`
2) Deploy repo `repo05` with the current version
3) Create a file `test_05.txt` with some content
4) Push a commit to the repo and get <commit_id_0>
5) Create a branch `parent_branch` heading to the <commit_id_0>
6) Checkout the `parent_branch`
7) Change the content of the file `test_05.txt` and push it to the branch `parent_branch` 
8) Checkout the `main` branch 
9) Upgrade DAO `dao05` and repo `repo05` to the test version `9999.0.0`
10) Push a commit to the repo without changing the file `test_05.txt`
11) Checkout the `parent_branch`
12) Change the content of the file `test_05.txt` and push it to the branch `parent_branch`
13) Merge branch `parent_branch` to the `main` branch 

## 5.2. Merge branch from parent version with old branch protection
Description:
Test checks that user can update and merge a branch starting from the commit which was made in the parent version of
the repo to the main branch with the latest version. Old branch is protected for this test.

Steps:
1) Deploy DAO `dao05a`
2) Deploy repo `repo05a` with the current version
3) Create a file `test_05a.txt` with some content
4) Push a commit to the repo and get <commit_id_0>
5) Create a branch `parent_branch` heading to the <commit_id_0>
6) Checkout the `parent_branch`
7) Protect the `parent_branch`
8) Change the content of the file `test_05a.txt` and push it to the branch `parent_branch`
9) Checkout the `main` branch
10) Upgrade DAO `dao05a` and repo `repo05a` to the test version `9999.0.0`
11) Push a commit to the repo without changing the file `test_05a.txt`
12) Checkout the `parent_branch`
13) Change the content of the file `test_05a.txt` and push it to the branch `parent_branch`
14) Merge branch `parent_branch` to the `main` branch

## 5.3. Merge branch from parent version with both branch protection
Description:
Test checks that user can update and merge a branch starting from the commit which was made in the parent version of
the repo to the main branch with the latest version. Both branches are protected for this test.

Steps:
1) Deploy DAO `dao05b`
2) Deploy repo `repo05b` with the current version
3) Create a file `test_05b.txt` with some content
4) Push a commit to the repo and get <commit_id_0>
5) Create a branch `parent_branch` heading to the <commit_id_0>
6) Checkout the `parent_branch`
7) Protect the `parent_branch`
8) Change the content of the file `test_05b.txt` and push it to the branch `parent_branch`
9) Checkout the `main` branch
10) Protect the `main` branch
11) Upgrade DAO `dao05b` and repo `repo05b` to the test version `9999.0.0`
12) Push a commit to the repo without changing the file `test_05b.txt`
13) Checkout the `parent_branch`
14) Change the content of the file `test_05b.txt` and push it to the branch `parent_branch`
15) Merge branch `parent_branch` to the `main` branch

## 6.1. Merge branch from grandparent version
Description:
Test checks that user can update and merge a branch starting from the commit which was made in the grandparent version
of the repo to the main branch with the latest version.

Steps:
1) Deploy DAO `dao06`
2) Deploy repo `repo06` with the current version
3) Create a file `test_06.txt` with some content
4) Push a commit to the repo and get <commit_id_0>
5) Create a branch `grandparent_branch` heading to the <commit_id_0>
6) Checkout the `grandparent_branch`
7) Change the content of the file `test_06.txt`
8) Push a commit to the branch `grandparent_branch`
9) Checkout the `main` branch
10) Upgrade DAO `dao06` and repo `repo06` to the test version `9998.0.0`
11) Push a commit to the repo without changing the file `test_06.txt`
12) Upgrade DAO `dao06` and repo `repo06` to the test version `9999.0.0`
13) Push a commit to the repo without changing the file `test_06.txt`
14) Checkout the `grandparent_branch`
15) Change the content of the file `test_06.txt`
16) Push a commit to the branch `grandparent_branch`
17) Merge branch `grandparent_branch` to the `main` branch

## 6.2. Merge branch from grandparent version with old branch protection
Description:
Test checks that user can update and merge a branch starting from the commit which was made in the grandparent version
of the repo to the main branch with the latest version. Old branch is protected for this test.

Steps:
1) Deploy DAO `dao06a`
2) Deploy repo `repo06a` with the current version
3) Create a file `test_06a.txt` with some content
4) Push a commit to the repo and get <commit_id_0>
5) Create a branch `grandparent_branch` heading to the <commit_id_0>
6) Checkout the `grandparent_branch`
7) Protect the `grandparent_branch` branch
8) Change the content of the file `test_06a.txt`
9) Push a commit to the branch `grandparent_branch`
10) Checkout the `main` branch
11) Upgrade DAO `dao06a` and repo `repo06a` to the test version `9998.0.0`
12) Push a commit to the repo without changing the file `test_06a.txt`
13) Upgrade DAO `dao06a` and repo `repo06a` to the test version `9999.0.0`
14) Push a commit to the repo without changing the file `test_06a.txt`
15) Checkout the `grandparent_branch`
16) Change the content of the file `test_06a.txt`
17) Push a commit to the branch `grandparent_branch`
18) Merge branch `grandparent_branch` to the `main` branch

## 6.3. Merge branch from grandparent version with both branches protection
Description:
Test checks that user can update and merge a branch starting from the commit which was made in the grandparent version
of the repo to the main branch with the latest version. Both branches are protected for this test.

Steps:
1) Deploy DAO `dao06b`
2) Deploy repo `repo06b` with the current version
3) Create a file `test_06b.txt` with some content
4) Push a commit to the repo and get <commit_id_0>
5) Create a branch `grandparent_branch` heading to the <commit_id_0>
6) Checkout the `grandparent_branch`
7) Protect the `grandparent_branch` branch
8) Change the content of the file `test_06b.txt`
9) Push a commit to the branch `grandparent_branch`
10) Checkout the `main` branch
11) Protect the `main` branch
12) Upgrade DAO `dao06b` and repo `repo06b` to the test version `9998.0.0`
13) Push a commit to the repo without changing the file `test_06b.txt`
14) Upgrade DAO `dao06b` and repo `repo06b` to the test version `9999.0.0`
15) Push a commit to the repo without changing the file `test_06b.txt`
16) Checkout the `grandparent_branch`
17) Change the content of the file `test_06b.txt`
18) Push a commit to the branch `grandparent_branch`
19) Merge branch `grandparent_branch` to the `main` branch

## 7. Create a branch from unrelated version
Description:
Test checks that user can't create a branch heading to the commit which was made in the version which is unrelated to
the current. 

0
| \
1 |
  /
2

Branch on the 2 version can't head to the commit from version 1.

Steps:
1) Deploy DAO `dao07` and repo `repo07` with the current version 
2) Push a commit to the repo
3) Upgrade DAO `dao07` and repo `repo07` to the test version `9998.0.0` with previous set to current version
4) Push a commit to the repo and get <commit_id_0>
5) Upgrade DAO `dao07` and repo `repo07` to the test version `9999.0.0` with previous set to current version
6) Push a commit to the repo
7) Create a branch heading to the <commit_id_0> - Should fail

## 8. Check tag after upgrade
Description:
Test checks that tag exists after repo upgrade, commit id should be the same.

Steps:
1) Deploy DAO `dao08` and repo `repo08` with the current version
2) Push a commit to the repo and get <commit_id_0>
3) Push tag `relesae` to the last commit
4) Push a commit to the repo
5) Upgrade DAO `dao08` and repo `repo08` to the test version `9999.0.0`
6) Push a commit to the repo
7) Push tag `release` to the last commit - Should fail
8) Check that tag `release` exists and it's commit is equal to <commit_id_0>

## 9. Delete tag after upgrade
Description:
Test checks that after repo upgrade tag from the last version can be deleted and created again.

Steps:
1) Deploy DAO `dao09` and repo `repo09` with the current version
2) Push a commit to the repo
3) Push tag `relesae` to the last commit
4) Push a commit to the repo
5) Upgrade DAO `dao09` and repo `repo09` to the test version `9999.0.0`
6) Push a commit to the repo and get <commit_id_0>
7) Delete tag `release`
8) Push tag heading to the <commit_id_0>
