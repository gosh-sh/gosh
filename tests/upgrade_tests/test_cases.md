# Description

This file describes test cases for git-remote-gosh and gosh-dispatcher.

## Preliminary actions
Since all tests work with current and test versions of the repositories, all repositories with current version should be
deployed before GOSH upgrade. 

## 01. Clone upgraded repo
Description:
Test checks that gosh-dispatcher works by default with the latest version of the repository. gosh-dispatcher should
query all possible versions of the repository and choose the latest.

Steps:
1) Compile git-remote-version with feature `for_test` 
2) Deploy repo `repo01` with current version and obtain link to the repository: <old_link>
3) Clone repo using the <old_link>
4) Push file with content `old_ver`
5) Upgrade GOSH with test version `9999.0.0`
6) Upgrade DAO to test version `9999.0.0` with proposal
7) Deploy repo with the same name `repo01`, test version `9999.0.0` and `previous` argument set to `null`
8) Obtain new link to the repository: <new_link>
9) Clone repo using the <new_link>
10) Push file with content `new_ver` to the new repo
11) Clone repo using the <old_link>
12) Check that cloned repo contains file with content equal to `new_ver` 

## 02. Clone truly upgraded repo
Description:
Test checks that repo could be upgraded saving commits with old version.

Steps:
1) Compile git-remote-version with feature `for_test`
2) Deploy repo `repo02` with current version and obtain link to the repository <old_link> and repo address <old_address>
3) Clone repo using the <old_link>
4) Push file with content `old_ver`
5) Upgrade GOSH with test version `9999.0.0`
6) Upgrade DAO to test version `9999.0.0` with proposal
7) Deploy repo with the same name `repo02`, test version `9999.0.0` and `previous` argument set to <old_address>
8) Obtain new link to the repository: <new_link>
9) Clone repo using the <new_link>
10) Check that cloned repo contains file with content equal to `old_ver`






