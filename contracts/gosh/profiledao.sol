// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ton-solidity >=0.61.2;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import "./modifiers/modifiers.sol";
import "goshwallet.sol";
import "gosh.sol";
import "goshdao.sol";
import "profile.sol";

contract ProfileDao is Modifiers {
    string constant version = "1.0.0";
    string static _name;
    address _pubaddr;
    bool _flag = false;
    mapping(uint256 => bool) _owners;

    constructor() public {
        _pubaddr = msg.sender;
        Profile(_pubaddr).deployedProfileDao{value: 0.1 ton, flag: 1}(_name);
        getMoney();
    }
    
    function deployDao(address goshroot, optional(address) previous) public view onlyOwnerAddress(_pubaddr)  accept {
        GoshRoot(goshroot).deployDao{value: 0.1 ton, flag : 1}(_name, _pubaddr, previous);
    }

    //Money part
    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 1000 ton) { return; }
        _flag = true;
        Profile(_pubaddr).sendMoneyProfileDao{value : 0.2 ton}(_name, 100 ton);
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _pubaddr) {
            _flag = false;
        }
    }

    //Selfdestruct
    function destroy() public onlyOwnerAddress(_pubaddr) {
        selfdestruct(_pubaddr);
    }
    
    //Getters
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
