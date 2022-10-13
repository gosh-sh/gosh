// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity =0.64.0;

import "errors.sol";

//Structs
struct MessageInfo {
        uint256 messageHash;
        uint32 expireAt;
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
    string sha1;
    uint256 sha256;
}

struct Item {
    string key;
    address value;
    string version;
}

struct AddrVersion {
    address addr;
    string version;
}

struct GlobalConfig {
        address goshAddr;
}

abstract contract Modifiers is Errors {   
    string constant versionModifiers = "0.11.0";
    
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
    uint128 constant FEE_DEPLOY_GOSH = 51 ton;
    uint128 constant FEE_DEPLOY_DAO_PROFILE = 101 ton;
    
    mapping(uint32 => mapping(uint256 => bool)) messages;
    // Iteration count for cleaning mapping `messages`
    uint8 constant MAX_CLEANUP_ITERATIONS = 20;
    // Information about the last message
    MessageInfo lastMessage;
    // Dummy variable to demonstrate contract functionality.
    uint __value;
    
    
    modifier saveMsg() {
        _saveMsg();
        _;
    }

    function _saveMsg() inline internal {
        gc();
        messages[lastMessage.expireAt][lastMessage.messageHash] = true;
    }
    
    // Colls a function body and then gc()
    modifier clear {
        _;
        gc();
    }
    
    function storeValue(uint newValue) public onlyOwner accept saveMsg {
        __value = newValue;
    }
    
    // Function with predefined name which is used to replace custom replay protection.
    function afterSignatureCheck(TvmSlice body, TvmCell message) private inline returns (TvmSlice) {
        body.decode(uint64); // The first 64 bits contain timestamp which is usually used to differentiate messages.
        // check expireAt
        uint32 expireAt = body.decode(uint32);
        require(expireAt > now, 101);   // Check whether the message is not expired.
        require(expireAt < now + 5 minutes, 102); // Check whether expireAt is not too huge.

        // Check whether the message is not expired and then save (messageHash, expireAt) in the state variable
        uint messageHash = tvm.hash(message);
        optional(mapping(uint256 => bool)) m = messages.fetch(expireAt);
        require(!m.hasValue() || !m.get()[expireAt], 103);
        lastMessage = MessageInfo({messageHash: messageHash, expireAt: expireAt});

        // After reading message headers this function must return the rest of the body slice.
        return body;
    }
    
    /// Delete expired messages from `messages`.
    function gc() private {
        uint counter = 0;
        for ((uint32 expireAt, mapping(uint256 => bool) m) : messages) {
            m; // suspend compilation warning
            if (counter >= MAX_CLEANUP_ITERATIONS) {
                break;
            }
            counter++;
            if (expireAt <= now) {
                delete messages[expireAt];
            } else {
                break;
            }
        }
    }
    
    //SMV configuration
    uint32 constant SETCOMMIT_PROPOSAL_START_AFTER = 1 minutes;
    uint32 constant SETCOMMIT_PROPOSAL_DURATION = 1 weeks;

    uint32 constant ADD_PROTECTED_BRANCH_PROPOSAL_START_AFTER = 1 minutes;
    uint32 constant ADD_PROTECTED_BRANCH_PROPOSAL_DURATION = 1 weeks;

    uint32 constant DELETE_PROTECTED_BRANCH_PROPOSAL_START_AFTER = 1 minutes;
    uint32 constant DELETE_PROTECTED_BRANCH_PROPOSAL_DURATION = 1 weeks;

    uint256 constant SETCOMMIT_PROPOSAL_KIND = 1;
    uint256 constant ADD_PROTECTED_BRANCH_PROPOSAL_KIND = 2;
    uint256 constant DELETE_PROTECTED_BRANCH_PROPOSAL_KIND = 3;

    
    modifier onlyOwner {
        require(msg.pubkey() == tvm.pubkey(), ERR_NOT_OWNER);
        _;
    }
    
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

    modifier accept() {
        tvm.accept();
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
