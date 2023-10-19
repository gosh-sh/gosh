// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./smv/modifiers/modifiers.sol";
import "goshwallet.sol";
import "./libraries/GoshLib.sol";

contract RepoTagGosh is Modifiers {
    string constant version = "6.2.0";
    
    address _systemcontract;
    address static _goshdao;
    address static _repo;
    address static public _task;
    mapping(uint8 => TvmCell) _code;
    string _tag;
    
    constructor(
        address pubaddr,
        address goshaddr,
        string tag,
        TvmCell WalletCode,
        uint128 index) onlyOwner {
        tvm.accept();
        _code[m_WalletCode] = WalletCode;
        _systemcontract = goshaddr;
        _tag = tag;
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
    }
    
    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public {
        if (msg.sender != _goshdao) { require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED); }
        selfdestruct(_systemcontract);
    }
    
    //Getters    
    function getVersion() external pure returns(string, string) {
        return ("RepoTagGosh", version);
    }
    
    function getOwner() external view returns(string, address, address) {
        return (_tag, _goshdao, _repo);
    }
}
