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

import "./modifiers/modifiers.sol";
import "./libraries/ValidatorLib.sol";
import "./ValidatorContractRoot.sol";
import "./ValidatorEpocheContract.sol";

contract AchiNakiValidatorNodeWallet is Modifiers {
    string constant version = "1.0.0";
    mapping(uint8 => TvmCell) _code;

    uint256 static _pubkey;
    address static _root; 
    uint256 _lock = 0;

    mapping(uint256 => uint256) _lockData;

    constructor (
        address root,
        TvmCell ValidatorEpocheCode
    ) internalMsg {
        _root = root;
        _code[m_ValidatorEpocheCode] = ValidatorEpocheCode;
    }

    function getMoney() private view {
        if (address(this).balance > 20 ton) { return; }
        ValidatorContractRoot(_root).askMoney{value : 0.2 ton, flag: 1}(_pubkey, 20 ton);
    }

    function slash(uint256 pubkey, uint64 seqNoStart, uint64 seqNoFinish) public senderIs(ValidatorLib.calculateValidatorEpocheAddress(_code[m_ValidatorEpocheCode], _root, pubkey, seqNoStart)) accept {
        if (_pubkey != pubkey) { return; }
        TvmBuilder b;
        b.store(seqNoStart);
        b.store(seqNoFinish);
        uint256 hash = tvm.hash(b.toCell());
        _lock -= _lockData[hash];
        address  burn = address.makeAddrStd(0, 0);
        mapping(uint32 => varUint32) data;
        data[CURRENCIES_ID] = varUint32(_lockData[hash]);
        delete _lockData[hash];
        burn.transfer({value: 0.1 ton, currencies: data, flag: 1});
    } 

    function setLockStake(uint64 SeqNoStart, uint64 SeqNoFinish, uint256 stake) public internalMsg senderIs(_root) accept {
        _lock += stake;
        TvmBuilder b;
        b.store(SeqNoStart);
        b.store(SeqNoFinish);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        _lockData[hash] = stake;
        _lock += stake;
    } 

    function sendBLSPrivateKey(bytes[48] key, uint64 seqNoStart) public view onlyOwnerPubkey(_pubkey) accept {
        ValidatorEpoche(ValidatorLib.calculateValidatorEpocheAddress(_code[m_ValidatorEpocheCode], _root, _pubkey, seqNoStart)).getBLSPrivateKey{value: 0.3 ton, flag: 1}(key);
    }

    function sendValidatorRequestWithStake(bytes[48] bls_pubkey, varUint32 stake) public view internalMsg senderIs(_root) accept {
        mapping(uint32 => varUint32) data_cur;
        data_cur[CURRENCIES_ID] = stake;
        ValidatorContractRoot(_root).receiveValidatorRequestWithStakeFromWallet{value: 0.1 ton, currencies: data_cur, flag: 1}(_pubkey, bls_pubkey);
    } 

    function unlockStake(uint64 SeqNoStart, uint64 SeqNoFinish) public internalMsg senderIs(_root) accept {
        TvmBuilder b;
        b.store(SeqNoStart);
        b.store(SeqNoFinish);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        _lock -= _lockData[hash];
        delete _lockData[hash];
    } 

    function withdrawToken(address to, varUint32 value) public view onlyOwnerPubkey(_pubkey) accept {
        require(value <= address(this).currencies[CURRENCIES_ID] - _lock, ERR_LOW_VALUE);
        mapping(uint32 => varUint32) data;
        data[CURRENCIES_ID] = value;
        to.transfer({value: 0.1 ton, currencies: data, flag: 1});
    }
    
    //Fallback/Receive
    receive() external {
    }

    //Getters
    function getDetails() external view returns(
        uint256 pubkey,
        address root,
        uint256 balance,
        uint256 lock
    ) {
        return (_pubkey, _root, address(this).currencies[CURRENCIES_ID], _lock);
    }
}
