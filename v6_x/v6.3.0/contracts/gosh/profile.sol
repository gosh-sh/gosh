// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma ignoreIntOverflow;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./smv/modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "versioncontroller.sol";
import "goshwallet.sol";
import "systemcontract.sol";
import "goshdao.sol";
import "profiledao.sol";
import "profileindex.sol";
import "./smv/External/tip3/TokenRoot.sol";

struct MessageProfileNew {
    uint128 index;
    uint128 expiredAt;
    uint32 mask;
    uint8 signsReceived;
    optional(uint256) pubkey;
    optional(address) walletsystemcontract;
    optional(string) name;
    optional(string) namerepo;
    optional(address) previous;
    optional(uint8) newneed;
    optional(uint128) time;
    optional(address[]) pubmembers;
}

contract ProfileNew is Modifiers {
    string version = "1.0.0";
    mapping(uint8 => TvmCell) _code;
    
    address static _versioncontroller;
    string static _name;

    modifier onlyOwnerPubkeyList() {
        require (_owners.exists(msg.pubkey()) == true, ERR_SENDER_NO_ALLOWED) ;
        _;
    }

    address _systemcontract;
    bool _flag = false;
    mapping(uint256 => uint8) _owners;
    mapping(uint8 => uint256) _index;
    mapping(uint64 => MessageProfileNew) _messages;
    uint128 constant MAX_CUSTODIANS = 32;
    uint8 _custodians = 1;
    uint8 _needcustodians = 1;
    uint128 _expTime = 600;
    
    uint128 timeMoney = 0;

    constructor( TvmCell codeProfileDao,
        TvmCell codeProfile,
        TvmCell codeIndex,
        uint256 pubkey
    ) internalMsg {
        require(checkName(_name), ERR_WRONG_NAME);
        _systemcontract = msg.sender;
        _code[m_ProfileDaoCode] = codeProfileDao;
        _code[m_ProfileIndexCode] = codeIndex;
        _code[m_ProfileCode] = codeProfile;
        _owners[pubkey] = 0;
        _index[0] = pubkey;
        this.deployProfileIndexContract{value: 0.3 ton, flag: 1}(pubkey);
        getMoney();
    }
    
    function _incMaskValue(uint32 mask, uint8 index) inline private pure returns (uint32) {
        return uint32(mask + (1 << (uint32(index))));
    }

    function _decMaskValue(uint32 mask, uint8 index) inline private pure returns (uint32) {
        return uint32(mask - (1 << (uint32(index))));
    }
    
    function _checkBit(uint32 mask, uint8 index) inline private pure returns (bool) {
        return (mask & (uint32(1) << index)) != 0;
    }
        
    function _isConfirmed(uint32 mask, uint8 custodianIndex) inline private pure returns (bool) {
        return _checkBit(mask, custodianIndex);
    }
    
    function deployedWallet(address systemcontract, address goshdao, uint128 index, string ver) public pure {
        systemcontract; goshdao; index; ver;
    }
    
    function destroyedWallet(address systemcontract, address goshdao, uint128 index, string ver) public pure {
        systemcontract; goshdao; index; ver;
    }
    
    function _generateId() inline private pure returns (uint64) {
        return (uint64(block.timestamp) << 32) | (tx.logicaltime & 0xFFFFFFFF);
    }
    
    function confirmTransaction(uint64 id) public onlyOwnerPubkeyList  accept saveMsg {        
        require(_messages.exists(id), ERR_NOTHING_TO_CONFIRM);      
        require(_isConfirmed(_messages[id].mask, _owners[msg.pubkey()]) == false, ERR_ALREADY_CONFIRMED);
        getMoney();
        if (_messages[id].expiredAt < block.timestamp) { delete _messages[id]; return; }
        _messages[id].mask = _incMaskValue(_messages[id].mask, _owners[msg.pubkey()]);
        _messages[id].signsReceived += 1;
        if (_messages[id].signsReceived != _needcustodians) { return; }
        if (_messages[id].index == 1) { _addPubkey(_messages[id].pubkey.get()); return; }
        if (_messages[id].index == 2) { _deletePubkey(_messages[id].pubkey.get()); delete _messages[id]; return; }
        if (_messages[id].index == 3) { _turnOn(_messages[id].name.get(), _messages[id].pubkey.get()); delete _messages[id]; return; }
        if (_messages[id].index == 4) { _turnOff(_messages[id].name.get()); delete _messages[id]; return; }
        if (_messages[id].index == 5) { _deployDao(_messages[id].walletsystemcontract.get(), _messages[id].name.get(), _messages[id].previous, _messages[id].pubmembers.get()); delete _messages[id]; return; }
        if (_messages[id].index == 7) { _needcustodians = _messages[id].newneed.get(); delete _messages; return; }      
        if (_messages[id].index == 8) { _expTime = _messages[id].time.get(); delete _messages[id]; return; }        
        if (_messages[id].index == 9) { _transferFromWallet(_messages[id].name.get(), _messages[id].namerepo.get(), _messages[id].time.get(), _messages[id].previous.get()); delete _messages[id]; return; }         
    }
    
    function clearExpired(uint64 index) public senderIs(address(this))  accept saveMsg {  
        MessageProfileNew obj;   
        if ((index == 0) && (_messages.exists(index) == true)) {
            if (_messages[index].expiredAt < block.timestamp) { delete _messages[index]; }  
        }
        optional(uint64, MessageProfileNew) res = _messages.next(index);
        if (res.hasValue()) {
            (index, obj) = res.get();
            if (obj.expiredAt < block.timestamp) { delete _messages[index]; }    
            this.clearExpired{value: 0.1 ton, flag: 1}(index);
        }
    }
    
    function setNewExpiredTime(uint128 time) public onlyOwnerPubkeyList  accept saveMsg {
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _expTime = time;
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfileNew(8, block.timestamp + _expTime, mask, 1, null, null, null, null, null, null, time, null);
    }

    function transferFromWallet(string namedao, string namerepo, uint128 value, address pubaddr) public onlyOwnerPubkeyList  accept saveMsg {
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _transferFromWallet(namedao, namerepo, value, pubaddr);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfileNew(9, block.timestamp + _expTime, mask, 1, null, null, namedao, namerepo, pubaddr, null, value, null);
    }

    function _transferFromWallet(string namedao, string namerepo, uint128 value, address pubaddr) private view accept {
        SystemContract(_systemcontract).transferFromWallet{value: 0.1 ton, flag: 1}(_name, namedao, namerepo, value, pubaddr);
    }

    function transferFromWalletAgain(address from, address to, uint128 value) public view senderIs(_systemcontract) accept {
        TvmCell b;
        TokenWallet(from).transfer{value: 0.5 ton, flag: 1}(value, to, FEE_DEPLOY_TOKEN_WALLET, address(this), false, b);
    }

    function deployWalletForRepo(string namedao, string namerepo) public onlyOwnerPubkeyList  accept saveMsg {
        SystemContract(_systemcontract).deployWalletForRepo{value: 0.1 ton, flag: 1}(_name, namedao, namerepo);
    }

    function setNewNeedCustodians(uint8 need) public onlyOwnerPubkeyList  accept saveMsg {
        require(_custodians >= need, ERR_BAD_NUMBER_CUSTODIANS);
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            if (need == 1) { return; }
            _needcustodians = need; 
            delete _messages;
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfileNew(7, block.timestamp + _expTime, mask, 1, null, null, null, null, null, need, null, null);
    }

    function addPubkey(uint256 pubkey) public onlyOwnerPubkeyList  accept saveMsg {
        require(_custodians < MAX_CUSTODIANS, ERR_BAD_NUMBER_CUSTODIANS);
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _addPubkey(pubkey);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfileNew(1, block.timestamp + _expTime, mask, 1, pubkey, null, null, null, null, null, null, null);
    }

    function deletePubkey(uint256 pubkey) public onlyOwnerPubkeyList  accept saveMsg {
        require(_custodians > _needcustodians, ERR_BAD_NUMBER_CUSTODIANS);
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _deletePubkey(pubkey);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfileNew(2, block.timestamp + _expTime, mask, 1, pubkey, null, null, null, null, null, null, null);
    }
    
    function _addPubkey(uint256 pubkey) private  accept  {
        require(_custodians < MAX_CUSTODIANS, ERR_BAD_NUMBER_CUSTODIANS);      
        _owners[pubkey] = _custodians;
        _index[_custodians] = pubkey;
        _custodians += 1;
        delete _messages;
        this.deployProfileIndexContract{value: 0.1 ton, flag: 1}(pubkey);
        getMoney();
    }

    function _deletePubkey(uint256 pubkey) private  accept  {
        require(_custodians > 1, ERR_BAD_NUMBER_CUSTODIANS);
        _custodians -= 1;
        uint8 ind = _owners[pubkey];
        if (ind != _custodians) { uint256 pub = _index[_custodians]; _owners[pub] = ind; _index[ind] = pub; }
        delete _owners[pubkey];
        delete _index[_custodians];
        delete _messages;
        this.deleteProfileIndexContract{value: 0.1 ton, flag: 1}(pubkey);
        getMoney();
    }

    function turnOn(string namedao, uint256 pubkey) public onlyOwnerPubkeyList accept saveMsg {
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _turnOn(namedao, pubkey);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfileNew(3, block.timestamp + _expTime, mask, 1, pubkey, null, namedao, null, null, null, null, null);
    }
    
    function _turnOn(string namedao, uint256 pubkey) private accept {
        SystemContract(_systemcontract).turnOnPubkeyFromProfile{value: 0.1 ton, flag : 1}(_name, namedao, pubkey);
        getMoney();
    }

    function _turnOff(string namedao) private accept {
        SystemContract(_systemcontract).turnOffPubkeyFromProfile{value: 0.1 ton, flag : 1}(_name, namedao);
        getMoney();
    }
    
    function turnOff(string namedao) public onlyOwnerPubkeyList accept saveMsg {
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _turnOff(namedao);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfileNew(4, block.timestamp + _expTime, mask, 1, null, null, namedao, null, null, null, null, null);
    }

    function deployDao(address systemcontract, string name, address[] pubmem) public onlyOwnerPubkeyList  accept saveMsg {
        getMoney();
        require(pubmem.length > 0, ERR_WRONG_NUMBER_MEMBER);
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _deployDao(systemcontract, name, null, pubmem);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfileNew(5, block.timestamp + _expTime, mask, 1, null, systemcontract, name, null, null, null, null, pubmem);
    }
    
    function _deployDao(address systemcontract, string name, optional(address) previous, address[] pubmem) private view  accept  {
        TvmCell s0 = tvm.buildStateInit({
            code: _code[m_ProfileDaoCode],
            contr: ProfileDao,
            varInit: {_name : name, _versioncontroller: _versioncontroller}
        });
        address daoprofile = new ProfileDao {stateInit: s0, value: FEE_DEPLOY_DAO_PROFILE, wid: 0, flag: 1}();
        ProfileDao(daoprofile).deployDao{value: 0.1 ton, flag : 1}(systemcontract, previous, pubmem);
    }

    function sendMoneyProfileDao(string name, uint128 value) public view {
        TvmCell s0 = tvm.buildStateInit({
            code: _code[m_ProfileDaoCode],
            contr: ProfileDao,
            varInit: {_name : name, _versioncontroller: _versioncontroller}
        });
        address daoprofile = new ProfileDao {stateInit: s0, value: FEE_DEPLOY_DAO_PROFILE, wid: 0, flag: 1}();
        require(daoprofile == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        daoprofile.transfer(value);
    }
    
    function deleteProfileIndexContract(uint256 pubkey) public senderIs(address(this)) accept saveMsg {
        ProfileIndex(_getProfileIndexAddr(pubkey)).destroy{value : 0.2 ton, flag: 1}();
    }
    
    function deployProfileIndexContract(uint256 pubkey) public senderIs(address(this)) accept saveMsg {
        TvmCell s1 = tvm.buildStateInit({
            code: GoshLib.buildProfileIndexCode(_code[m_ProfileIndexCode], pubkey, _versioncontroller, version),
            contr: ProfileIndex,
            pubkey: tvm.pubkey(),
            varInit: { _name : _name }
        });
        new ProfileIndex {stateInit: s1, value: FEE_DEPLOY_PROFILE_INDEX, wid: 0, flag: 1}(address(this), _code[m_ProfileCode]);
    }

    function codeUpdate() public onlyOwner accept saveMsg {
        SystemContract(_systemcontract).updateCodeForProfile{value: 0.1 ton, flag: 1}(_name);
    }
    
    function updateCode(TvmCell newcode, TvmCell cell, string newversion) public senderIs(_systemcontract) accept {
        version = newversion;
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
        onCodeUpgrade(cell);
    }

    function onCodeUpgrade(TvmCell cell) private pure {
    }

    //Money part
    function getMoney() private {
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
        if (_flag == true) { return; }
        if (address(this).balance > 1000 ton) { return; }
        _flag = true;
        SystemContract(_systemcontract).sendMoneyProfile{value : 0.2 ton}(_name, 1000 ton);
    }

    //Fallback/Receive
    receive() external {
        if (msg.sender == _systemcontract) {
            _flag = false;
        }
    }

    //Setters
    function setNewSystemContract(string newversion) public view onlyOwnerPubkeyList {
        tvm.accept();
        VersionController(_versioncontroller).getSystemContractAddress{value: 0.3 ton, flag: 1}(newversion);
    }

    function setNewSystemContractAddress(address systemcontract) public senderIs(_versioncontroller) {
        tvm.accept();
        _systemcontract = systemcontract;
    }

    //Getters
    function _getProfileIndexAddr(uint256 pubkey) private view returns(address) {
        TvmCell s1 = tvm.buildStateInit({
            code: GoshLib.buildProfileIndexCode(_code[m_ProfileIndexCode], pubkey, _versioncontroller, version),
            contr: ProfileIndex,
            pubkey: tvm.pubkey(),
            varInit: { _name : _name }
        });
        return address.makeAddrStd(0, tvm.hash(s1));
    }    
    
    function getProfileIndexAddr(uint256 pubkey) external view returns(address) {
        return _getProfileIndexAddr(pubkey);
    }
    
    function getProfileIndexCode(uint256 pubkey) external view returns(TvmCell) {
        return GoshLib.buildProfileIndexCode(_code[m_ProfileIndexCode], pubkey, _versioncontroller, version);
    }
    
    function getMessages() external view returns(mapping(uint64 => MessageProfileNew)){
        return _messages;
    }
    
    function getName() external view returns(string) {
        return _name;
    }
    
    function getCustodians() external view returns(uint128, uint128) {
        return (_custodians, _needcustodians);
    }    
    function getAccess() external view returns(mapping(uint256 => uint8)) {
        return _owners;
    }
    
    function getCurrentSystemContract() external view returns(address) {
        return _systemcontract;
    }

    function isPubkeyCorrect(uint256 pubkey) external view returns(bool) {
        return _owners.exists(pubkey);
    }

    function getProfileDaoAddr(string name) external view returns(address){
        TvmCell s0 = tvm.buildStateInit({
            code: _code[m_ProfileDaoCode],
            contr: ProfileDao,
            varInit: {_name : name, _versioncontroller: _versioncontroller}
        });
        return address(tvm.hash(s0));
    }
}
