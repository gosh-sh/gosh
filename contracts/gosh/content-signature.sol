// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity =0.64.0;
pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "./modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "goshwallet.sol";
// import "action.sol";

contract ContentSignature is Modifiers {
    string constant version = "0.11.0";
    address _pubaddr;
    address static _goshroot;
    address static _goshdao;
    TvmCell m_WalletCode;
    string _content;
    string static _label;
    string static _commit;
//    address _action;
     
    constructor(address pubaddr, TvmCell WalletCode, string content, uint128 index) public {
        tvm.accept();
        _content = content;
        m_WalletCode = WalletCode;
        _pubaddr = pubaddr;
//        _action = action;
        require(checkAccess(_pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
//        if (_label != "") { Action(_action).activate{value : 0.1 ton}(_commit, _content); }
    }
    
    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(m_WalletCode, pubaddr, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_goshroot : _goshroot, _goshdao: _goshdao, _index: index}
        });
        return _contractflex;
    }
    
    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function getContent() external view returns(string) {
        return _content;
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
/*
    function getAction() external view returns(address) {
        return _action;
    }
*/
}
