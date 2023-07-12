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

import "./smv/modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "systemcontract.sol";

/* Root contract of task */
contract KeyBlock is Modifiers{
    string constant version = "6.0.0";

    uint128 static _seqNo;
    address static _goshdao;
    address static _repo;

    address _systemcontract;    
    bool _isZero = false;
    bool _isReady = false;
    TvmCell _data;
    TvmCell[] _signatures;
    uint256[] _newpubkeys;
    optional(string) _previousversion;
    mapping(uint8 => TvmCell) _code;

    constructor(
        address pubaddr,
        uint128 index,
        address systemcontract,
        TvmCell wallet_code,
        bool isZero,
        TvmCell data,
        TvmCell[] signatures,
        uint256[] newpubkeys,
        optional(string) previousversion
    ) accept {
        _code[m_WalletCode] = wallet_code;
        _systemcontract = systemcontract;
        _signatures = signatures;
        _newpubkeys = newpubkeys;
        _previousversion = previousversion;
        _data = data;
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        _isZero = isZero;
        if (_isZero == true) {
            require(_previousversion.hasValue() == false, ERR_SENDER_NO_ALLOWED);
            require(_signatures.length == 0, ERR_NOT_EMPTY_DATA);
            _isReady = true;
        }
        else {
            SystemContract(_systemcontract).checkKeyBlock{value: 0.1 ton, flag: 1}(_goshdao, _repo, _seqNo, _previousversion.get());
        }
    }

    function askSignature(address goshdao, address repo, uint128 seqno, string previousversion, string ver) public view minValue(0.3 ton) accept {
        seqno;
        SystemContract(_systemcontract).checkKeyBlock2{flag: 1}(goshdao, repo, _seqNo, _newpubkeys, previousversion, ver);
    } 

    function checkSignature(uint256[] pubkeys) public senderIs(_systemcontract) accept {
        if (_signatures.length * 100 / pubkeys.length <= 66) { selfdestruct(_systemcontract); }
        this.checkSignatures{value: 0.1 ton, flag: 1}(pubkeys, 0);
    } 

    function checkSignatures(uint256[] pubkeys, uint128 index) public senderIs(address(this)) accept {
        if (_signatures.length >= index) { _isReady = true; }
        this.checkSignaturePub{value: 0.1 ton, flag: 1}(pubkeys, index, 0);
    } 

    function checkSignaturePub(uint256[] pubkeys, uint128 index, uint128 index1) public senderIs(address(this)) accept {
        if (_signatures.length >= index) { 
            selfdestruct(_systemcontract);
        }
        bool signatureIsValid = tvm.checkSign(_data.toSlice(), _signatures[index].toSlice(), pubkeys[index1]);
        if (signatureIsValid == true) {
            this.checkSignatures{value: 0.1 ton, flag: 1}(pubkeys, index + 1);  
            return;  
        }
        this.checkSignaturePub{value: 0.1 ton, flag: 1}(pubkeys, index, index1 + 1);
    } 

    //Getters
    function getKeyBlockIn() public view minValue(0.5 ton) {
        TvmCell data = abi.encode (_seqNo, _goshdao, _repo, _systemcontract, _isZero, _isReady, _data, _signatures, _newpubkeys, _previousversion);
        IObject(msg.sender).returnKeyBlock{value: 0.1 ton, flag: 1}(data);
    }

    function getCheckMasterBlock(TvmCell[] signatures) external view returns(bool) {
        bool result = true;
        uint128 count = 0;
        for (uint i = 0; i < signatures.length; i++){
            bool res = false;
            for (uint j = 0; j < _newpubkeys.length; j++){
                if (tvm.checkSign(_data.toSlice(), signatures[i].toSlice(), _newpubkeys[j]) == true) { res = true; }
            }    
            count += 1;
            if (res == false) { result = false; }
        }
        uint128 num = count * 100 / uint128(_newpubkeys.length);
        if (num < 66) { result = false; }
        return result;
    }

    function getStatus() external view returns(uint128 seqNo, address goshdao, address repo, address systemcontract, bool isZero, bool isReady, TvmCell data, TvmCell[] signatures, uint256[] newpubkeys, optional(string) previousversion) {
        return (_seqNo, _goshdao, _repo, _systemcontract, _isZero, _isReady, _data, _signatures, _newpubkeys, _previousversion);
    }

    function getVersion() external pure returns(string, string) {
        return ("task", version);
    }
}
