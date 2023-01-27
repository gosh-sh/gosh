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
import "./libraries/GoshLib.sol";
import "goshwallet.sol";
import "daotokenwallet.sol";
import "goshdao.sol";

/* Root contract of tag */
contract DaoTokenWallet is Modifiers{
    string constant version = "1.1.0";

    address static _goshdao;
    address _rootpubaddr;
    address _pubaddr;
    string _nameDao;
    mapping(uint8 => TvmCell) _code;
    uint128 _balance = 0;
    bool _flag = false;
    optional(uint256) _access;
    uint128 timeMoney = 0;
    
   constructor(
        address rootpubaddr,
        address pubaddr,
        string nameDao,
        TvmCell WalletCode,
        TvmCell TokenWalletCode,
        optional(uint256) access
    ) public onlyOwner {
        tvm.accept();
        _nameDao = nameDao;
        _rootpubaddr = rootpubaddr;
        _code[m_WalletCode] = WalletCode;
        _code[m_DaoTokenWalletCode] = TokenWalletCode;
        _pubaddr = pubaddr;
        _access = access;
    }
    
    function getTokenWallet(uint128 grant) public  senderIs(_getWalletAddr(0)) accept {
        _balance += grant;
    }
    
    function sendTokenWallet(uint128 grant) public  onlyOwnerPubkeyOptional(_access) accept {
        require(address(this).balance > 10 ton, ERR_TOO_LOW_BALANCE);
        require(_balance >= grant, ERR_LOW_VALUE);
        GoshWallet(_getWalletAddr(0)).receiveTokenTW{value: 0.1 ton}(grant);
        _balance -= grant;
    }
    
    function getTokenTW(address pubaddr, uint128 grant) public  senderIs(_getTWAddr(pubaddr)) accept {
        _balance += grant;
    }
    
    function sendTokenTW(address pubaddr, uint128 grant) public  onlyOwnerPubkeyOptional(_access) accept {
        require(address(this).balance > 10 ton, ERR_TOO_LOW_BALANCE);
        require(_balance >= grant, ERR_LOW_VALUE);
        DaoTokenWallet(_getTWAddr(pubaddr)).getTokenTW{value: 0.1 ton}(_pubaddr, grant);
        _balance -= grant;
    }
    
/*    function upgradeToken() public senderIs(_goshdao) accept {
    
    }*/
    //TODO
    
    function getMoney() private {
        if (now - timeMoney > 3600) { _flag = false; timeMoney = now; }
        if (_flag == true) { return; }
        if (address(this).balance > 100 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneyTW{value : 0.2 ton}(_pubaddr, 200 ton);
    }
    
    function _getTWAddr(address pubaddr) internal view returns(address) {
        TvmCell s1 = _composeTokenWalletStateInit(pubaddr);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function _composeTokenWalletStateInit(address pubaddr) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildTokenWalletCode(_code[m_DaoTokenWalletCode], pubaddr, version);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: DaoTokenWallet,
            varInit: {_goshdao: _goshdao}
        });
        return _contract;
    }
    
    function _getWalletAddr(uint128 index) internal view returns(address) {
        TvmCell s1 = _composeWalletStateInit(_pubaddr, index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_goshdao: _goshdao, _index: index}
        });
        return _contract;
    }
    
    //Profile part
    function turnOnPubkey(
        uint256 pubkey
    ) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        _access = pubkey;
        getMoney();
    }

    function turnOffPubkey(
    ) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        _access = null;
        getMoney();
    }
    
    //Selfdestruct
    function destroy() public {
        selfdestruct(giver);
    }
    
    //Getters
    function getBalance() external view returns(uint128) {
        return _balance;
    }
    
    function getVersion() external pure returns(string, string) {
        return ("tokenwallet", version);
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
    
    

    function getAccess() external view returns(optional(uint256)) {
        return _access;
    }
}
