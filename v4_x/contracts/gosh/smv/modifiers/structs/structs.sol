// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

//Structs  
struct MemberToken {
    address member;
    uint128 count;
}
struct TreeAnswer {
    address sender;
    bool isCommit;
}

struct Request {
    address answer;
    string fullPath;
    string lastPath;
    uint256 sha;
}

struct TreeObject {
    string flags;
    string mode;
    string typeObj;
    string name;
    string sha1;
    uint256 sha256;
}

struct Diff {
    address snap;
    string commit;
    optional(bytes) patch;
    optional(string) ipfs;
    bool removeIpfs;
    string sha1;
    uint256 sha256;
}

struct Item {
    string branchname;
    address commitaddr;
    string commitversion;
}

struct AddrVersion {
    address addr;
    string version;
}

struct GlobalConfig {
        address goshAddr;
}

struct ConfigPair {
    uint128 grant;
    uint128 lock;
}
struct ConfigGrant {
    ConfigPair[] assign;
    ConfigPair[] review;
    ConfigPair[] manager;
}

struct ConfigCommit {
    address task;
    mapping(address => bool) pubaddrassign;
    mapping(address => bool) pubaddrreview;
    mapping(address => bool) pubaddrmanager;
    mapping(address => string) daoMembers;
}

struct ConfigCommitBase {
    address task;
    address commit;
    uint128 number_commit;
    mapping(address => bool) pubaddrassign;
    mapping(address => bool) pubaddrreview;
    mapping(address => bool) pubaddrmanager;
    mapping(address => string) daoMembers;
}

struct MessageInfo {
        uint256 messageHash;
        uint32 expireAt;
}

struct PauseCommit {
    bool send;
    string branch;
    address branchcommit;
    uint128 index;
    uint128 number;
}

struct PauseDiff {
    uint128 send;
    address branchcommit;
    uint128 index;
}

struct PauseTree {
    uint256 index;
    string path;
    uint128 typer;
}

struct SystemContractV {
    string Key;
    TvmCell Value;
}

struct SystemContractAddr {
    string Key;
    address Value;
}