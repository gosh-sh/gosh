// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

//Structs
struct RootData {
    string name;
    string symbol;
    uint8 decimals;
    uint256 ethroot;
}

struct Subtask {
    uint128 value;
    string name;
}

struct Block {
    int32 global_id;
    TvmCell info;
    TvmCell value_flow;
    TvmCell state_update;
    TvmCell out_msg_queue_updates;
    TvmCell extra;
}

struct BlockExtra {
    TvmCell in_msg_descr;
    TvmCell out_msg_descr;
    TvmCell account_blocks;
    uint256 rand_seed;
    uint256 created_by;
    optional(TvmCell) custom;
}

struct PaidMember {
    uint128 fiatValue;
    uint128 decimals;
    uint128 paidMembershipValue;
    uint128 valuePerSubs;
    uint128 timeForSubs;
    string details;
    uint256 accessKey;
}

struct MemberToken {
    address member;
    uint128 count;
    uint128 expired;
}

struct MemberTokenv4 {
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
    string gitsha;
    optional(uint256) tvmshatree;
    optional(uint256) tvmshafile;
    string commit;
}

struct Diff {
    address snap;
    string nameSnap;
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
    ConfigPair[] subtask;
}

struct ConfigGrantOldv3 {
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
    optional(address) commit;
    optional(uint128) number_commit;
    mapping(address => bool) pubaddrassign;
    mapping(address => bool) pubaddrreview;
    mapping(address => bool) pubaddrmanager;
    mapping(address => string) daoMembers;
}

struct ConfigCommitBaseOldv3 {
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
    string branch;
    optional(address) branchcommit;
}

struct SystemContractV {
    string Key;
    TvmCell Value;
}

struct SystemContractAddr {
    string Key;
    address Value;
}