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

import "./smv/modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "./versioncontroller.sol";
import "./ccwallet.sol";

contract CCWallet is Modifiers {
    string constant version = "1.0.0";

    address static _versioncontroller;
    bool static _wallettype;
    uint256 _balance = 0;
    uint32 timeMoney = 0;
    uint256 _decimals = 1e9;

    bool _flag = false;
    mapping(uint8 => TvmCell) _code;

    constructor( 
        TvmCell code
    ) accept {
        _code[m_CCWalletCode] = code;
        getMoney();
    }

    function getGOSHToken(uint128 token) public senderIs(_versioncontroller) accept {
        if (_wallettype == false) { _balance += uint256(token) * _decimals; }
    }

    function transferCurrency(uint256 token, address to) public onlyOwner accept {
        require(address(this).currencies[CURRENCIES_ID] >= token, ERR_LOW_TOKEN);
        if (_wallettype == true) { require(_balance >= token, ERR_LOW_TOKEN); _balance -= token; }
        ExtraCurrencyCollection data;
        data[CURRENCIES_ID] = token;
        CCWallet(to).changeBalance{value: 0.3 ton, currencies: data, flag: 1}(tvm.pubkey(), token);
    }

    function changeBalance(uint256 pubkey, uint256 token) public senderIs(GoshLib.calculateCCWalletAddress(_code[m_CCWalletCode], _versioncontroller, pubkey)) accept {
        if (_wallettype == false) { _balance += token; }
    }

    //Money part
    function getMoney() private {
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
        if (_flag == true) { return; }
        if (address(this).balance > 100 ton) { return; }
        _flag = true;
        VersionController(_versioncontroller).sendMoneyCCWallet{value : 0.2 ton}(tvm.pubkey(), 100 ton);
    }

    //Fallback/Receive
    receive() external {
        if (msg.sender == _versioncontroller) {
            _flag = false;
        }
    }

    //Getters
    function getDetails() external view returns(uint256, uint256, uint256) {
        return (tvm.pubkey(), address(this).currencies[CURRENCIES_ID], _balance);
    }
}
