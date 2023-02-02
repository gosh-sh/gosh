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
import "goshwallet.sol";
import "goshdao.sol";

/* Root contract of task */
contract Task is Modifiers{
    string constant version = "1.1.0";
    
    string static _nametask;
    address _pubaddr;
    address _repo;
    bool _ready = false;
    address _systemcontract;
    address _goshdao;
    mapping(uint8 => TvmCell) _code;
    ConfigCommit[] _candidates;   
    ConfigGrant _grant;
    uint128 _indexFinal;
    uint128 _step;
    uint128 _locktime = 0;
    uint128 _lock = 0;
    
    constructor(
        address repo,    
        address goshaddr,
        address goshdao,
        TvmCell WalletCode,
        ConfigGrant grant,
        uint128 locktime
        ) public senderIs(goshdao) {
        require(_nametask != "", ERR_NO_DATA);
        tvm.accept();
        _lock = now + locktime;
        _code[m_WalletCode] = WalletCode;
        _systemcontract = goshaddr;
        _goshdao = goshdao;
        _repo = repo;
        _grant = grant;
    }
    
    function setConfig(ConfigGrant grant, uint128 index) public {
        require(_ready == false, ERR_TASK_COMPLETED);
        checkAccess(_pubaddr, msg.sender, index);
        _grant = grant;
    } 
    
    function isReady(ConfigCommit commit) public senderIs(_repo) {
        require(_ready == false, ERR_TASK_COMPLETED);
        _candidates.push(commit);
    } 
    
    function confirmSmv(uint128 index1, uint128 index2) public {
       require(_ready == false, ERR_TASK_COMPLETED);
       require(index1 < _candidates.length, ERR_TASK_COMPLETED);
       checkAccess(_pubaddr, msg.sender, index2);
        _ready = true;
        _indexFinal = index1;
        _step = _grant.assign /  _candidates[_indexFinal].size;
        _locktime = now + _lock;
    }
    
    function getGrant(address pubaddr, uint128 typegrant, uint128 index) public {
        require(_ready == true, ERR_TASK_NOT_COMPLETED);
        require(now >= _locktime, ERR_NOT_READY);
        checkAccess(pubaddr, msg.sender, index);
        if (m_assign == typegrant) {
            require(_candidates[_indexFinal].pubaddrassign.exists(pubaddr), ERR_ASSIGN_NOT_EXIST);
            _grant.assign -= _step;
            TvmCell s1 = _composeWalletStateInit(pubaddr, 0);
            address addr = address.makeAddrStd(0, tvm.hash(s1));
            GoshWallet(addr).grantToken{value: 0.1 ton}(_nametask, _repo, _step);
            delete _candidates[_indexFinal].pubaddrassign[pubaddr];
            checkempty();
            return;
        }
        if (m_review == typegrant) {
            require(_candidates[_indexFinal].pubaddrreview == pubaddr, ERR_REVIEW_NOT_EXIST);
            TvmCell s1 = _composeWalletStateInit(pubaddr, 0);
            address addr = address.makeAddrStd(0, tvm.hash(s1));
            GoshWallet(addr).grantToken{value: 0.1 ton}(_nametask, _repo, _grant.review);
            _grant.review = 0;
            checkempty();
            return;
        }
        if (m_manager == typegrant) {
            require(_candidates[_indexFinal].pubaddrmanager == pubaddr, ERR_MANAGER_NOT_EXIST);
            TvmCell s1 = _composeWalletStateInit(pubaddr, 0);
            address addr = address.makeAddrStd(0, tvm.hash(s1));
            GoshWallet(addr).grantToken{value: 0.1 ton}(_nametask, _repo, _grant.manager);
            _grant.manager = 0;
            checkempty();
            return;
        }    
    }
    
    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function checkempty() private {
        if (_candidates[_indexFinal].pubaddrassign.empty() == false) { return; }
        if (_grant.review != 0) { return; }
        if (_grant.manager != 0) { return; }
        TvmCell s1 = _composeWalletStateInit(_pubaddr, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        GoshDao(_goshdao).returnTaskToken{value: 0.2 ton}(_nametask, _repo, _grant.assign + _grant.review + _grant.manager);
        selfdestruct(addr);
    }
    
    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_systemcontract : _systemcontract, _goshdao: _goshdao, _index: index}
        });
        return _contract;
    }
    
    //Selfdestruct
    
    function destroy(uint128 index) public {
        require(checkAccess(_pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        require(_ready == false, ERR_TASK_COMPLETED);
        GoshDao(_goshdao).returnTaskToken{value: 0.2 ton}(_nametask, _repo, _grant.assign + _grant.review + _grant.manager);
        selfdestruct(giver);
    }
    
    //Getters    
    function getStatus() external view returns(string, address, address, ConfigCommit[], ConfigGrant, bool, uint128) {
        return (_nametask, _pubaddr, _repo, _candidates, _grant, _ready, _indexFinal);
    }
    function getVersion() external pure returns(string, string) {
        return ("task", version);
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
