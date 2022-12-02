// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import "./modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "systemcontract.sol";
import "profiledao.sol";
import "profileindex.sol";

struct SystemContractV {
    string Key;
    TvmCell Value;
}
/* Version contract of SystemContract */
contract VersionController is Modifiers {
    string constant _version = "1.0.0";

    mapping(uint256 => SystemContractV) _SystemContractCode;
    mapping(uint8 => TvmCell) _code;

    constructor() public onlyOwner {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        tvm.accept();
    }

    function deploySystemContract(string version) public onlyOwner accept saveMsg {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        TvmCell s1 = tvm.buildStateInit({
            code: _SystemContractCode[tvm.hash(version)].Value,
            contr: SystemContract,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        new SystemContract {stateInit: s1, value: FEE_DEPLOY_SYSTEM_CONTRACT, wid: 0, flag: 1}(_code);
    }

    function setSystemContractCode(TvmCell code, string version) public  onlyOwner accept {       
        require(_SystemContractCode.exists(tvm.hash(version)) == false, ERR_SYSTEM_CONTRACT_BAD_VERSION);
        _SystemContractCode[tvm.hash(version)] = SystemContractV(version, code);
    }
    
    function upgradeDao2(string namedao, string version, address previous, string previousversion) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(previousversion)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        TvmCell s1 = tvm.buildStateInit({
            code: _SystemContractCode[tvm.hash(previousversion)].Value,
            contr: SystemContract,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        s1 = tvm.buildStateInit({
            code: _SystemContractCode[tvm.hash(version)].Value,
            contr: SystemContract,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        addr = address.makeAddrStd(0, tvm.hash(s1));
        tvm.accept();
        TvmCell s0 = tvm.buildStateInit({
            code: _code[m_ProfileDaoCode],
            contr: ProfileDao,
            varInit: {_name : namedao, _versioncontroller: address(this)}
        });
        address daoprofile = address.makeAddrStd(0, tvm.hash(s0));
        address[] pubmem;
        ProfileDao(daoprofile).upgradeDao{value: 0.1 ton, flag : 1}(addr, previous, pubmem);
    }
    
    function checkUpdateRepo2(string name, string namedao, string version, AddrVersion prev, address answer) public view {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        require(_SystemContractCode.exists(tvm.hash(prev.version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        TvmCell s1 = tvm.buildStateInit({
            code: _SystemContractCode[tvm.hash(version)].Value,
            contr: SystemContract,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        s1 = tvm.buildStateInit({
            code: _SystemContractCode[tvm.hash(prev.version)].Value,
            contr: SystemContract,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        addr = address.makeAddrStd(0, tvm.hash(s1));
        SystemContract(addr).checkUpdateRepo3{value : 0.15 ton, flag: 1}(name, namedao, prev, answer);
    }
    
    function deployProfileIndexContract(uint256 pubkey,  string name) public accept saveMsg {
        TvmCell s1 = tvm.buildStateInit({
            code: GoshLib.buildProfileIndexCode(_code[m_ProfileIndexCode], pubkey),
            contr: ProfileIndex,
            pubkey: tvm.pubkey(),
            varInit: { _name : name, _versioncontroller: address(this) }
        });
        new ProfileIndex {stateInit: s1, value: FEE_DEPLOY_PROFILE_INDEX, wid: 0, flag: 1}(_getProfileAddr(name));
    }
    
    function updateCode(TvmCell newcode, TvmCell cell) public onlyOwner accept saveMsg {
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
        onCodeUpgrade(cell);
    }

    function onCodeUpgrade(TvmCell cell) private pure {
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
        TvmCell s1 = tvm.buildStateInit({
            code: GoshLib.buildProfileIndexCode(_code[m_ProfileIndexCode], pubkey),
            contr: ProfileIndex,
            pubkey: tvm.pubkey(),
            varInit: { _name : name, _versioncontroller: address(this) }
        });
        return address.makeAddrStd(0, tvm.hash(s1));
    }    
    
    function getProfileIndexAddr(uint256 pubkey, string name) external view returns(address) {
        return _getProfileIndexAddr(pubkey, name);
    }
    
    function getProfileIndexCode(uint256 pubkey) external view returns(TvmCell) {
        return GoshLib.buildProfileIndexCode(_code[m_ProfileIndexCode], pubkey);
    }
    
    function _getProfileAddr(string name) private view returns(address) {
        TvmCell s1 = tvm.buildStateInit({
            code: _code[m_ProfileCode],
            contr: Profile,
            varInit: {_name : name, _versioncontroller: address(this)}
        });
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function getProfileAddr(string name) external view returns(address) {
        return _getProfileAddr(name);
    }
    
    function getProfileDaoAddr(string name) external view returns(address){
        TvmCell s0 = tvm.buildStateInit({
            code: _code[m_ProfileDaoCode],
            contr: ProfileDao,
            varInit: {_name : name, _versioncontroller: address(this)}
        });
        return address(tvm.hash(s0));
    }
    
    function getSystemContractCode(string version) external view returns(SystemContractV) {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        return _SystemContractCode[tvm.hash(version)];
    }

    function getSystemContractAddr(string version) external view returns(address) {
        require(_SystemContractCode.exists(tvm.hash(version)), ERR_SYSTEM_CONTRACT_BAD_VERSION);
        TvmCell s1 = tvm.buildStateInit({
            code: _SystemContractCode[tvm.hash(version)].Value,
            contr: SystemContract,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getVersions() external view returns(mapping(uint256 => SystemContractV)) {
        return _SystemContractCode;
    }

    function getVersion() external pure returns(string) {
        return _version;
    }
}
