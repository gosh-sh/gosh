// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.65.0;
pragma ignoreIntOverflow;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import "./modifiers/modifiers.sol";
import "goshwallet.sol";
import "gosh.sol";
import "goshdao.sol";
import "profiledao.sol";

struct MessageProfile {
    uint128 index;
    uint128 expiredAt;
    uint32 mask;
    uint8 signsReceived;
    optional(uint256) pubkey;
    optional(address) walletgoshroot;
    optional(string) name;
    optional(address) previous;
    optional(uint8) newneed;
    optional(uint128) time;
    optional(address[]) pubmembers;
}

contract Profile is Modifiers {
    string constant version = "1.0.0";
    TvmCell m_codeProfileDao;

    string static _name;

    modifier onlyOwnerPubkeyList() {
        require (_owners.exists(msg.pubkey()) == true, ERR_SENDER_NO_ALLOWED) ;
        _;
    }

    address _goshroot;
    bool _flag = false;
    mapping(uint256 => uint8) _owners;
    mapping(uint8 => uint256) _index;
    mapping(uint64 => MessageProfile) _messages;
    uint128 constant MAX_CUSTODIANS = 32;
    uint8 _custodians = 1;
    uint8 _needcustodians = 1;
    uint128 _expTime = 600;

    constructor( TvmCell codeProfileDao,
        uint256 pubkey
    ) public {
        _goshroot = msg.sender;
        m_codeProfileDao = codeProfileDao;
        _owners[pubkey] = 0;
        _index[0] = pubkey;
        getMoney();
    }
    
    function _incMaskValue(uint32 mask, uint8 index) inline private pure returns (uint32) {
        return mask + (1 << (uint32(index)));
    }

    function _decMaskValue(uint32 mask, uint8 index) inline private pure returns (uint32) {
        return mask - (1 << (uint32(index)));
    }
    
    function _checkBit(uint32 mask, uint8 index) inline private pure returns (bool) {
        return (mask & (uint32(1) << index)) != 0;
    }
        
    function _isConfirmed(uint32 mask, uint8 custodianIndex) inline private pure returns (bool) {
        return _checkBit(mask, custodianIndex);
    }
    
    function deployedWallet(address goshroot, address goshdao, uint128 index, string ver) public pure {
        goshroot; goshdao; index; ver;
    }
    
    function _generateId() inline private pure returns (uint64) {
        return (uint64(now) << 32) | (tx.timestamp & 0xFFFFFFFF);
    }
    
    function confirmTransaction(uint64 id) public onlyOwnerPubkeyList  accept saveMsg {        
        require(_messages.exists(id), ERR_NOTHING_TO_CONFIRM);      
        require(_isConfirmed(_messages[id].mask, _owners[msg.pubkey()]) == false, ERR_ALREADY_CONFIRMED);
        getMoney();
        if (_messages[id].expiredAt < now) { delete _messages[id]; return; }
        _messages[id].mask = _incMaskValue(_messages[id].mask, _owners[msg.pubkey()]);
        _messages[id].signsReceived += 1;
        if (_messages[id].signsReceived != _needcustodians) { return; }
        if (_messages[id].index == 1) { _addPubkey(_messages[id].pubkey.get()); return; }
        if (_messages[id].index == 2) { _deletePubkey(_messages[id].pubkey.get()); delete _messages[id]; return; }
        if (_messages[id].index == 3) { _turnOn(_messages[id].walletgoshroot.get(), _messages[id].pubkey.get()); delete _messages[id]; return; }
        if (_messages[id].index == 4) { _turnOff(_messages[id].walletgoshroot.get()); delete _messages[id]; return; }
        if (_messages[id].index == 5) { _deployDao(_messages[id].walletgoshroot.get(), _messages[id].name.get(), _messages[id].previous, _messages[id].pubmembers.get()); delete _messages[id]; return; }
        if (_messages[id].index == 6) { _destroyDao(_messages[id].name.get()); delete _messages[id]; return; }
        if (_messages[id].index == 7) { _needcustodians = _messages[id].newneed.get(); delete _messages; return; }      
        if (_messages[id].index == 8) { _expTime = _messages[id].time.get(); delete _messages[id]; return; }         
    }
    
    function clearExpired(uint64 index) public senderIs(address(this))  accept saveMsg {  
        MessageProfile obj;   
        if ((index == 0) && (_messages.exists(index) == true)) {
            if (_messages[index].expiredAt < now) { delete _messages[index]; }  
        }
        optional(uint64, MessageProfile) res = _messages.next(index);
        if (res.hasValue()) {
            (index, obj) = res.get();
            if (obj.expiredAt < now) { delete _messages[index]; }    
            this.clearExpired{value: 0.1 ton, flag: 1}(index);
        }
    }
    
        function setNewExpiredTime(
        uint128 time
    ) public onlyOwnerPubkeyList  accept saveMsg {
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _expTime = time;
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfile(8, now + _expTime, mask, 1, null, null, null, null, null, time, null);
    }

    
    function setNewNeedCustodians(
        uint8 need
    ) public onlyOwnerPubkeyList  accept saveMsg {
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
        _messages[_generateId()] = MessageProfile(7, now + _expTime, mask, 1, null, null, null, null, need, null, null);
    }

    function addPubkey(
        uint256 pubkey
    ) public onlyOwnerPubkeyList  accept saveMsg {
        require(_custodians < MAX_CUSTODIANS, ERR_BAD_NUMBER_CUSTODIANS);
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _addPubkey(pubkey);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfile(1, now + _expTime, mask, 1, pubkey, null, null, null, null, null, null);
    }

    function deletePubkey(
        uint256 pubkey
    ) public onlyOwnerPubkeyList  accept saveMsg {
        require(_custodians > _needcustodians, ERR_BAD_NUMBER_CUSTODIANS);
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _deletePubkey(pubkey);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfile(2, now + _expTime, mask, 1, pubkey, null, null, null, null, null, null);
    }
    
    function _addPubkey(
        uint256 pubkey
    ) private  accept  {
        require(_custodians < MAX_CUSTODIANS, ERR_BAD_NUMBER_CUSTODIANS);      
        _owners[pubkey] = _custodians;
        _index[_custodians] = pubkey;
        _custodians += 1;
        delete _messages;
        getMoney();
    }

    function _deletePubkey(
        uint256 pubkey
    ) private  accept  {
        require(_custodians > 1, ERR_BAD_NUMBER_CUSTODIANS);
        _custodians -= 1;
        uint8 ind = _owners[pubkey];
        if (ind != _custodians) { uint256 pub = _index[_custodians]; _owners[pub] = ind; _index[ind] = pub; }
        delete _owners[pubkey];
        delete _index[_custodians];
        delete _messages;
        getMoney();
    }

    function turnOn(address wallet, uint256 pubkey) public onlyOwnerPubkeyList accept saveMsg {
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _turnOn(wallet, pubkey);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfile(3, now + _expTime, mask, 1, pubkey, wallet, null, null, null, null, null);
    }
    
    function _turnOn(address wallet, uint256 pubkey) private accept {
        GoshWallet(wallet).turnOnPubkey{value: 0.1 ton, flag : 1}(pubkey);
        getMoney();
    }

    function _turnOff(address wallet) private accept {
        GoshWallet(wallet).turnOffPubkey{value: 0.1 ton, flag : 1}();
        getMoney();
    }
    
    function turnOff(address wallet) public onlyOwnerPubkeyList accept saveMsg {
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _turnOff(wallet);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfile(4, now + _expTime, mask, 1, null, wallet, null, null, null, null, null);
    }

    function deployDao(address goshroot, string name, optional(address) previous, address[] pubmem) public onlyOwnerPubkeyList  accept saveMsg {
        getMoney();
        if (previous.hasValue()) { require(pubmem.length == 0, ERR_WRONG_NUMBER_MEMBER); } 
        else { require(pubmem.length > 0, ERR_WRONG_NUMBER_MEMBER); }
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _deployDao(goshroot, name, previous, pubmem);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfile(5, now + _expTime, mask, 1, null, goshroot, name, previous, null, null, pubmem);
    }

    function destroyDao(string name) public onlyOwnerPubkeyList  accept saveMsg {
        getMoney();
        this.clearExpired{value: 0.1 ton, flag: 1}(0);
        if (_needcustodians == 1) { 
            _destroyDao(name);
            return; 
        }
        uint32 mask;
        mask = _incMaskValue(mask, _owners[msg.pubkey()]);
        _messages[_generateId()] = MessageProfile(6, now + _expTime, mask, 1, null, null, name, null, null, null, null);
    }
    
    function _deployDao(address goshroot, string name, optional(address) previous, address[] pubmem) private view  accept  {
        TvmCell s0 = tvm.buildStateInit({
            code: m_codeProfileDao,
            contr: ProfileDao,
            varInit: {_name : name}
        });
        address daoprofile = new ProfileDao {stateInit: s0, value: FEE_DEPLOY_DAO_PROFILE, wid: 0, flag: 1}();
        ProfileDao(daoprofile).deployDao{value: 0.1 ton, flag : 1}(goshroot, previous, pubmem);
    }

    function _destroyDao(string name) private view accept  {
        TvmCell s0 = tvm.buildStateInit({
            code: m_codeProfileDao,
            contr: ProfileDao,
            varInit: {_name : name}
        });
        address daoprofile = address.makeAddrStd(0, tvm.hash(s0));
        ProfileDao(daoprofile).destroy{value: 0.1 ton, flag : 1}();
    }

    function sendMoneyProfileDao(string name, uint128 value) public view {
        tvm.accept();
        TvmCell s0 = tvm.buildStateInit({
            code: m_codeProfileDao,
            contr: ProfileDao,
            varInit: {_name : name}
        });
        address daoprofile = new ProfileDao {stateInit: s0, value: FEE_DEPLOY_DAO_PROFILE, wid: 0, flag: 1}();
        require(daoprofile == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        daoprofile.transfer(value);
    }

    //Money part
    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 1000 ton) { return; }
        _flag = true;
        GoshRoot(_goshroot).sendMoneyProfile{value : 0.2 ton}(_name, 1000 ton);
    }

    //Fallback/Receive
    receive() external {
        if (msg.sender == _goshroot) {
            _flag = false;
        }
    }

    //Selfdestruct
    function destroy() public onlyOwnerPubkeyList {
        selfdestruct(_goshroot);
    }

    //Setters
    function setNewGoshRoot(address goshroot) public onlyOwnerPubkeyList {
        tvm.accept();
        _goshroot = goshroot;
    }

    //Getters
    function getMessages() external view returns(mapping(uint64 => MessageProfile)){
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
    
    function getCurrentGoshRoot() external view returns(address) {
        return _goshroot;
    }

    function isPubkeyCorrect(uint256 pubkey) external view returns(bool) {
        return _owners.exists(pubkey);
    }

    function getProfileDaoAddr(string name) external view returns(address){
        TvmCell s0 = tvm.buildStateInit({
            code: m_codeProfileDao,
            contr: ProfileDao,
            varInit: {_name : name}
        });
        return address(tvm.hash(s0));
    }
}
