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
import "./libraries/GoshLib.sol";
import "goshdao.sol";

contract TagSupply is Modifiers {
    string constant version = "6.2.0";
    
    uint256 static _namehash;
    address static _goshdao;
    uint128 _supply;
    uint128 _multiples;

    constructor(
        uint128 multiples
    ) onlyOwner {
        tvm.accept();
        require(_goshdao == msg.sender, ERR_SENDER_NO_ALLOWED);
        _multiples = multiples;
    }

    function addMember(uint128 tokens) public senderIs(_goshdao) accept {
        _supply += tokens * _multiples;
    }
    
    function deleteMember(uint128 tokens) public senderIs(_goshdao) accept {
        _supply -= tokens * _multiples;
    }

    function changeMultiples(uint128 multiples) public senderIs(_goshdao) accept {
        _supply = _supply / _multiples * multiples;
        _multiples = multiples;
    }

    function changeMemberToken(uint128 token, bool increase) public senderIs(_goshdao) accept {
        if (increase) { _supply += token * _multiples; }
        else { _supply -= token * _multiples; }
    }

    function getSupply(address proposal, string[] tag, uint128 index, uint128 sum) public view senderIs(_goshdao) accept {
        sum += _supply / _multiples * (_multiples - 100);
        GoshDao(_goshdao).continueCalculateTagSupply{value: 0.15 ton, flag: 1}(proposal, tag, index, sum);
    }
    
    //Selfdestruct
    function destroy() public senderIs(_goshdao) accept {
        selfdestruct(_goshdao);
    }
    
    //Getters    
    function getDetails() external view returns(uint256 namehash, uint128 supply, uint128 multiples) {
        return (_namehash, _supply, _multiples);
    }

    function getVersion() external pure returns(string, string) {
        return ("grant", version);
    }
}
