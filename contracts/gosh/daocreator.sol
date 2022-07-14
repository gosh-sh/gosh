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
import "gosh.sol";
import "goshwallet.sol";
import "goshdao.sol";
import "Upgradable.sol";
import "./libraries/GoshLib.sol";

/* Root contract of DaoCreator */
contract DaoCreator is Modifiers, Upgradable{
    string constant version = "0.5.1";
    
    address _gosh;
    TvmCell m_WalletCode;
    TvmCell m_codeDao;

    constructor(
        address goshaddr, 
        TvmCell WalletCode,
        TvmCell codeDao) public onlyOwner {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        tvm.accept();
        _gosh = goshaddr;
        m_WalletCode = WalletCode;
        m_codeDao = codeDao;
    }

    function deployDao(
        string name, 
        uint256 root_pubkey) public view accept {
        require(checkName(name), ERR_WRONG_NAME);
        Gosh(_gosh).deployDao{
            value: FEE_DEPLOY_DAO, bounce: true
        }(name, root_pubkey);
    }

    function sendMoney(uint256 pubkeyroot, uint256 pubkey, address goshdao, uint128 value, uint128 index) public view {
        TvmCell s1 = _composeWalletStateInit(pubkeyroot, pubkey, goshdao, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(value);
    }
    
    function sendMoneyDao(string name, uint128 value) public view {
        TvmCell s1 = _composeDaoStateInit(name);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(value);
    }
    
    function _composeDaoStateInit(string name) internal view returns(TvmCell) {
        TvmBuilder b;
        b.store(_gosh);
        b.store(name);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        TvmCell deployCode = tvm.setCodeSalt(m_codeDao, b.toCell());
        return tvm.buildStateInit({ 
            code: deployCode,
            contr: GoshDao,
            varInit: {}
        });
    }
    
    function _composeWalletStateInit(uint256 pubkeyroot, uint256 pubkey, address goshdao, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(m_WalletCode, pubkey, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            pubkey: pubkey,
            contr: GoshWallet,
            varInit: {_rootRepoPubkey: pubkeyroot, _rootgosh : _gosh, _goshdao: goshdao, _index: index}
        });
        return _contractflex;
    }
    
    // Upgradable
    function onCodeUpgrade() internal override {
        tvm.resetStorage();
    }

    //Getters

    function getAddrRootGosh() external view returns(address) {
        return _gosh;
    }

    function getVersion() external pure returns(string) {
        return version;
    }
}
