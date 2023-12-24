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

import "./constants.sol";
import "./award.sol";
import "./libraries/GameLib.sol";

contract Field is Constants {
    string constant version = "0.0.1";

    address static _fabric;
    Position static _position;
    optional(Building) _content;
    optional(address) _owner;
    mapping(uint8 => TvmCell) _code;
    mapping(uint256 => bool) _visiters;

    constructor(
        TvmCell fieldCode,
        TvmCell profileCode,
        TvmCell awardCode
    ) accept onlyOwner {
        _code[m_FieldCode] = fieldCode;
        _code[m_ProfileCode] = profileCode;
        _code[m_AwardCode] = awardCode;
    }

    function step(uint256 pubkey) public view minValue(0.5 ever) senderIs(GameLib.calculateProfileAddress(_code[m_ProfileCode], _fabric, pubkey, version)) {
        if ((_visiters.exists(pubkey) == false) && (_owner.hasValue() == false)) {
            rnd.shuffle();
            Award(GameLib.calculateAwardAddress(_code[m_AwardCode], _fabric, rnd.next(AWARD_NUM), version)).grant{value: 0.3 ton}(pubkey, _position);
        } 
    }

    //Fallback/Receive
    receive() external {
//        if (msg.sender == _systemcontract) {
//            _flag = false;
//        }
    }

    //Getters
      
    
    function getDetails() external view returns(Position position, optional(Building) content, optional(address) owner,  mapping(uint256 => bool) visiters) {
        return (_position, _content, _owner, _visiters);
    }
}
