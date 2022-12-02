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

import "./modifiers/modifiers.sol";
import "systemcontract.sol";

/* Index contract of Profile */
contract ProfileIndex is Modifiers {
    string constant version = "1.0.0";
    
    uint256 _pubkey;
    string static _name;
    address _versioncontroller;
    address _profile;

    constructor(address profile) public  {
        tvm.accept();
        TvmCell myCode = tvm.code();
        TvmSlice s = tvm.codeSalt(myCode).get().toSlice();
        _profile = profile;
        (_pubkey, _versioncontroller) = s.decode(uint256, address);
        require(msg.sender == _versioncontroller, ERR_SENDER_NO_ALLOWED);
    }
    
    //Selfdestruct
    function destroy() public {
        selfdestruct(giver);
    }
    
    //Getters
    function getVersion() external pure returns(string) {
        return version;
    }
    
    function getData() external view returns(uint256, string, address) {
        return (_pubkey, _name, _profile);
    }
}
