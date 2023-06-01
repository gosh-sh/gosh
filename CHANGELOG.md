# Changelog
All notable changes to this project will be documented in this file.

## [4.1.21] - 2023-06-01
### New features
- Improved dispatcher and remotes interaction protocol to allow multiple calls;
- Added wait timeout to GOSH config and env variable `GOSH_REMOTE_WAIT_TIMEOUT`;

### Bug fixes
- Fixed parallel commit load;
- Fixed fetch after upgrade;

## [4.1.20] - 2023-05-12
### Bug fixes
Fixed several bugs with clone command: 
 - Wrong order of entries in git tree
 - Added missing git entry type to object handling

## [4.1.19] - 2023-05-02
### Changed
New versions of GOSH contracts and remote were added. 
A new binary GOSH dispatcher was added, which manages git-remote-gosh binaries to work with repositories of
different versions.

### Changed
All git-remote-gosh binaries now have a separate version, corresponding the version of GOSH contracts it works with.
GOSH dispatcher and the whole project itself has the highest of the existing versions.

### Changed
Lots of bug fixes, especially in processing upgraded repositories, fetch and push operations.
Branch deletion and further creation errors were fixed.

## [2.0.4] - 2022-08-03
### Changed
Major change for Gosh contracts. With the new architecture released:
- It allows parallel uploads for diffs
- Reduces memory footprint on blockchain hosts

### Changed
Git remote helper (gosh) was rewritten in Rust. It unblocks us for further performance improvements.

### Changed
UI part was updated to work with the released contracts

