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
import "./profile.sol";
import "./libraries/GameLib.sol";

contract Forest is Constants {
    string constant version = "0.0.1";

    address static _fabric;
    Position static _position;
    mapping(uint8 => TvmCell) _code;
    mapping(uint256 => Position) _trees;
    optional(string) _union;

    constructor(
        TvmCell fieldCode,
        TvmCell profileCode,
        TvmCell awardCode
    ) accept onlyOwner {
        _code[m_FieldCode] = fieldCode;
        _code[m_ProfileCode] = profileCode;
        _code[m_AwardCode] = awardCode;
        TvmBuilder b;
        b.store(_position);
        uint256 hash = tvm.hash(b.toCell());
        _trees[hash] = _position;
    }

    //Fallback/Receive
    receive() external {
//        if (msg.sender == _systemcontract) {
//            _flag = false;
//        }
    }

    //Getters
    function getDetails() external view returns(mapping(uint256 => Position) trees) {
        return (_trees);
    }
}
