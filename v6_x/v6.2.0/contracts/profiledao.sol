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
import "systemcontract.sol";
import "goshdao.sol";
import "profile.sol";

contract ProfileDao is Modifiers {
    string constant version = "1.0.0";
    address static _versioncontroller;
    string static _name;
    address _pubaddr;
    bool _flag = false;
    mapping(uint256 => bool) _owners;
    
    uint128 timeMoney = 0;

    constructor() {
        _pubaddr = msg.sender;
        getMoney();
    }
    
    function deployDao(address systemcontract, optional(address) previous, address[] pubmem) public view onlyOwnerAddress(_pubaddr)  accept {
        SystemContract(systemcontract).deployDao{value: 0.1 ton, flag : 1}(_name, _pubaddr, previous, pubmem);
    }
    
    function upgradeDao(address systemcontract, optional(address) previous, address[] pubmem) public view senderIs(_versioncontroller)  accept {
        SystemContract(systemcontract).deployDao{value: 0.1 ton, flag : 1}(_name, _pubaddr, previous, pubmem);
    }
    
    function deployedDao(string name, string ver) public pure {
        name; ver;
    }
    
    function updateCode(TvmCell newcode, TvmCell cell) public onlyOwner accept saveMsg {
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
        onCodeUpgrade(cell);
    }

    function onCodeUpgrade(TvmCell cell) private pure {
    }

    //Money part
    function getMoney() private {
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
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
        selfdestruct(giver);
    }
    
    //Getters
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
