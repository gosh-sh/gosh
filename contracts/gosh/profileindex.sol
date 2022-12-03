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
import "profile.sol";

/* Index contract of Profile */
contract ProfileIndex is Modifiers {
    string constant version = "1.0.0";
    
    mapping(uint8 => TvmCell) _code;
    uint256 _pubkey;
    string static _name;
    address _versioncontroller;
    address _profile;

    constructor(address profile,
        TvmCell codeProfile    
    ) public senderIs(profile) {
        require(msg.sender == _getProfileAddr(_name), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        TvmCell myCode = tvm.code();
        TvmSlice s = tvm.codeSalt(myCode).get().toSlice();
        _profile = profile;
        _code[m_ProfileCode] = codeProfile;
        string ver;
        (_pubkey, _versioncontroller, ver) = s.decode(uint256, address, string);
        require(ver == version, ERR_CONTRACT_BAD_VERSION);
    }
    
    //Selfdestruct
    function destroy() public senderIs(_profile) {
        selfdestruct(giver);
    }
    
    //Getters
    function _getProfileAddr(string name) private view returns(address) {
        TvmCell s1 = tvm.buildStateInit({
            code: _code[m_ProfileCode],
            contr: Profile,
            varInit: {_name : name, _versioncontroller: address(this)}
        });
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function getVersion() external view returns(address, string) {
        return (_versioncontroller, version);
    }
    
    function getData() external view returns(uint256, string, address) {
        return (_pubkey, _name, _profile);
    }
}
