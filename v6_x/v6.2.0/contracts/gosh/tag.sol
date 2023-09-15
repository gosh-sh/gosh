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

import "systemcontract.sol";
import "./smv/modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "goshwallet.sol";

/* Root contract of tag */
contract Tag is Modifiers{
    string constant version = "6.2.0";
    
    string static _nametag;
    string _nameCommit;
    string _content;
    address _commit;
    address _pubaddr;
    address _systemcontract;
    address _goshdao;
    string _repoName;
    string _nameDao;
    mapping(uint8 => TvmCell) _code;
    
    constructor(
        address pubaddr,
        string nameCommit, 
        address commit, 
        string content,
        address goshaddr,
        address goshdao,
        string reponame,
        string namedao,
        TvmCell WalletCode,
        uint128 index) onlyOwner {
        require(_nametag != "", ERR_NO_DATA);
        tvm.accept();
        _code[m_WalletCode] = WalletCode;
        _systemcontract = goshaddr;
        _goshdao = goshdao;
        _pubaddr = pubaddr;
        _repoName = reponame;
        _nameDao = namedao;
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        _nameCommit = nameCommit;
        _commit = commit;
        _content = content;
    }
    
    function upgradeToVersion(address pubaddr, uint128 index, string newversion) public view {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        newversion;
        SystemContract(_systemcontract).upgradeTag1{value: 0.2 ton, flag: 1}(_nameDao, _repoName, _nametag, _nameCommit, _commit, _content, newversion);
    }
    
    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        selfdestruct(_systemcontract);
    }
    
    //Getters
    function getDetails() external view returns(string, address, string, string, string) {
        return (_nametag, _commit, _nameCommit, _content, _repoName);
    }
    
    function getTagIn() public view minValue(0.5 ton) {
        IObject(msg.sender).returnTag{value: 0.1 ton, flag: 1}(_nametag, _commit, _nameCommit, _content, _repoName);
    }
    
    function getCommit() external view returns(address) {
        return _commit;
    }
    
    function getContent() external view returns(string) {
        return _content;
    }
    
    function getVersion() external pure returns(string, string) {
        return ("tag", version);
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
