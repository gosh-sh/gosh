// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./libraries/GameLib.sol";
import "./profile.sol";
import "./constants.sol";

/* System contract of Gosh version*/
contract Award is Constants {
    string constant version = "0.0.1";
    address static _fabric;
    uint128 static _index;

    mapping(uint8 => TvmCell) _code;

    constructor(
        TvmCell fieldCode,
        TvmCell profileCode
    ) accept onlyOwner {
        _code[m_FieldCode] = fieldCode;
        _code[m_ProfileCode] = profileCode;
    }

    function grant(uint256 pubkey, Position position) public view senderIs(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, position, version)) accept {
        pubkey;
        return; 
    }

    function updateCode(TvmCell newcode, TvmCell cell) public senderIs(_fabric) accept saveMsg {
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
        onCodeUpgrade(cell);
    }

    function onCodeUpgrade(TvmCell cell) private pure {
    }
}
