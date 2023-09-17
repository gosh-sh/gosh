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

import "systemcontract.sol";
import "./smv/modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "goshwallet.sol";

/* Root contract of tag */
contract Topic is Modifiers{
    string constant version = "7.0.0";
    string static public _name;
    string static public _content;
    address static public _object;
    address _author;
    uint32 _createdAt;
    optional(string) static public _metadata;
    bool public _resolved;
    address _systemcontract;
    address _goshdao;
    mapping(uint8 => TvmCell) _code;
    
    constructor(
        address pubaddr,
        uint128 index,
        address goshaddr,
        address goshdao,
        address object,
        TvmCell WalletCode) onlyOwner {
        tvm.accept();
        _code[m_WalletCode] = WalletCode;
        _systemcontract = goshaddr;
        _goshdao = goshdao;
        _object = object;
        _author = pubaddr;
        _createdAt = block.timestamp;
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
    }
    
    function acceptMessage(address pubaddr, uint128 index, optional(uint256) answer, string message) public view {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        answer; message;
    }

    function resolveTopic(address pubaddr, uint128 index, bool status) public {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        _resolved = status;
    }

    function destroyTopic(uint128 index) public {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _author, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        selfdestruct(_systemcontract);
    }
    
    //Getters
    function getObject() external view returns(string, string, address, address, address, optional(string), bool, address, uint32) {
        return (_name, _content, _object, _systemcontract, _goshdao, _metadata, _resolved, _author, _createdAt);
    }
    
    function getVersion() external view returns(string, string) {
        if (_metadata.hasValue()) { return ("comment", version); }
        return ("topic", version);
    }
}
