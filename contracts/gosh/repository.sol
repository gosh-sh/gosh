// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ton-solidity >=0.61.2;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "commit.sol";
import "goshwallet.sol";
import "tag.sol";
import "snapshot.sol";
import "./libraries/GoshLib.sol";
import "./modifiers/modifiers.sol";

/* Root contract of Repository */
contract Repository is Modifiers{
    string constant version = "0.5.1";

    uint256 _pubkey;
    TvmCell m_CommitCode;
    TvmCell m_SnapshotCode;
    TvmCell m_WalletCode;
    TvmCell m_codeTag;
    address _rootGosh;
    string static _name;
    address _goshdao;
    string _head;
    mapping(string => Item) _Branches;
    mapping(uint256 => bool) _protectedBranch;

    constructor(
        uint256 pubkey, 
        uint256 pubkeysender,
        string name, 
        address goshdao,
        address rootgosh,
        TvmCell CommitCode,
        TvmCell WalletCode,
        TvmCell codeTag,
        TvmCell SnapshotCode,
        uint128 index
        ) public {
        require(_name != "", ERR_NO_DATA);
        tvm.accept();
        m_WalletCode = WalletCode;        
        _pubkey = pubkey;
        _rootGosh = rootgosh;
        _goshdao = goshdao;
        require(checkAccess(pubkeysender, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _name = name;
        m_CommitCode = CommitCode;
        m_codeTag = codeTag;
        m_SnapshotCode = SnapshotCode;
        TvmCell s1 = _composeCommitStateInit("0000000000000000000000000000000000000000");
        _Branches["main"] = Item("main", address.makeAddrStd(0, tvm.hash(s1)));
        _head = "main";
    }

    //Branch part  
    function deployBranch(uint256 pubkey, string newname, string fromcommit, uint128 index)  public view minValue(0.5 ton) {
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        require(_Branches.exists(newname) == false, ERR_BRANCH_EXIST);
        Commit(getCommitAddr(fromcommit)).isCorrect{value: 0.23 ton, flag: 1}(newname, fromcommit);
    }
    
    function commitCorrect(string newname, string fromcommit) public senderIs(getCommitAddr(fromcommit)) {
        tvm.accept();
         require(_Branches.exists(newname) == false, ERR_BRANCH_EXIST);
        _Branches[newname] = Item(newname, getCommitAddr(fromcommit));
    }
    
    function deleteBranch(uint256 pubkey, string name, uint128 index) public minValue(0.3 ton){
        tvm.accept();
        require(_Branches.exists(name), ERR_BRANCH_NOT_EXIST);
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        delete _Branches[name]; 
    }

    //Access part
    function checkAccess(uint256 pubkey, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubkey, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }

    function _composeCommitStateInit(string _commit) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_CommitCode, address(this), version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
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

    //Diff part
    function SendDiff(string branch, address commit, uint128 number) public view senderIs(address(this)){
        tvm.accept();
        require(_Branches.exists(branch), ERR_BRANCH_NOT_EXIST);
        Commit(commit).SendDiff{value: 0.5 ton, bounce: true, flag: 1}(branch, _Branches[branch].value, number);
    }
    
    function SendDiffSmv(uint256 value1, uint128 index, string branch, address commit, uint128 number) public view {
        tvm.accept();
        require(_Branches.exists(branch), ERR_BRANCH_NOT_EXIST);
        require(checkAccess(value1, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        Commit(commit).SendDiff{value: 0.5 ton, bounce: true, flag: 1}(branch, _Branches[branch].value, number);
    }

    //Selfdestruct
    function destroy() public onlyOwner {
        selfdestruct(msg.sender);
    }

    //Setters    
    function setCommit(string nameBranch, address oldcommit, string namecommit, uint128 number) public senderIs(getCommitAddr(namecommit)) {
        require(_Branches.exists(nameBranch), ERR_BRANCH_NOT_EXIST);
        tvm.accept();
        if (_Branches[nameBranch].value != oldcommit) {
            Commit(getCommitAddr(namecommit)).NotCorrectRepo{value: 0.1 ton, flag: 1}(number);
            return;
        }
        _Branches[nameBranch] = Item(nameBranch, getCommitAddr(namecommit));
        Commit(getCommitAddr(namecommit)).allCorrect{value: 0.1 ton, flag: 1}(number);
    }

    function setHEAD(uint256 pubkey, string nameBranch, uint128 index) public {
        require(checkAccess(pubkey, msg.sender, index),ERR_SENDER_NO_ALLOWED);
        require(_Branches.exists(nameBranch), ERR_BRANCH_NOT_EXIST);
        tvm.accept();
        _head = nameBranch;
    }
    
    //Protected branch
        
    function addProtectedBranch(uint256 pubkey, string branch, uint128 index) public {
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (_protectedBranch[tvm.hash(branch)] == true) { return; }
        _addProtectedBranch(branch);
    }
    
    function deleteProtectedBranch(uint256 pubkey, string branch, uint128 index) public {
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (_protectedBranch.exists(tvm.hash(branch)) == false) { return; }
        if (_protectedBranch[tvm.hash(branch)] == false) { return; }
        _deleteProtectedBranch(branch);
    }
    
    function _addProtectedBranch(string branch) private {
        _protectedBranch[tvm.hash(branch)] = true;
    }
    
    function _deleteProtectedBranch(string branch) private {
        delete _protectedBranch[tvm.hash(branch)];
    }
    
    function isNotProtected(uint256 pubkey, string branch, address commit, uint128 number, uint128 index) public view {
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (_protectedBranch[tvm.hash(branch)] == false) {
            this.SendDiff{value: 0.7 ton, bounce: true, flag: 1}(branch, commit, number); 
            return;
        }
    }

    //Getters
        
    function isBranchProtected(string branch) external view returns(bool) {
        if (_protectedBranch.exists(tvm.hash(branch)) == false) { 
            return false; 
        }
        if (_protectedBranch[tvm.hash(branch)] == false) { 
            return false;
        }
        return true;
    }
    
    function getProtectedBranch() external view returns(mapping(uint256 => bool)) {
        return _protectedBranch;
    }

    function getSnapCode(string branch) external view returns(TvmCell) {
        return GoshLib.buildSnapshotCode(m_SnapshotCode, address(this), branch, version);
    }

    function getAddrBranch(string name) external view returns(Item) {
        return _Branches[name];
    }

    function getAllAddress() external view returns(Item[]) {
        Item[] AllBranches;
        for ((uint256 key, Item value) : _Branches) {
            key;
            AllBranches.push(value);
        }
        return AllBranches;
    }

    function getSnapshotAddr(string branch, string name) external view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(m_SnapshotCode, address(this), branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }

    function getCommitCode() external view returns(TvmCell) {
        return m_CommitCode;
    }

    function getTagCode() external view returns(TvmCell) {
        return GoshLib.buildTagCode(m_codeTag, address(this), version);
    }

    function getGoshAdress() external view returns(address) {
        return _rootGosh;
    }

    function getRepoPubkey() external view returns(uint256) {
        return _pubkey;
    }

    function getName() external view returns(string) {
        return _name;
    }

    function getHEAD() external view returns(string) {
        return _head;
    }

    function getCommitAddr(string nameCommit) public view returns(address)  {
        TvmCell s1 = _composeCommitStateInit(nameCommit);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getVersion() external pure returns(string) {
        return version;
    }
}
