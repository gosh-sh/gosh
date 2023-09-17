// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import "./smv/modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "goshwallet.sol";
// import "action.sol";

contract ContentSignature is Modifiers {
    string constant version = "7.0.0";
    address _pubaddr;
    address static _systemcontract;
    address static _goshdao;
    mapping(uint8 => TvmCell) _code;
    string _content;
    string static _label;
    string static _commit;
//    address _action;
     
    constructor(address pubaddr, TvmCell WalletCode, string content, uint128 index) {
        tvm.accept();
        _content = content;
        _code[m_WalletCode] = WalletCode;
        _pubaddr = pubaddr;
//        _action = action;
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
//        if (_label != "") { Action(_action).activate{value : 0.1 ton, flag: 1}(_commit, _content); }
    }
    
    function getContent() external view returns(string) {
        return _content;
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
/*
    function getAction() external view returns(address) {
        return _action;
    }
*/
}
