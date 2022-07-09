// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ton-solidity >=0.61.2;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
import "./modifiers/modifiers.sol";
import "Upgradable.sol";

contract GoshConfig is Modifiers, Upgradable {
    string constant version = "0.5.0";

    GlobalConfig _config;

    constructor(address goshAddr) public onlyOwner accept {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        _config.goshAddr = goshAddr;
    }
    
    // Setters
    function setGoshAddress(address goshAddr) public onlyOwner accept {
        _config.goshAddr = goshAddr;
    }

    // Getters
    function get() public view responsible returns (GlobalConfig config) {
        config = _config;
    }

    // Upgradable
    function onCodeUpgrade() internal override {
        tvm.resetStorage();
    }
}
