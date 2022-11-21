// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

import "replayprotection.sol";

//Structs  
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

abstract contract Modifiers is ReplayProtection {   
    string constant versionModifiers = "1.0.0";
    
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
    
    //Deploy constants
    uint128 constant FEE_DEPLOY_DAO = 31000 ton;
    uint128 constant FEE_DEPLOY_REPO = 15 ton;
    uint128 constant FEE_DEPLOY_COMMIT = 20 ton;
    uint128 constant FEE_DEPLOY_DIFF = 17 ton;
    uint128 constant FEE_DEPLOY_SNAPSHOT = 16 ton;
    uint128 constant FEE_DEPLOY_BRANCH = 1.4 ton;
    uint128 constant FEE_DESTROY_BRANCH = 1.6 ton;
    uint128 constant FEE_DEPLOY_TAG = 6 ton;
    uint128 constant FEE_DESTROY_TAG = 1.3 ton;
    uint128 constant FEE_DEPLOY_TREE = 18 ton;
    uint128 constant FEE_DEPLOY_WALLET = 60 ton;
    uint128 constant FEE_DEPLOY_PROFILE = 10000 ton;
    uint128 constant FEE_DEPLOY_SYSTEM_CONTRACT = 51 ton;
    uint128 constant FEE_DEPLOY_DAO_PROFILE = 101 ton;
    
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


    uint256 constant SETCOMMIT_PROPOSAL_KIND = 1;
    uint256 constant ADD_PROTECTED_BRANCH_PROPOSAL_KIND = 2;
    uint256 constant DELETE_PROTECTED_BRANCH_PROPOSAL_KIND = 3;
    uint256 constant SET_TOMBSTONE_PROPOSAL_KIND = 4;
    uint256 constant DEPLOY_WALLET_DAO_PROPOSAL_KIND = 5;
    uint256 constant DELETE_WALLET_DAO_PROPOSAL_KIND = 6;
    uint256 constant SET_UPGRADE_PROPOSAL_KIND = 7;
    
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
        for (uint i = 0; i < bStr.length; i++) {
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) { return false; }
            if ((uint8(bStr[i]) >= 46) && (uint8(bStr[i]) <= 47)) { return false; }
            if (uint8(bStr[i]) == 44){ return false; }
            if (uint8(bStr[i]) == 32){ return false; }
        }
        return true;
    }
}
