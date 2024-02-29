// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

import "./replayprotection.sol";
import "./structs/structs.sol";

interface IObject {
    function returnSnap(string, bytes, optional(string), string, bytes, optional(string), string, bool) external;
    function returnTree(mapping(uint256 => TreeObject), uint256, string, address) external;
    function returnRepo(string, string, Item[], string, mapping(uint256 => string), bool, optional(string), optional(Grants[]), optional(uint128), optional(address)) external;
    function returnCommit(uint128, address, string, AddrVersion[], string, bool, bool, bool) external;
    function deployIndex(string, address, uint128, TvmCell) external; 
    function returnDao(address, bool, bool, bool, bool, bool, string, mapping(uint256 => MemberToken), uint128, uint128, uint128, mapping(uint256 => string), mapping(uint256 => address), mapping(uint256 => string), bool, mapping(uint8 => PaidMember)) external;
    function returnWallet(uint128, uint128, uint128, address, address, uint128, address, uint128, optional(uint256), bool, optional(uint128)) external;
    function returnTag(string, address, string, string, string) external;
    function returnTask(TvmCell) external;
    function returnKeyBlock(TvmCell) external;
}

abstract contract Wrapper {
    constructor() {}
}

abstract contract Modifiers is ReplayProtection {   
    string constant versionModifiers = "6.3.0";
    
    //Task  constant
    uint8 constant m_assign = 1;
    uint8 constant m_review = 2;
    uint8 constant m_manager = 3;
    
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
    uint8 constant m_DaoTokenWalletCode = 14;
    uint8 constant m_DaoTagCode = 15;
    uint8 constant m_RepoTagCode = 16;
    uint8 constant m_TopicCode = 17;
    uint8 constant m_BigTaskCode = 18;
    uint8 constant m_KeyBlockCode = 19;
    uint8 constant m_WrapperCode = 20;
    uint8 constant m_FactoryCode = 21;
    uint8 constant m_GrantCode = 22;
    uint8 constant m_TagSupplyCode = 23;
    uint8 constant m_DaoWalletCode = 24;
    uint8 constant m_CCWalletCode = 25;
    uint8 constant m_TokenRepoRootCode = 26;
    uint8 constant m_TokenRepoWalletCode = 27;
    
    //Deploy constants
    uint128 constant FEE_DEPLOY_DAO = 100000 ton;
    uint128 constant FEE_DEPLOY_REPO = 85 ton;
    uint128 constant FEE_DEPLOY_COMMIT = 20 ton;
    uint128 constant FEE_DEPLOY_DIFF = 17 ton;
    uint128 constant FEE_DEPLOY_SNAPSHOT = 50 ton;
    uint128 constant FEE_DEPLOY_BRANCH = 1.4 ton;
    uint128 constant FEE_DESTROY_BRANCH = 1.6 ton;
    uint128 constant FEE_DEPLOY_TAG = 6 ton;
    uint128 constant FEE_DEPLOY_TASK = 19 ton;
    uint128 constant FEE_DEPLOY_DAO_TOKEN_WALLET = 200 ton;
    uint128 constant FEE_DESTROY_TAG = 1.3 ton;
    uint128 constant FEE_DEPLOY_TREE = 18 ton;
    uint128 constant FEE_DEPLOY_WALLET = 1000 ton;
    uint128 constant FEE_DEPLOY_PROFILE = 10000 ton;
    uint128 constant FEE_DEPLOY_SYSTEM_CONTRACT = 51 ton;
    uint128 constant FEE_DEPLOY_DAO_PROFILE = 101 ton;
    uint128 constant FEE_DEPLOY_PROFILE_INDEX = 3 ton;
    uint128 constant FEE_DEPLOY_DAO_TAG = 7 ton;
    uint128 constant FEE_DEPLOY_REPO_TAG = 7.5 ton;
    uint128 constant FEE_DEPLOY_TASK_TAG = 7.8 ton;
    uint128 constant FEE_DEPLOY_BIGTASK = 7.9 ton;
    uint128 constant FEE_DEPLOY_TOPIC = 4.8 ton;
    uint128 constant FEE_DEPLOY_KEYBLOCK = 25.5 ton;
    uint128 constant FEE_DEPLOY_WRAPPER = 28 ton;
    uint128 constant FEE_DEPLOY_TAG_SUPPLY = 11 ton;
    uint128 constant FEE_DEPLOY_CCWALLET = 105 ton;
    uint128 constant FEE_DEPLOY_TOKEN_ROOT = 30 ton;
    uint128 constant FEE_DEPLOY_TOKEN_WALLET = 5 ton;

    uint128 constant TYPE_DESTROY_BRANCH = 0;
    uint128 constant TYPE_INITUPGRADE = 1;
    uint128 constant TYPE_PIN_COMMIT = 2;
    uint128 constant TYPE_SET_COMMIT = 3;
    uint128 constant TYPE_SET_CORRECT = 4;
    
    uint128 constant ALONE_DEPLOY_WALLET = 1;
    uint128 constant ALONE_SET_CONFIG = 2;
    uint128 constant ALONE_DEPLOY_REPO = 3;
    uint128 constant ALONE_ADD_TOKEN = 4;
    uint128 constant ALONE_ADD_VOTE_TOKEN = 5;
    uint128 constant ALONE_MINT_TOKEN = 6;
    uint128 constant ALONE_DAOTAG = 7;
    uint128 constant ALONE_DAOTAG_DESTROY = 8;
    uint128 constant ALONE_ALLOW_MINT = 9;
    
    address constant giver = address.makeAddrStd(-1, 0x94fb06c32a69c30bc419a368d1cf567e6358c9c5f07e4326f0c48db506b6f44c);
    uint32 constant CURRENCIES_ID = 1; //NEED TO CHECK
    bool constant LOCK_CCWALLET = true;

    uint128 constant BATCH_SIZE_COMMIT = 5;
    uint128 constant BATCH_SIZE_TREE_DIFF = 5;
    uint128 constant BATCH_SIZE_TREE = 5;
    uint128 constant BATCH_SIZE_TAG = 5;
    
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
