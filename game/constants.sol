// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

import "./replayprotection.sol";

abstract contract Constants is ReplayProtection {   
    string constant versionConstants = "6.2.0";
    
    uint128 constant RANGE_SPAWN = 50;
    uint128 constant STEP_KARMA = 1;
    uint128 constant BASE_INCOME = 20;
    uint128 constant BASE_KARMA = 20;

    uint8 constant LEFT = 0;
    uint8 constant FORWARD = 1;
    uint8 constant BACK = 2;
    uint8 constant RIGHT = 3;

    uint8 constant AWARD_NUM = 64;

    uint8 constant m_ProfileCode = 0;
    uint8 constant m_FieldCode = 1;
    uint8 constant m_AwardCode = 2;

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
