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

import "commit.sol";
import "goshwallet.sol";
import "tag.sol";
import "snapshot.sol";
import "./libraries/GoshLib.sol";
import "./modifiers/modifiers.sol";

/* Root contract of Repository */
contract Repository is Modifiers{
    string constant version = "1.0.0";

    bool _tombstone = false;
    optional(AddrVersion) _previousversion;
    address _pubaddr;
    mapping(uint8 => TvmCell) _code;
    address _systemcontract;
    string static _name;
    string _nameDao;
    address _goshdao;
    string _head;
    mapping(uint256 => Item) _Branches;
    mapping(uint256 => bool) _protectedBranch;
    bool _ready = false;

    constructor(
        address pubaddr,
        string name,
        string nameDao,
        address goshdao,
        address rootgosh,
        TvmCell CommitCode,
        TvmCell WalletCode,
        TvmCell codeTag,
        TvmCell SnapshotCode,
        TvmCell codeTree,
        TvmCell codeDiff,
        TvmCell contentSignature,
        uint128 index,
        optional(AddrVersion) previousversion
        ) public {
        require(_name != "", ERR_NO_DATA);
        tvm.accept();
        _code[m_WalletCode] = WalletCode;
        _pubaddr = pubaddr;
        _systemcontract = rootgosh;
        _goshdao = goshdao;
        _nameDao = nameDao;
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _name = name;
        _code[m_CommitCode] = CommitCode;
        _code[m_TagCode] = codeTag;
        _code[m_TreeCode] = codeTree;
        _code[m_SnapshotCode] = SnapshotCode;
        _code[m_DiffCode] = codeDiff;
        _code[m_contentSignature] = contentSignature;
        _previousversion = previousversion;
        if (_previousversion.hasValue()) { SystemContract(_systemcontract).checkUpdateRepo1{value: 0.3 ton, bounce: true, flag: 1}(_name, _nameDao, _previousversion.get(), address(this)); return; }
        _ready = true;
        TvmCell s1 = _composeCommitStateInit("0000000000000000000000000000000000000000");
        _Branches[tvm.hash("main")] = Item("main", address.makeAddrStd(0, tvm.hash(s1)), version);
        _head = "main";
    }

    function checkUpdateRepo4(AddrVersion prev, address answer) public view senderIs(_systemcontract) accept {
        if (prev.addr != address(this)) {
            Repository(answer).checkUpdateRepo5{value : 0.15 ton, flag: 1}(false, _Branches, _protectedBranch, _head);
        }
        Repository(answer).checkUpdateRepo5{value : 0.15 ton, flag: 1}(true, _Branches, _protectedBranch, _head);
    }

    function checkUpdateRepo5(bool ans, mapping(uint256 => Item) Branches, mapping(uint256 => bool) protectedBranch, string head) public senderIs(_previousversion.get().addr) accept {
        if (ans == false) { selfdestruct(giver); }
        _Branches = Branches;
        _protectedBranch = protectedBranch;
        _head = head;
        _ready = true;
    }

    //Branch part
    function deployBranch(address pubaddr, string newname, string fromcommit, uint128 index)  public minValue(0.5 ton) {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_tombstone == false, ERR_OLD_CONTRACT);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        require(_Branches.exists(tvm.hash(newname)) == false, ERR_BRANCH_EXIST);
        if ("0000000000000000000000000000000000000000" == fromcommit) { _Branches[tvm.hash(newname)] = Item(newname, getCommitAddr(fromcommit), version); return; }
        Commit(getCommitAddr(fromcommit)).isCorrect{value: 0.23 ton, flag: 1}(newname);
    }

    function commitCorrect(string newname, string fromcommit) public senderIs(getCommitAddr(fromcommit)) {
        tvm.accept();
         require(_Branches.exists(tvm.hash(newname)) == false, ERR_BRANCH_EXIST);
        _Branches[tvm.hash(newname)] = Item(newname, getCommitAddr(fromcommit), version);
    }

    function deleteBranch(address pubaddr, string name, uint128 index) public minValue(0.3 ton){
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_tombstone == false, ERR_OLD_CONTRACT);
        tvm.accept();
        require(_Branches.exists(tvm.hash(name)), ERR_BRANCH_NOT_EXIST);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        delete _Branches[tvm.hash(name)];
    }

    //Access part
    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }

    function _composeCommitStateInit(string _commit) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_CommitCode], address(this), version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
    }

    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_systemcontract : _systemcontract, _goshdao: _goshdao, _index: index}
        });
        return _contract;
    }

    function initCommit(string namecommit, string branch, address commit) public view senderIs(getCommitAddr(namecommit)) accept {
        require(_previousversion.hasValue(), ERR_WRONG_DATA);
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        Repository(_previousversion.get().addr).isCorrectCommit{value: 0.3 ton, bounce: true, flag: 1}(namecommit, branch, commit);
    }

    function isCorrectCommit(string namecommit, string branch, address commit) public view {
        if ((_Branches[tvm.hash(branch)].commitaddr == getCommitAddr(namecommit)) && (commit == _Branches[tvm.hash(branch)].commitaddr)) {
            Repository(msg.sender).correctCommit{value: 0.1 ton, bounce: true, flag: 1}(namecommit, branch);
        }
    }

    function commitCanceled(string namecommit, string branch) public senderIs(getCommitAddr(namecommit)) view accept {
        namecommit; branch;
    }

    function correctCommit(string namecommit, string branch) public senderIs(_previousversion.get().addr) accept {
        _Branches[tvm.hash(branch)] = Item(branch, getCommitAddr(namecommit), version);
    }

    //Diff part
    function SendDiff(string branch, address commit, uint128 number, uint128 numberCommits) public view senderIs(address(this)){
        tvm.accept();
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        Commit(commit).SendDiff{value: 0.5 ton, bounce: true, flag: 1}(branch, _Branches[tvm.hash(branch)].commitaddr, _Branches[tvm.hash(branch)].commitversion, number, numberCommits);
    }

    function SendDiffSmv(address pubaddr, uint128 index, string branch, address commit, uint128 number, uint128 numberCommits) public view accept {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        Commit(commit).SendDiff{value: 0.5 ton, bounce: true, flag: 1}(branch, _Branches[tvm.hash(branch)].commitaddr, _Branches[tvm.hash(branch)].commitversion, number, numberCommits);
    }

    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public {
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(giver);
    }

    //Setters
    function setCommit(string nameBranch, address oldcommit, string namecommit, uint128 number) public senderIs(getCommitAddr(namecommit)) {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_tombstone == false, ERR_OLD_CONTRACT);
        require(_Branches.exists(tvm.hash(nameBranch)), ERR_BRANCH_NOT_EXIST);
        tvm.accept();
        if (_Branches[tvm.hash(nameBranch)].commitaddr != oldcommit) {
            Commit(getCommitAddr(namecommit)).NotCorrectRepo{value: 0.1 ton, flag: 1}(number);
            return;
        }
        _Branches[tvm.hash(nameBranch)] = Item(nameBranch, getCommitAddr(namecommit), version);
        Commit(getCommitAddr(namecommit)).allCorrect{value: 0.1 ton, flag: 1}(number);
    }

    function setHEAD(address pubaddr, string nameBranch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_tombstone == false, ERR_OLD_CONTRACT);
        require(checkAccess(pubaddr, msg.sender, index),ERR_SENDER_NO_ALLOWED);
        require(_Branches.exists(tvm.hash(nameBranch)), ERR_BRANCH_NOT_EXIST);
        tvm.accept();
        _head = nameBranch;
    }

    //Protected branch

    function addProtectedBranch(address pubaddr, string branch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_tombstone == false, ERR_OLD_CONTRACT);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (_protectedBranch[tvm.hash(branch)] == true) { return; }
        _addProtectedBranch(branch);
    }

    function deleteProtectedBranch(address pubaddr, string branch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_tombstone == false, ERR_OLD_CONTRACT);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
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

    function isNotProtected(address pubaddr, string branch, address commit, uint128 number, uint128 numberCommits, uint128 index) public view {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_tombstone == false, ERR_OLD_CONTRACT);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (_protectedBranch[tvm.hash(branch)] == false) {
            this.SendDiff{value: 0.7 ton, bounce: true, flag: 1}(branch, commit, number, numberCommits);
            return;
        }
    }

    function _composeTreeStateInit(string shaTree) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildTreeCode(_code[m_TreeCode], version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaTree: shaTree, _repo: address(this)}});
        return stateInit;
    }

    function _composeDiffStateInit(string _commit, address repo, uint128 index1, uint128 index2) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_DiffCode], repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: _commit, _index1: index1, _index2: index2}});
        return stateInit;
    }

    //Getters
    function getContentAddress(string commit, string label) external view returns(address) {
        address repo = address(this);
        TvmCell deployCode = GoshLib.buildSignatureCode(_code[m_contentSignature], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: ContentSignature, varInit: {_commit : commit, _label : label, _systemcontract : _systemcontract, _goshdao : _goshdao}});
       return address.makeAddrStd(0, tvm.hash(s1));
    }

    function isBranchProtected(string branch) external view returns(bool) {
        if (_protectedBranch.exists(tvm.hash(branch)) == false) {
            return false;
        }
        if (_protectedBranch[tvm.hash(branch)] == false) {
            return false;
        }
        return true;
    }

    function getTreeAddr(string treeName) external view returns(address) {
        TvmCell s1 = _composeTreeStateInit(treeName);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getProtectedBranch() external view returns(mapping(uint256 => bool)) {
        return _protectedBranch;
    }

    function getSnapCode(string branch) external view returns(TvmCell) {
        return GoshLib.buildSnapshotCode(_code[m_SnapshotCode], address(this), branch, version);
    }

    function getAddrBranch(string name) external view returns(Item) {
        return _Branches[tvm.hash(name)];
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
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], address(this), branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }

    function getDiffAddr (string commitName, uint128 index1, uint128 index2) external view returns(address) {
        TvmCell s1 = _composeDiffStateInit(commitName, address(this), index1, index2);
        return  address(tvm.hash(s1));
    }

    function getCommitCode() external view returns(TvmCell) {
        return _code[m_CommitCode];
    }

    function getTagCode() external view returns(TvmCell) {
        return GoshLib.buildTagCode(_code[m_TagCode], address(this), version);
    }

    function getGoshAddress() external view returns(address) {
        return _systemcontract;
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

    function getOwner() external view returns(address) {
        return _pubaddr;
    }

    function getPrevious() external view returns(optional(AddrVersion)) {
        return _previousversion;
    }

    function getTombstone() external view returns(bool) {
        return _tombstone;
    }

    function getReady() external view returns(bool) {
        return _ready;
    }
}
