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
import "./libraries/GoshLib.sol";
import "goshwallet.sol";

/* Root contract of tag */
contract Tag is Modifiers{
    string version = "0.4.1";
    
    string static _nametag;
    string _nameCommit;
    string _content;
    address _commit;
    uint256 _pubkey;
    address _rootGosh;
    address _goshdao;
    TvmCell m_WalletCode;
    
    constructor(
        uint256 pubkey, 
        uint256 pubkeysender,
        string nameCommit, 
        address commit, 
        string content,
        address goshaddr,
        address goshdao,
        TvmCell WalletCode,
        uint128 index) public onlyOwner {
        require(_nametag != "", ERR_NO_DATA);
        tvm.accept();
        m_WalletCode = WalletCode;
        require(checkAccess(pubkeysender, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _rootGosh = goshaddr;
        _goshdao = goshdao;
        _nameCommit = nameCommit;
        _commit = commit;
        _content = content;
        _pubkey = pubkey;
    }
    
    function checkAccess(uint256 pubkey, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubkey, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
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
    
    //Selfdestruct
    function destroy(uint256 pubkey, uint128 index) public {
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(msg.sender);
    }
    
    //Getters
    function getCommit() external view returns(address) {
        return _commit;
    }
    
    function getContent() external view returns(string) {
        return _content;
    }

    function getVersion() external view returns(string) {
        return version;
    }
}
