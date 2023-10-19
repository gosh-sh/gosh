// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./smv/modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "systemcontract.sol";
import "profiledao.sol";
import "profileindex.sol";

/* Version contract of SystemContract */
contract VersionController is Modifiers {
    string constant _version = "6.2.0";

    mapping(uint256 => SystemContractV) _SystemContractCode;
    mapping(uint8 => TvmCell) _code;

    constructor() onlyOwner {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        tvm.accept();
    }

    function deploySystemContract(string version) public onlyOwner accept saveMsg {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        TvmCell s1 = GoshLib.composeSystemContractStateInit(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey());
        new SystemContract {stateInit: s1, value: FEE_DEPLOY_SYSTEM_CONTRACT, wid: 0, flag: 1}(_code);
    }

    function getMoneyFromSystemContract(string version, uint128 value) public onlyOwner accept saveMsg {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey())).returnMoney{value: 0.1 ton, flag: 1}(value);
    }
    
    function destroySS(string version) public onlyOwner accept saveMsg {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        delete _SystemContractCode[tvm.hash(version)];
    }

    function daoSendTokenToNewVersionAuto3(string version, string previousversion, string namesubdao, address pubaddr, string namedao) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previousversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(previousversion)].Value, tvm.pubkey())).daoSendTokenToNewVersionAuto4{value: 0.1 ton, flag: 1}(pubaddr, namesubdao, namedao, version);
    }

    function sendTokenToNewVersionAuto3(string version, string previousversion, address pubaddr, string namedao) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previousversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(previousversion)].Value, tvm.pubkey())).sendTokenToNewVersionAuto4{value: 0.1 ton, flag: 1}(pubaddr, namedao, version);
    }

    function setSystemContractCode(TvmCell code, string version) public  onlyOwner accept {       
        require(_SystemContractCode.exists(tvm.hash(version)) == false, ERR_SYSTEM_CONTRACT_BAD_VERSION);
        _SystemContractCode[tvm.hash(version)] = SystemContractV(version, code);
    }
    
    function fromInitUpgrade4(string name, string namedao, string nameCommit, address commit, string version, string branch, address newcommit, string previousversion) public view {       
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previousversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(previousversion)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey())).fromInitUpgrade5{value: 0.1 ton, flag : 1}(name, namedao, nameCommit, commit, branch, newcommit);  
    }
    
    function upgradeTag2(string namedao, string namerepo, string nametag, string namecommit, address commit, string content, string version, string previousversion) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previousversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(previousversion)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey())).upgradeTag3{value: 0.1 ton, flag : 1}(namedao, namerepo, nametag, namecommit, commit, content);
    }

    
    function sendTokenToNewVersion3(uint128 grant, string version, string previousversion, address pubaddr, string namedao) public view {
        optional(address) newwallet;
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previousversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(previousversion)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey())).sendTokenToNewVersion4{value: 0.1 ton, flag: 1}(grant, pubaddr, namedao, newwallet);
    }
    
    function sendTokenToNewVersion33(uint128 grant, string version, string previousversion, address pubaddr, string namedao, optional(address) newwallet) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previousversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(previousversion)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey())).sendTokenToNewVersion4{value: 0.1 ton, flag: 1}(grant, pubaddr, namedao, newwallet);
    }

    
    function upgradeDao2(string namedao, string version, address previous, string previousversion) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previousversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(previousversion)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        address[] pubmem;
        ProfileDao(GoshLib.calculateProfileDaoAddress(_code[m_ProfileDaoCode], address(this), namedao)).upgradeDao{value: 0.1 ton, flag : 1}(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey()), previous, pubmem);
    }
    
    function checkUpdateRepo2(string name, string namedao, string version, AddrVersion prev, address answer) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(prev.version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(prev.version)].Value, tvm.pubkey())).checkUpdateRepo3{value : 0.15 ton, flag: 1}(name, namedao, prev, answer);
    }
    
    function checkOldTaskVersion3(string namedao, string nametask, string repo, string previous, address previousaddr, string version, address answer) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previous)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(previous)].Value, tvm.pubkey())).checkOldTaskVersion4{value : 0.15 ton, flag: 1}(namedao, nametask, repo, previousaddr, answer);
    }

    function checkOldBigTaskVersion3(string namedao, string nametask, string repo, string previous, address previousaddr, string version, address answer) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previous)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(previous)].Value, tvm.pubkey())).checkOldBigTaskVersion4{value : 0.15 ton, flag: 1}(namedao, nametask, repo, previousaddr, answer);
    }
    
    function DaoTransferToken3(address pubaddr, uint128 index, string namedao, address wallet, address newwallet, uint128 grant, string oldversion, string newversion) public view {
        require(_SystemContractCode.exists(tvm.hash(newversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(oldversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(newversion)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(oldversion)].Value, tvm.pubkey())).DaoTransferToken4{value : 0.15 ton, flag: 1}(pubaddr, index, namedao, wallet, newwallet, grant, newversion);
    }
    
    function updateCodeDao(TvmCell newcode, TvmCell cell, string version) public accept saveMsg {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
        onCodeUpgrade(cell);
    }
    
    function updateCode(TvmCell newcode, TvmCell cell) public onlyOwner accept saveMsg {
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
        onCodeUpgrade(cell);
    }

    function onCodeUpgrade(TvmCell cell) private pure {
    }
    
    function _getSystemContractAddr(TvmCell code) private view returns(address) {
        return GoshLib.calculateSystemContractAddress(code, tvm.pubkey());
    }

    function returnMoney(address destination, uint128 value) public onlyOwner accept saveMsg {
        destination.transfer(value);
    }  


    function returnMoneyGiver(uint128 value) public onlyOwner accept saveMsg {
        giver.transfer(value);
    }
    
    //Setters
    function setProfileIndex(TvmCell code) public  onlyOwner accept {
        _code[m_ProfileIndexCode] = code;
    }
    
    function setProfile(TvmCell code) public  onlyOwner accept {
        _code[m_ProfileCode] = code;
    }
    
    function setProfileDao(TvmCell code) public  onlyOwner accept {
        _code[m_ProfileDaoCode] = code;
    }

    //Getters   
    function _getProfileIndexAddr(uint256 pubkey, string name) private view returns(address) {
        return GoshLib.calculateProfileIndexAddress(_code[m_ProfileIndexCode], address(this), pubkey, name);
    }    
    
    function getProfileIndexAddr(uint256 pubkey, string name) external view returns(address) {
        return _getProfileIndexAddr(pubkey, name);
    }
    
    function getProfileIndexCode(uint256 pubkey) external view returns(TvmCell) {
        return GoshLib.buildProfileIndexCode(_code[m_ProfileIndexCode], pubkey, address(this), "1.0.0");
    }
    
    function _getProfileAddr(string name) private view returns(address) {
        return GoshLib.calculateProfileAddress(_code[m_ProfileCode], address(this), name);
    }
    
    function getProfileAddr(string name) external view returns(address) {
        return GoshLib.calculateProfileAddress(_code[m_ProfileCode], address(this), name);
    }
    
    function getProfileDaoAddr(string name) external view returns(address){
        return GoshLib.calculateProfileDaoAddress(_code[m_ProfileDaoCode], address(this), name);
    }
    
    function getSystemContractCode(string version) external view returns(SystemContractV) {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        return _SystemContractCode[tvm.hash(version)];
    }

    function getSystemContractAddr(string version) external view returns(address) {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        return GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey());
    }
    
    function getVersionAddr() external view returns(address[]) {
        address[] data;
        uint256 key;
        optional(uint256, SystemContractV) res = _SystemContractCode.next(key);
        while (res.hasValue()) {
            SystemContractV code;
            (key, code) = res.get();
            data.push(_getSystemContractAddr(code.Value));
            res = _SystemContractCode.next(key);
        }
        return data;
    }
    
    function getVersionAddrMap() external view returns(SystemContractAddr[]) {
        SystemContractAddr[] data;
        uint256 key;
        optional(uint256, SystemContractV) res = _SystemContractCode.next(key);
        while (res.hasValue()) {
            SystemContractV code;
            (key, code) = res.get();
            data.push(SystemContractAddr(code.Key, _getSystemContractAddr(code.Value)));
            res = _SystemContractCode.next(key);
        }
        return data;
    }

    function getTagCode(TvmCell tagcode,  address repo, string ver) external pure returns(TvmCell) {
        return GoshLib.buildTagCode(tagcode, repo, ver);
    }

    function getVersions() external view returns(mapping(uint256 => SystemContractV)) {
        return _SystemContractCode;
    }

    function getVersion() external pure returns(string, string) {
        return ("versioncontroller", _version);
    }
}

