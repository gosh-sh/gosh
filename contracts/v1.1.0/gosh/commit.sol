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
import "goshwallet.sol";
import "commit.sol";
import "snapshot.sol";
import "repository.sol";
import "goshdao.sol";
import "./libraries/GoshLib.sol";

struct Pause {
    bool send;
    string branch;
    address branchcommit;
    uint128 index;
    uint128 number;
}

/* Root contract of Commit */
contract Commit is Modifiers {
    string constant version = "1.1.0";

    address _pubaddr;
    address _rootRepo;
    address _goshdao;
    string static _nameCommit;
    string _nameBranch;
    string _commit;
    string _name;
    bool check = false;
    mapping(uint8 => TvmCell) _code;
    address[] _parents;
    address _systemcontract;
    address _tree;
    string _branchName;
    address _branchCommit;
    uint128 _count;
    bool _countready = false;
    mapping(address => int128) _check;
    bool _diffcheck = false;
    bool _commitcheck = false;
    bool _continueChain = false;
    bool _continueDiff = false;
    uint128 _number;
    uint128 _approved;
    bool _flag = false;
    optional(Pause) _saved;
    bool _initupgrade;
    optional(string) _prevversion;
    optional(address) _task;

    uint128 timeMoney = 0;
 
    constructor(address goshdao,
        address rootGosh,
        address pubaddr,
        string nameRepo,
        string nameBranch,
        string commit,
        address[] parents,
        address repo,
        TvmCell WalletCode,
        TvmCell CommitCode,
        TvmCell codeDiff,
        TvmCell SnapshotCode,
        address tree,
        uint128 index,
        bool upgrade
        ) public {
        _systemcontract = rootGosh;
        _goshdao = goshdao;
        _pubaddr = pubaddr;
        require(_nameCommit != "", ERR_NO_DATA);
        tvm.accept();
        _code[m_WalletCode] = WalletCode;
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _parents = parents;
        _name = nameRepo;
        _rootRepo = repo;
        _nameBranch = nameBranch;
        _commit = commit;
        _code[m_CommitCode] = CommitCode;
        _code[m_SnapshotCode] = SnapshotCode;
        _code[m_DiffCode] = codeDiff;
        _tree = tree;
        _initupgrade = upgrade;
        if (_initupgrade == true) { require(parents.length == 1, ERR_BAD_COUNT_PARENTS); }
        getMoney();
    }

    function getMoney() private {
        if (address(this).balance > 2000 ton) { giver.transfer(500 ton); return; }
        if (now - timeMoney > 3600) { _flag = false; timeMoney = now; }
        if (_flag == true) { return; }
        if (address(this).balance > 1400 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneyCommit{value : 0.2 ton}(_rootRepo, _nameCommit);
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
            varInit: { _systemcontract: _systemcontract, _goshdao: _goshdao, _index: index}
        });
        return _contract;
    }
    //Commit part

    function isCorrect(string newname) public senderIs(_rootRepo){
        tvm.accept();
        Tree(_tree).checkFull{value: 0.14 ton, flag:1}(_nameCommit, _rootRepo, newname, 0);
        getMoney();
    }

    function allCorrect(uint128 number) public senderIs(_rootRepo){
        tvm.accept();
        this._acceptCommitRepo{value: 0.2 ton, bounce: true, flag: 1}(0, number);
        getMoney();
    }

    function _acceptCommitRepo(uint128 index, uint128 number) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (index >= number) {
            _commitcheck = false;
            _diffcheck = false;
            return;
        }
        DiffC(getDiffAddress(_nameCommit, index, 0)).allCorrect{value : 0.2 ton, flag: 1}();
        this._acceptCommitRepo{value: 0.2 ton, bounce: true, flag: 1}(index + 1, number);
    }

    function cancelCommit(string namecommit, uint128 number) public {
        tvm.accept();
        require(_buildCommitAddr(namecommit) == msg.sender, ERR_SENDER_NO_ALLOWED);
        getMoney();
        Repository(_rootRepo).commitCanceled{value: 0.1 ton, flag: 1}(_nameCommit, _nameBranch);
        _task = null;
        this._cancelAllDiff{value: 0.2 ton, bounce: true, flag: 1}(0, number);
    }

    function _cancelAllDiff(uint128 index, uint128 number) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (index >= number) { 
            _diffcheck = false;
            _commitcheck = false;
            return; 
        }
        if (address(this).balance < 5 ton) { _saved = Pause(false, "", address.makeAddrNone(), index, number); return; }
        DiffC(getDiffAddress(_nameCommit, index, 0)).cancelCommit{value : 0.2 ton, flag: 1}();
        this._cancelAllDiff{value: 0.2 ton, bounce: true, flag: 1}(index + 1, number);
    }

    function SendDiff(string branch, address branchcommit, string oldversion, uint128 number, uint128 numberCommits, optional(address) task) public senderIs(_rootRepo){
        tvm.accept();
        getMoney();
        if (_initupgrade == true) {
            require(_parents[0] == branchcommit, ERR_BAD_PARENT);
            if (_nameCommit == "0000000000000000000000000000000000000000") {  Repository(_rootRepo).initCommit{value: 0.14 ton, flag:1}(_nameCommit, branch, _parents[0]); }
            else { Tree(_tree).checkFull{value: 0.14 ton, flag:1}(_nameCommit, _rootRepo, branch, 1); }
            _prevversion = oldversion;
            return;
        }
        require(_continueChain == false, ERR_PROCCESS_IS_EXIST);
        require(_continueDiff == false, ERR_PROCCESS_IS_EXIST);
        require(_commitcheck == false, ERR_PROCCESS_IS_EXIST);
        require(_diffcheck == false, ERR_PROCCESS_IS_EXIST);
        require(_number == 0, ERR_PROCCESS_IS_EXIST);
        _number = number;
        _approved = 0;
        _task = task;
        this._sendAllDiff{value: 0.2 ton, bounce: true, flag: 1}(branch, branchcommit, 0, _number);
        this._checkChain{value: 0.2 ton, bounce: true, flag: 1}(branch, branchcommit, address(this), numberCommits);
        _continueChain = true;
        _continueDiff = true;
    }

    function treeAccept(string branch, uint128 typer) public senderIs(_tree) {
        if (typer == 1) { Repository(_rootRepo).initCommit{value: 0.14 ton, flag:1}(_nameCommit, branch, _parents[0]); }
        else { Repository(_rootRepo).commitCorrect{value: 0.22 ton, flag: 1}(branch, _nameCommit); }
        getMoney();
    }

    function _sendAllDiff(string branch, address branchcommit, uint128 index, uint128 number) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (_continueDiff == false) { return; }
        if (address(this).balance < 5 ton) { _saved = Pause(true, branch, branchcommit, index, number); return; }
        if ((number == 0) && (index == 0)) {
            _approved = 0;
            _continueDiff = false;
            _diffcheck = true;
            if (_continueChain == true) { return; }
            this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branch, branchcommit);
            return;
        }
        if (index >= number) { return; }
        DiffC(getDiffAddress(_nameCommit, index, 0)).sendDiffAll{value: 0.5 ton, bounce: true, flag: 1}(branch, branchcommit);
        this._sendAllDiff{value: 0.2 ton, bounce: true, flag: 1}(branch, branchcommit, index + 1, number);
    }

    function getAcceptedDiff(Diff value0, uint128 index1, uint128 index2, string branch) public senderIs(getDiffAddress(_nameCommit, index1, index2)){
        value0;
        branch;
        getMoney();
    }

    function getAcceptedContent(bytes value0, optional(string) value1, string branch, string path) public senderIs(getSnapshotAddr(branch, path)){
        getMoney();
        tvm.accept();
        if (value1.hasValue()) {
            Tree(_tree).getShaInfoCommit{value: 0.23 ton, bounce: true, flag: 1}(_nameCommit, Request(msg.sender, path, path, tvm.hash(value1.get()))); return;
        }
        Tree(_tree).getShaInfoCommit{value: 0.23 ton, bounce: true, flag: 1}(_nameCommit, Request(msg.sender, path, path, tvm.hash(gosh.unzip(value0))));
    }

    function getSnapshotAddr(string branch, string name) private view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], _rootRepo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }

    function _checkChain(
        string branchName,
        address branchCommit,
        address newC,
        uint128 numberCommits) public senderIs(address(this)) {
        if (branchCommit  == address(this)) {
                if (numberCommits != 0) { Commit(newC).NotCorrect{value: 0.2 ton, flag: 1}(branchName, branchCommit, _nameCommit); return; }
                Commit(newC).ChainAccept{value: 0.3 ton, bounce: true }(_nameCommit, branchName, branchCommit, newC);
        }
        else {
            if (_parents.length == 0) { Commit(newC).NotCorrect{value: 0.2 ton, flag: 1}(branchName, branchCommit, _nameCommit); return; }
            if (numberCommits == 0) { Commit(newC).NotCorrect{value: 0.2 ton, flag: 1}(branchName, branchCommit, _nameCommit); return; }
            Commit(_parents[0]).CommitCheckCommit{value: 0.3 ton, bounce: true }(_nameCommit, branchName, branchCommit , newC, numberCommits - 1);
        }
        getMoney();
    }

    function abortDiff(string branch, address branchCommit, uint128 index) public senderIs(getDiffAddress(_nameCommit, index, 0)) {
        tvm.accept();
        _continueDiff = false;
        _diffcheck = false;
        getMoney();
        _approved = 0;
        if (_continueChain == true) { return; }
        this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branch, branchCommit);
    }

    function DiffCheckCommit(string branch, address branchCommit, uint128 index) public senderIs(getDiffAddress(_nameCommit, index, 0)) {
        tvm.accept();
        getMoney();
        _approved += 1;
        if (_continueDiff == false) { return; }
        if (_approved < _number) { return; }
        _approved = 0;
        _continueDiff = false;
        _diffcheck = true;
        if (_continueChain == true) { return; }
        this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branch, branchCommit);
    }

    function ChainAccept(string name, string branchName, address branchCommit, address newC) public senderIs(branchCommit) {
        tvm.accept();
        require(_buildCommitAddr(name) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(newC == address(this), ERR_WRONG_DATA);
        _continueChain = false;
        _commitcheck = true;
        getMoney();
        if (_continueDiff == true) { return; }
        this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branchName, branchCommit);
    }


    function NotCorrect(string branch, address branchCommit, string commit) public {
        if (msg.sender != _buildCommitAddr(commit)){ return; }
        tvm.accept();
        _continueChain = false;
        _commitcheck = false;
        getMoney();
        if (_continueDiff == true) { return; }
        this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branch, branchCommit);
    }

    function acceptAll(string branch, address branchCommit) public senderIs(address(this)) {
        if ((_commitcheck != false) && (_diffcheck != false)) {
            Repository(_rootRepo).setCommit{value: 0.3 ton, bounce: true }(branch, branchCommit, _nameCommit, _number, _task);
            _number = 0;
        }
        else {
            _diffcheck = true;
            this.cancelCommit{value: 0.2 ton, flag: 1}(_nameCommit, _number);
            _number = 0;
        }
    }

    function NotCorrectRepo(uint128 number) public senderIs(_rootRepo){
        tvm.accept();
        getMoney();
        if (number != 0) { this._cancelCommitRepo{value: 0.2 ton, bounce: true, flag: 1}(0, number); }
    }

    function _cancelCommitRepo(uint128 index, uint128 number) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (index >= number) {
            _commitcheck = false;
            _diffcheck = false;
            return;
        }
        DiffC(getDiffAddress(_nameCommit, index, 0)).cancelCommit{value : 0.2 ton, flag: 1}();
        this._cancelCommitRepo{value: 0.2 ton, bounce: true, flag: 1}(index + 1, number);
    }

    function CommitCheckCommit(
        string nameCommit,
        string branchName,
        address branchCommit ,
        address newC,
        uint128 numberCommits) public {
        require(_buildCommitAddr(nameCommit) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (branchCommit  != address(this)) { require(_initupgrade == false, ERR_WRONG_COMMIT_ADDR); }
        this._checkChain{value: 0.2 ton, bounce: true, flag: 1}(branchName, branchCommit, newC, numberCommits);
        getMoney();
    }

    function getDiffAddress(string commit, uint128 index1, uint128 index2) private view returns(address) {
        TvmCell s1 = _composeDiffStateInit(commit, index1, index2);
        return  address(tvm.hash(s1));
    }

    function _composeDiffStateInit(string commit, uint128 index1, uint128 index2) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_DiffCode], _rootRepo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: commit, _index1: index1, _index2: index2}});
        return stateInit;
    }

    function gotCount(uint128 count) public senderIs(_tree) {
        _count = count;
        _countready = true;
        getMoney();
    }

    function checkFallbackDiff (uint128 index, address sender) public senderIs(address(this)){
        tvm.accept();
        getMoney();
        if (index >= _number) { return; }
        if (sender == getDiffAddress(_nameCommit, index, 0)) {
            _continueDiff = false;
            _diffcheck = false;
            _approved = 0;
            if (_continueChain == true) { return; }
            this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}("", sender);
        }
        this.checkFallbackDiff{value: 0.2 ton, bounce: true, flag: 1}(index + 1, sender);
    }

    //Fallback/Receive
    receive() external {
        tvm.accept();
        if (msg.sender == _goshdao) {
            _flag = false;
            if (_saved.hasValue() == true) {
                Pause val = _saved.get();
                if (val.send == true) {
                    this._sendAllDiff{value: 0.2 ton, bounce: true, flag: 1}(val.branch, val.branchcommit, val.index, val.number);
                }
                else {
                    this._cancelAllDiff{value: 0.2 ton, bounce: true, flag: 1}(val.index, val.number);
                }
                _saved = null;
            }
        }
    }

    onBounce(TvmSlice body) external view {
        tvm.accept();
        body;
        if ((msg.sender == _parents[0]) ||  (msg.sender == _tree)) {
            this._cancelAllDiff{value: 0.2 ton, bounce: true, flag: 1}(0, _number);
            return;
        }
        if (msg.value > 1 ton) { return; }
        this.checkFallbackDiff{value: 0.2 ton, bounce: true, flag: 1}(0, msg.sender);
    }

    fallback() external view {
        tvm.accept();
        if ((msg.sender == _parents[0]) ||  (msg.sender == _tree)) {
            this._cancelAllDiff{value: 0.2 ton, bounce: true, flag: 1}(0, _number);
            return;
        }
        if (msg.value > 1 ton) { return; }
        this.checkFallbackDiff{value: 0.2 ton, bounce: true, flag: 1}(0, msg.sender);
    }

    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public {
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(giver);
    }

    //Getters

    function _buildCommitAddr(
        string commit
    ) private view returns(address) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_CommitCode], _rootRepo, version);
        TvmCell state = tvm.buildStateInit({
            code: deployCode,
            contr: Commit,
            varInit: {_nameCommit: commit}
        });
        return address(tvm.hash(state));
    }

    function gettree() external view returns(address) {
        return _tree;
    }

     function getParents() external view returns(address[]) {
        return (_parents);
    }

    function getNameCommit() external view returns(string) {
        return _nameCommit;
    }

    function getNameBranch() external view returns(string) {
        return _nameBranch;
    }

    function getAddrRepository() external view returns(address) {
        return _rootRepo;
    }

    function getPrevCommitVersion() external view returns(optional(string)) {
        return _prevversion;
    }

    function getDiffAddress(uint128 index1, uint128 index2) external view returns(address) {
        return getDiffAddress(_nameCommit, index1, index2);
    }

    function getCommit() external view returns (
        address repo,
        string branch,
        string sha,
        address[] parents,
        string content,
        bool initupgrade
    ) {
        return (_rootRepo, _nameBranch, _nameCommit, _parents, _commit, _initupgrade);
    }

    function getCount() external view returns(uint128, bool) {
        return (_count, _countready);
    }

    function getVersion() external pure returns(string, string) {
        return ("commit", version);
    }

    function getOwner() external view returns(address) {
        return _pubaddr;
    }

    function getInitUpgrade() external view returns(bool) {
        return _initupgrade;
    }
}
