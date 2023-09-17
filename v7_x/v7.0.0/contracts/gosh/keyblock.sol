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
    string constant version = "7.0.0";

    uint128 static _seqNo;
    address static _goshdao;
    address static _repo;

    address _systemcontract;    
    bool _isZero = false;
    bool _isReady = false;
    bool _isMaster = false;
    uint128 _final = 0;
    bytes static _data;
    bytes[] _signatures;
    bytes[] _newsignatures;
    uint256[] _newpubkeys;
    uint256 _prevblockhash;
    optional(string) _previousversion;
    mapping(uint8 => TvmCell) _code;

    bool _statuscheck = false;
    bool _lastsession = false;
    bool _newblock = false;
    uint256[] _hashblocks;

    constructor(
        address pubaddr,
        uint128 index,
        address systemcontract,
        TvmCell wallet_code,
        TvmCell keyblock_code,
        bool isZero,
        bytes data,
        bytes[] signatures,
        bytes[] newsignatures,
        uint256[] newpubkeys,
        uint256 prevblockhash,
        optional(string) previousversion,
        bool isMaster
    ) accept {
        _code[m_WalletCode] = wallet_code;
        _code[m_KeyBlockCode] = keyblock_code;
        _systemcontract = systemcontract;
        _signatures = signatures;
        _newpubkeys = newpubkeys;
        _newsignatures = newsignatures;
        _previousversion = previousversion;
        _isMaster = isMaster;
        _prevblockhash = prevblockhash;
        _data = data;
        if (msg.sender != GoshLib.calculateKeyBlockAddress(_code[m_KeyBlockCode], data, _systemcontract, _goshdao, _repo, _seqNo)) {
            require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        }
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
        SystemContract(_systemcontract).checkKeyBlock2{value: 0.1 ton, flag: 1}(goshdao, repo, _seqNo, _newpubkeys, tvm.hash(_data), previousversion, ver);
    } 

    function checkSignature(uint256 blockhash, uint256[] pubkeys) public senderIs(_systemcontract) accept {
        if (blockhash != _prevblockhash) { selfdestruct(_systemcontract); }
        if (_signatures.length * 100 / pubkeys.length <= 66) { selfdestruct(_systemcontract); }
        if (_newsignatures.length * 100 / _newpubkeys.length <= 66) { selfdestruct(_systemcontract); }
        mapping(uint128=>bool) pubcheck;
        this.checkSignatures{value: 0.1 ton, flag: 1}(_signatures, pubkeys, 0, 0, pubcheck);
        this.checkSignatures{value: 0.1 ton, flag: 1}(_newsignatures, _newpubkeys, 0, 0, pubcheck);
    } 

    function setNewBlock3() public senderIs(_systemcontract) accept {
        _newblock = true;
    } 

    function checkSignatures(bytes[] signatures, uint256[] pubkeys, uint128 index, uint128 count, mapping(uint128=>bool) pubcheck) public senderIs(address(this)) accept {
        if (signatures.length <= index) { 
            if (count * 100 / pubkeys.length <= 66) { selfdestruct(_systemcontract); return; }
            _final = _final + 1;
            if (_final < 2) { return; }
            _isReady = true; 
            SystemContract(_systemcontract).setNewBlock{value: 0.1 ton, flag: 1}(_goshdao, _repo, _seqNo, _previousversion.get()); 
            return;
        }
        this.checkSignaturePub{value: 0.1 ton, flag: 1}(signatures, pubkeys, index, 0, count, pubcheck);
    } 

    function checkSignaturePub(bytes[] signatures, uint256[] pubkeys, uint128 index, uint128 index1, uint128 count, mapping(uint128=>bool) pubcheck) public view senderIs(address(this)) accept {
        if (signatures.length <= index1) { 
            this.checkSignatures{value: 0.1 ton, flag: 1}(signatures, pubkeys, index + 1, count, pubcheck);
            return;
        }
        if (pubcheck.exists(index1)  == false) {
            bool signatureIsValid = tvm.checkSign(_data.toSlice(), signatures[index].toSlice(), pubkeys[index1]);
            if (signatureIsValid == true) {
                count = count + 1;
                pubcheck[index1] = true;
                this.checkSignatures{value: 0.1 ton, flag: 1}(signatures, pubkeys, index + 1, count, pubcheck);  
                return;  
            }
        }
        this.checkSignaturePub{value: 0.1 ton, flag: 1}(signatures, pubkeys, index, index1 + 1, count, pubcheck);
    } 

    function destroy(address pubaddr, uint128 index) public {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        selfdestruct(_systemcontract);
    }

    function getResult(bytes data, bool result, bool isMaster) public senderIs(address(this)) {
        if ((result == true) && (isMaster == true)) {
            TvmCell s1 = GoshLib.composeMasterBlockStateInit(_code[m_KeyBlockCode], data, _systemcontract, _goshdao, _repo, _seqNo);
            new KeyBlock{
                stateInit: s1, value: FEE_DEPLOY_KEYBLOCK, wid: 0, bounce: true, flag: 1
            }(address(this), 0, _systemcontract, _code[m_WalletCode], _code[m_KeyBlockCode], _isZero, _data, _signatures, _newsignatures, _newpubkeys, _prevblockhash, null, false);  
        }
        _statuscheck = false;
    }

    function continueCheck(bytes data, uint256 newhash, uint128 index, bool isMaster) public view senderIs(address(this)) accept {
        uint128 count = 0;
        for (uint128 i = 0; index + i < _hashblocks.length; i++) {
            newhash = tvm.hash(abi.encode(newhash, _hashblocks[index + i]));
            count = count + 1;
            if (count >= 5) { this.continueCheck{value: 0.1 ton}(data, newhash, index + i + 1, isMaster); }
        }
        if (newhash == tvm.hash(_data)) { 
            this.getResult{value: 0.1 ton}(data, true, isMaster);
        }
        else {
            this.getResult{value: 0.1 ton}(data, false, isMaster);
        }
    }

    function CheckMasterBlockIn(bytes data, bytes[] signatures, uint128 index1, uint128 index2, uint128 count, bool res) public view senderIs(address(this)) {
        if (_lastsession == false) { 
            this.continueCheck{value: 0.1 ton}(data, tvm.hash(data), 0, true);
            return; 
        }
        if (_newblock == true){ this.getResult{value: 0.1 ton}(data, false, true); }
        uint128 num = 0;
        for (uint128 i = 0; index1 + i < signatures.length; i++){
            if (index2 == 0) { res = false; }
            for (uint128 j = 0; index2 + j < _newpubkeys.length; j++){
                if (num >= 5) { this.CheckMasterBlockIn{value:0.1 ton}(data, signatures, index1 + i, index2 + j, count, res); return; }
                if (tvm.checkSign(data.toSlice(), signatures[index1 + i].toSlice(), _newpubkeys[index2 + j]) == true) { res = true; }
                num++;
            }    
            count += 1;
            if (res == false) { this.getResult{value: 0.1 ton}(data, false, true); return; }
        }
        uint128 num1 = count * 100 / uint128(_newpubkeys.length);
        if (num1 < 66) { this.getResult{value: 0.1 ton}(data, false, true); return; }
        else { this.getResult{value: 0.1 ton}(data, true, true); }
    }

    function emptyHashes(address pubaddr, uint128 index) public {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(_statuscheck == false, ERR_PROGRAM_EXIST);
        tvm.accept();
        uint256[] emH;
        _hashblocks = emH;
    }

    function pushHashes(address pubaddr, uint128 index, uint256[] hashes) public view {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(_statuscheck == false, ERR_PROGRAM_EXIST);
        tvm.accept();
        this.pushHashesIn(hashes, 0);
    }

    function pushHashesIn(uint256[] hashes, uint128 index) public senderIs(address(this)) accept {
        require(_statuscheck == false, ERR_PROGRAM_EXIST);
        for (uint128 i = 0; index + i <= hashes.length; i++) {
            _hashblocks.push(hashes[index + i]);
            if (i >= 5) { 
                this.pushHashesIn(hashes, index + i + 1); 
            }
        }
    }

    function getCheckMasterBlock(address pubaddr, uint128 index, bytes data, bytes[] signatures, bool lastsession) public {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(_statuscheck == false, ERR_PROGRAM_EXIST);
        tvm.accept();
        _statuscheck = true;
        _lastsession = lastsession;
        this.CheckMasterBlockIn{value:0.1 ton}(data, signatures, 0, 0, 0, false);
    }

    function getCheckObject(address pubaddr, uint128 index, bytes data) public {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(_statuscheck == false, ERR_PROGRAM_EXIST);
        tvm.accept();
        _statuscheck = true;
        this.continueCheck{value: 0.1 ton}(data, tvm.hash(data), 0, false);
    }

    //Getters
    function getKeyBlockIn() public view minValue(0.5 ton) {
        TvmCell data = abi.encode (_seqNo, _goshdao, _repo, _systemcontract, _isZero, _isReady, _data, _signatures, _newpubkeys, _previousversion);
        IObject(msg.sender).returnKeyBlock{value: 0.1 ton, flag: 1}(data);
    }

    function getHashes() external view returns(uint256[] hashes) {
        return (_hashblocks);
    }

    function getStatus() external view returns(uint128 seqNo, address goshdao, address repo, address systemcontract, bool isZero, bool isReady, bytes data, bytes[] signatures, uint256[] newpubkeys, optional(string) previousversion) {
        return (_seqNo, _goshdao, _repo, _systemcontract, _isZero, _isReady, _data, _signatures, _newpubkeys, _previousversion);
    }

    function getVersion() external pure returns(string, string) {
        return ("task", version);
    }
}
