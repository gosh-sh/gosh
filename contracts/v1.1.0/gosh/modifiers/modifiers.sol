// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

import "replayprotection.sol";

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

struct ConfigGrant {
    uint128 assign;
    uint128 review;
    uint128 manager;
}

struct ConfigCommit {
    address task;
    address pubaddrassign;
    address pubaddrreview;
    address pubaddrmanager;
}

abstract contract Modifiers is ReplayProtection {   
    string constant versionModifiers = "1.1.0";
    
    //TvmCell constants
    uint8 constant m_RepositoryCode = 1;
    uint8 constant m_CommitCode = 2;
    uint8 constant m_WalletCode = 3;
    uint8 constant m_TagCode = 4;
    uint8 constant m_SnapshotCode = 5;
    uint8 constant m_TreeCode = 6;
    uint8 constant m_DiffCode = 7;
    uint8 constant m_contentSignature= 8;
    uint8 constant m_DaoCode = 9;
    uint8 constant m_ProfileCode = 10;
    uint8 constant m_ProfileDaoCode = 11;
    uint8 constant m_ProfileIndexCode = 12;
    uint8 constant m_TaskCode = 13;
    
    //Deploy constants
    uint128 constant FEE_DEPLOY_DAO = 50000 ton;
    uint128 constant FEE_DEPLOY_REPO = 15 ton;
    uint128 constant FEE_DEPLOY_COMMIT = 20 ton;
    uint128 constant FEE_DEPLOY_DIFF = 17 ton;
    uint128 constant FEE_DEPLOY_SNAPSHOT = 50 ton;
    uint128 constant FEE_DEPLOY_BRANCH = 1.4 ton;
    uint128 constant FEE_DESTROY_BRANCH = 1.6 ton;
    uint128 constant FEE_DEPLOY_TAG = 6 ton;
    uint128 constant FEE_DEPLOY_TASK = 9 ton;
    uint128 constant FEE_DESTROY_TAG = 1.3 ton;
    uint128 constant FEE_DEPLOY_TREE = 18 ton;
    uint128 constant FEE_DEPLOY_WALLET = 1000 ton;
    uint128 constant FEE_DEPLOY_PROFILE = 10000 ton;
    uint128 constant FEE_DEPLOY_SYSTEM_CONTRACT = 51 ton;
    uint128 constant FEE_DEPLOY_DAO_PROFILE = 101 ton;
    uint128 constant FEE_DEPLOY_PROFILE_INDEX = 3 ton;
    
    //SMV configuration
    uint32 constant SETCOMMIT_PROPOSAL_START_AFTER = 1 minutes;
    uint32 constant SETCOMMIT_PROPOSAL_DURATION = 1 weeks;

    uint32 constant ADD_PROTECTED_BRANCH_PROPOSAL_START_AFTER = 1 minutes;
    uint32 constant ADD_PROTECTED_BRANCH_PROPOSAL_DURATION = 1 weeks;

    uint32 constant DELETE_PROTECTED_BRANCH_PROPOSAL_START_AFTER = 1 minutes;
    uint32 constant DELETE_PROTECTED_BRANCH_PROPOSAL_DURATION = 1 weeks;

    uint32 constant SET_TOMBSTONE_PROPOSAL_START_AFTER  = 1 minutes;
    uint32 constant SET_TOMBSTONE_PROPOSAL_DURATION  = 1 weeks;

    uint32 constant DEPLOY_WALLET_DAO_PROPOSAL_START_AFTER  = 1 minutes;
    uint32 constant DEPLOY_WALLET_DAO_PROPOSAL_DURATION  = 1 weeks;

    uint32 constant DELETE_WALLET_DAO_PROPOSAL_START_AFTER  = 1 minutes;
    uint32 constant DELETE_WALLET_DAO_PROPOSAL_DURATION  = 1 weeks; 

    uint32 constant SET_UPGRADE_PROPOSAL_START_AFTER  = 1 minutes;
    uint32 constant SET_UPGRADE_PROPOSAL_DURATION  = 1 weeks; 

    uint32 constant CHANGE_TOKEN_CONFIG_PROPOSAL_START_AFTER  = 1 minutes;
    uint32 constant CHANGE_TOKEN_CONFIG_PROPOSAL_DURATION  = 1 weeks; 


    uint256 constant SETCOMMIT_PROPOSAL_KIND = 1;
    uint256 constant ADD_PROTECTED_BRANCH_PROPOSAL_KIND = 2;
    uint256 constant DELETE_PROTECTED_BRANCH_PROPOSAL_KIND = 3;
    uint256 constant SET_TOMBSTONE_PROPOSAL_KIND = 4;
    uint256 constant DEPLOY_WALLET_DAO_PROPOSAL_KIND = 5;
    uint256 constant DELETE_WALLET_DAO_PROPOSAL_KIND = 6;
    uint256 constant SET_UPGRADE_PROPOSAL_KIND = 7;
    uint256 constant CHANGE_TOKEN_CONFIG_PROPOSAL_KIND = 8;
    
    uint128 constant ALONE_DEPLOY_WALLET = 1;
    uint128 constant ALONE_SET_CONFIG = 2;
    
    address constant giver = address.makeAddrStd(-1, 0x94fb06c32a69c30bc419a368d1cf567e6358c9c5f07e4326f0c48db506b6f44c);
    
    modifier onlyOwnerPubkeyOptional(optional(uint256) rootpubkey) {
        require(rootpubkey.hasValue() == true, ERR_NOT_OWNER);
        require(msg.pubkey() == rootpubkey.get(), ERR_NOT_OWNER);
        _;
    }

    modifier onlyOwnerPubkey(uint256 rootpubkey) {
        require(msg.pubkey() == rootpubkey, ERR_NOT_OWNER);
        _;
    }
    
    modifier onlyOwnerAddress(address addr) {
        require(msg.sender == addr, ERR_NOT_OWNER);
        _;
    }
    
    modifier minValue(uint128 val) {
        require(msg.value >= val, ERR_LOW_VALUE);
        _;
    }
    
    modifier senderIs(address sender) {
        require(msg.sender == sender, ERR_INVALID_SENDER);
        _;
    }
    
    modifier minBalance(uint128 val) {
        require(address(this).balance > val + 1 ton, ERR_LOW_BALANCE);
        _;
    }
    
    //Limit for names
    function checkName(string name) internal pure returns(bool) {
        bytes bStr = bytes(name);
        if (bStr.length == 0) { return false; }
        if (bStr.length > 39) { return false; }
        for (uint i = 0; i < bStr.length; i++) {
            bool onecheck = false;
            if ((uint8(bStr[i]) >= 97) && (uint8(bStr[i]) <= 122)) { onecheck = true; }
            if ((uint8(bStr[i]) >= 48) && (uint8(bStr[i]) <= 57)) {  onecheck = true; }
            if (i != 0) {
            	if ((uint8(bStr[i]) == 95) && (uint8(bStr[i - 1]) != 95)) {  onecheck = true; }
            	if ((uint8(bStr[i]) == 45) && (uint8(bStr[i - 1]) != 45)) {  onecheck = true; }
            }
            if (onecheck == false) { return false; }
        }
        return true;
    }
    
    function checkNameDao(string name) internal pure returns(bool) {
        bytes bStr = bytes(name);
        if (bStr.length == 0) { return false; }
        if (bStr.length > 39) { return false; }
        for (uint i = 0; i < bStr.length; i++) {
            bool onecheck = false;
            if ((uint8(bStr[i]) >= 97) && (uint8(bStr[i]) <= 122)) { onecheck = true; }
            if ((uint8(bStr[i]) >= 48) && (uint8(bStr[i]) <= 57)) {  onecheck = true; }
            if (i != 0) {
            	if ((uint8(bStr[i]) == 95) && (uint8(bStr[i - 1]) != 95)) {  onecheck = true; }
            	if ((uint8(bStr[i]) == 45) && (uint8(bStr[i - 1]) != 45)) {  onecheck = true; }
            }
            if (onecheck == false) { return false; }
        }
        return true;
    }
    
    function checkNameRepo(string name) internal pure returns(bool) {
        bytes bStr = bytes(name);
        if (bStr.length == 0) { return false; }
        if (bStr.length > 100) { return false; }
        for (uint i = 0; i < bStr.length; i++) {
            bool onecheck = false;
            if ((uint8(bStr[i]) >= 97) && (uint8(bStr[i]) <= 122)) { onecheck = true; }
            if ((uint8(bStr[i]) >= 48) && (uint8(bStr[i]) <= 57)) {  onecheck = true; }
            if (uint8(bStr[i]) == 95) {  onecheck = true; }
            if (uint8(bStr[i]) == 46) {  onecheck = true; }
            if (uint8(bStr[i]) == 45) {  onecheck = true; }
            if (onecheck == false) { return false; }
        }
        return true;
    }
    
    function checkNameBranch(string name) internal pure returns(bool) {
        bytes bStr = bytes(name);
        if (bStr.length == 0) { return false; }
        if (bStr.length > 100) { return false; }
        for (uint i = 0; i < bStr.length; i++) {
            bool onecheck = false;
            if ((uint8(bStr[i]) >= 97) && (uint8(bStr[i]) <= 122)) { onecheck = true; }
            if ((uint8(bStr[i]) >= 48) && (uint8(bStr[i]) <= 57)) {  onecheck = true; }
            if (uint8(bStr[i]) == 95) {  onecheck = true; }
            if (uint8(bStr[i]) == 46) {  onecheck = true; }
            if (uint8(bStr[i]) == 45) {  onecheck = true; }
            if (onecheck == false) { return false; }
        }
        return true;
    }
}
