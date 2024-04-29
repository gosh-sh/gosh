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
import "./AchiNakiValidatorNodeWallet.sol";

contract ValidatorEpoche is Modifiers {
    string constant version = "1.0.0";
    mapping(uint8 => TvmCell) _code;

    uint256 static _pubkey;
    address _root; 
    uint64 static _SeqNoStart;
    uint64 _SeqNoFinish;
    uint64 _waitStep;
    address static _owner;
    uint8 _type;
    bytes[48] _bls_pubkey;

    constructor (
        uint64 SeqNoFinish,
        uint64 waitStep,
        address owner,
        uint8 vtype,
        bytes[48] bls_pubkey,
        TvmCell AchiNakiValidatorNodeWalletCode
    ) internalMsg {
        TvmCell data = tvm.codeSalt(tvm.code()).get();
        (uint256 hash, address root) = abi.decode(data, (uint256, address));
        hash;
        _root = root;
        require(msg.sender == _root, ERR_SENDER_NO_ALLOWED);
        _SeqNoFinish = SeqNoFinish;
        _owner = owner;
        _waitStep = waitStep;
        _type = vtype;
        _bls_pubkey = bls_pubkey;
        _code[m_AchiNakiValidatorNodeWalletCode]  = AchiNakiValidatorNodeWalletCode;
        ValidatorContractRoot(_root).increaseActiveValidatorNumber{value: 0.1 ton, flag: 1}(_pubkey, _SeqNoStart);
    }

    function getBLSPrivateKey(bytes[48] key) public view internalMsg minValue(0.2 ton) senderIs(ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] , _root, _pubkey)) accept {
        key;
        //SEND TO SLASHING SYSTEM
    }

    function slash() public  accept {
        AchiNakiValidatorNodeWallet(_owner).slash{value: 0.1 ton, flag: 1}(_pubkey, _SeqNoStart, _SeqNoFinish);
        destroy(true);
        selfdestruct(_root);   
    }

    function touch() public saveMsg {
        if (_SeqNoFinish + _waitStep < block.seqno) { tvm.accept(); }
        else { return; }
        destroy(false);
    }
    function destroy(bool isSlash) private accept {
        ValidatorContractRoot(_root).decreaseActiveValidatorNumber{value: 0.3 ton, flag: 1}(_pubkey, _SeqNoStart, _SeqNoFinish, isSlash);   
        selfdestruct(_root);   
    } 
    
    //Fallback/Receive
    receive() external {
    }

    //Getters
    function getDetails() external view returns(
        uint256 pubkey,
        address root, 
        uint64 SeqNoStart,
        uint64 SeqNoFinish,
        address owner,
        uint8 vtype) 
    {
        return (_pubkey, _root, _SeqNoStart, _SeqNoFinish, _owner, _type);
    }
}
