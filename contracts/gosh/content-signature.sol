// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ton-solidity >= 0.61.2;
pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "./modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "goshwallet.sol";
// import "action.sol";

contract ContentSignature is Modifiers {
    string constant version = "0.5.3";
    uint256 _pubkey;
    address _rootGosh;
    address _goshdao;
    TvmCell m_WalletCode;
    string _content;
    string static _label;
    string static _commit;
//    address _action;
     
    constructor(uint256 value0, uint256 value, address goshroot, address dao, TvmCell WalletCode, string content, uint128 index) public {
        tvm.accept();
        _content = content;
        m_WalletCode = WalletCode;
        _goshdao = dao;
        _rootGosh = goshroot;
        _pubkey = value0;
//        _action = action;
        require(checkAccess(value, msg.sender, index), ERR_SENDER_NO_ALLOWED);
//        if (_label != "") { Action(_action).activate{value : 0.1 ton}(_commit, _content); }
    }
    
    function _composeWalletStateInit(uint256 pubkey, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(m_WalletCode, pubkey, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            pubkey: pubkey,
            contr: GoshWallet,
            varInit: {_rootRepoPubkey: _pubkey, _rootgosh : _rootGosh, _goshdao: _goshdao, _index: index}
        });
        return _contractflex;
    }
    
    function checkAccess(uint256 pubkey, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubkey, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function getContent() external view returns(string) {
        return _content;
    }
    
/*
    function getAction() external view returns(address) {
        return _action;
    }
*/
}
