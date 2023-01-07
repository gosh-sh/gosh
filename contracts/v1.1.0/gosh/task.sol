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

/* Root contract of task */
contract Task is Modifiers{
    string constant version = "1.1.0";
    
    string static _nametask;
    address _pubaddr;
    address _repo;
    optional(address) _commit;
    bool _ready = false;
    address _systemcontract;
    address _goshdao;
    mapping(uint8 => TvmCell) _code;
    address[] _candidates;
    
    ConfigGrant _grant;
    
    constructor(
        address pubaddr, 
        address repo,    
        address goshaddr,
        address goshdao,
        TvmCell WalletCode,
        ConfigGrant grant,
        uint128 index) public onlyOwner {
        require(_nametask != "", ERR_NO_DATA);
        tvm.accept();
        _code[m_WalletCode] = WalletCode;
        _systemcontract = goshaddr;
        _goshdao = goshdao;
        _repo = repo;
        _pubaddr = pubaddr;
        _grant = grant;
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
    }
    
    function setConfig(ConfigGrant grant, uint128 index) public {
        require(_ready == false, ERR_TASK_COMPLETED);
        checkAccess(_pubaddr, msg.sender, index);
        _grant = grant;
    } 
    
    function isReady(address commit) public senderIs(_repo) {
        require(_ready == false, ERR_TASK_COMPLETED);
        _candidates.push(commit);
    } 
    
    function confirm(uint128 index1, uint128 index2) public {
       require(_ready == false, ERR_TASK_COMPLETED);
       require(index1 < _candidates.length, ERR_TASK_COMPLETED);
       checkAccess(_pubaddr, msg.sender, index2);
        _ready = true;
        _commit = _candidates[index1];
    }
    
    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
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
    function destroy(address pubaddr, uint128 index) public {
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(giver);
    }
    
    //Getters    
    function getStatus() external view returns(string, address, address, address[], bool, ConfigGrant) {
        return (_nametask, _pubaddr, _repo, _candidates, _ready, _grant);
    }
    function getVersion() external pure returns(string, string) {
        return ("task", version);
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
