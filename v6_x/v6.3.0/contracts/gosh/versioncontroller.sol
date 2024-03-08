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
import "profile.sol";
import "ccwallet.sol";

/* Version contract of SystemContract */
contract VersionController is Modifiers {
    string constant _version = "6.3.0";

    mapping(uint256 => SystemContractV) _SystemContractCode;
    mapping(uint8 => TvmCell) _code;

    mapping(uint256 => uint128) _investors;

    constructor() onlyOwner {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        tvm.accept();
    }

    function getSystemContractAddress(string version) public view minValue(0.2 ton) {
        ProfileNew(msg.sender).setNewSystemContractAddress{value: 0.1 ton, flag: 1}(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey()));
    }

    function _deployNewCCWallet(uint256 pubkey) private view returns(address){
        return new CCWallet {stateInit: GoshLib.composeCCWalletStateInit(_code[m_CCWalletCode], address(this), pubkey), value: FEE_DEPLOY_CCWALLET, wid: 0, flag: 1}(_code[m_CCWalletCode]);
    }

    function sendMoneyCCWallet(uint256 pubkey, uint128 value) public view senderIs(GoshLib.calculateCCWalletAddress(_code[m_CCWalletCode], address(this), pubkey)) accept {
        msg.sender.transfer(value);
    }

    function turnOnPubkeyFromProfile(string name, string namedao, uint256 pubkey, string version) public view senderIs(GoshLib.calculateProfileAddress(_code[m_ProfileCode], address(this), name)) accept {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey())).turnOnPubkeyFromProfile{value: 0.1 ton, flag : 1}(namedao, pubkey);
    }

    function turnOffPubkeyFromProfile(string name, string namedao, string version) public view senderIs(GoshLib.calculateProfileAddress(_code[m_ProfileCode], address(this), name)) accept {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey())).turnOffPubkeyFromProfile{value: 0.1 ton, flag : 1}(namedao);
    }

    function returnTokenToGosh(uint256 pubkey, address pubaddr, uint128 value, string version) public view senderIs(GoshLib.calculateCCWalletAddress(_code[m_CCWalletCode], address(this), pubkey)) accept {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        value /= CURRENCIES_DECIMALS;
        SystemContract(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey())).returnTokenToGosh{value: 0.3 ton, flag: 1}(pubaddr, value);
    }

    function sendToken(uint128 token, uint256 pubkey, string version, address pubaddr) public {
        require(GoshLib.calculateSystemContractAddress(_SystemContractCode[tvm.hash(version)].Value, tvm.pubkey()) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        token *= CURRENCIES_DECIMALS;
        if (token > address(this).currencies[CURRENCIES_ID]) {
            SystemContract(msg.sender).returnTokenToGosh{value: 0.3 ton, flag: 1}(pubaddr, token);
            return;
        }
        address answer = _deployNewCCWallet(pubkey);
        CCWallet(answer).getGOSHToken{value: 0.2 ton, flag: 1}(token);
        if (_investors.exists(pubkey) == true) {
            if (_investors[pubkey] >= token) {
                _investors[pubkey] -= token; 
                if (_investors[pubkey] == 0) {
                    delete _investors[pubkey];
                }
                return;
            }
            else {
                token -= _investors[pubkey];
                delete _investors[pubkey];
                ExtraCurrencyCollection data;
                data[CURRENCIES_ID] = token;
                answer.transfer({value: 0.1 ton, currencies: data});
                return;
            }           
        } else {
            ExtraCurrencyCollection data;
            data[CURRENCIES_ID] = token;
            answer.transfer({value: 0.1 ton, currencies: data});
            return;
        }
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
    function setCode(TvmCell code, uint8 id) public  onlyOwner accept {
        _code[id] = code;
    }

    function setInvestors(mapping(uint256 => uint128) investors) public  onlyOwner accept {
        _investors = investors;
    }

    function addInvestor(uint256 pubkey, uint128 token) public  onlyOwner accept {
        _investors[pubkey] += token;
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

    function getHashCell(TvmCell state) external pure returns(uint256) {
        return tvm.hash(state);
    }

    function getPropIdFromCell(TvmCell propData) external pure returns(uint256) {
        TvmSlice s = propData.toSlice();
        (,, uint256 propid) = s.load(uint8, address, uint256);
        return propid;
    }
}
