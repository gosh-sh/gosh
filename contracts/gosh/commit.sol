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
import "goshwallet.sol";
import "commit.sol";
import "snapshot.sol";
import "repository.sol";
import "./libraries/GoshLib.sol";

/* Root contract of Commit */
contract Commit is Modifiers {
    string constant version = "0.5.1";
    
    uint256 _pubkey;
    address _rootRepo;
    address _goshdao;
    string static _nameCommit;
    string _nameBranch;
    string _commit;
    string _name;
    bool check = false;  
    TvmCell m_WalletCode;
    TvmCell m_CommitCode;
    TvmCell m_SnapshotCode;
    TvmCell m_codeDiff;
    address[] _parents;
    address _rootGosh;
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

    constructor(address goshdao, 
        address rootGosh, 
        uint256 pubkey,
        uint256 pubkeysender, 
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
        uint128 index
        ) public {
        _rootGosh = rootGosh;
        _goshdao = goshdao;
        _pubkey = pubkey;
        require(_nameCommit != "", ERR_NO_DATA);
        tvm.accept();
        m_WalletCode = WalletCode;
        require(checkAccess(pubkeysender, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _parents = parents;
        _name = nameRepo;
        _rootRepo = repo;
        _nameBranch = nameBranch;
        _commit = commit;
        m_CommitCode = CommitCode;
        m_SnapshotCode = SnapshotCode;
        m_codeDiff = codeDiff;
        _tree = tree;
        getMoney(_pubkey);
    }
    
    function getMoney(uint256 pubkey) private view{
        TvmCell s1 = _composeWalletStateInit(pubkey, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        if (address(this).balance > 80 ton) { return; }
        GoshWallet(addr).sendMoney{value : 0.2 ton}(_rootRepo, _nameCommit);
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
    
    function getTreeSha(string commit, uint128 index1, uint128 index2) public view senderIs(getDiffAddress(commit, index1, index2)) {
        DiffC(msg.sender).approveDiffFinal{value: 0.2 ton, flag: 1}(_nameCommit, true);
        getMoney(_pubkey);    
    }
    
    //Commit part
    
    function isCorrect(string newname, string fromcommit) public view senderIs(_rootRepo){
        tvm.accept();
        Repository(_rootRepo).commitCorrect{value: 0.22 ton, flag: 1}(newname, fromcommit);
    }
    
    function allCorrect(uint128 number) public view senderIs(_rootRepo){
        tvm.accept();
        this._acceptCommitRepo{value: 0.2 ton, bounce: true, flag: 1}(0, number);
        getMoney(_pubkey);
    }
    
    function _acceptCommitRepo(uint128 index, uint128 number) public senderIs(address(this)) {
        tvm.accept();
        if (index >= number) { 
            _commitcheck = false;
            _diffcheck = false;
            return;
        }
        DiffC(getDiffAddress(_nameCommit, index, 0)).allCorrect{value : 0.2 ton, flag: 1}();
        this._acceptCommitRepo{value: 0.2 ton, bounce: true, flag: 1}(index + 1, number);
        getMoney(_pubkey);
    }
    
    function cancelCommit(string namecommit, uint128 number) public view {
        tvm.accept();
        require(_buildCommitAddr(namecommit) == msg.sender, ERR_SENDER_NO_ALLOWED);
        getMoney(_pubkey);
        this._cancelAllDiff{value: 0.2 ton, bounce: true, flag: 1}(0, number);
    }
    
    function _cancelAllDiff(uint128 index, uint128 number) public view senderIs(address(this)) {
        tvm.accept();
        if (index >= number) { return; }
        DiffC(getDiffAddress(_nameCommit, index, 0)).cancelCommit{value : 0.2 ton, flag: 1}();
        this._cancelAllDiff{value: 0.2 ton, bounce: true, flag: 1}(index + 1, number);
        getMoney(_pubkey);
    }
    
    function SendDiff(string branch, address branchcommit, uint128 number) public senderIs(_rootRepo){
        tvm.accept();
        require(_continueChain == false, ERR_PROCCESS_IS_EXIST);
        require(_continueDiff == false, ERR_PROCCESS_IS_EXIST);
        require(_commitcheck == false, ERR_PROCCESS_IS_EXIST);
        require(_diffcheck == false, ERR_PROCCESS_IS_EXIST);
        require(_number == 0, ERR_PROCCESS_IS_EXIST);
        _number = number;
        _approved = 0;
        this._sendAllDiff{value: 0.2 ton, bounce: true, flag: 1}(branch, branchcommit, 0);
        this._checkChain{value: 0.2 ton, bounce: true, flag: 1}(_pubkey, branch, branchcommit, address(this));
        _continueChain = true;
        _continueDiff = true;
        getMoney(_pubkey);
    }
    
    function _sendAllDiff(string branch, address branchcommit, uint128 index) public senderIs(address(this)) {
        tvm.accept();
        if (_number == 0) { 
            _approved = 0;
            _continueDiff = false;
            _diffcheck = true;
            getMoney(_pubkey);
            if (_continueChain == true) { return; }
            this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branch, branchcommit);
            return;
        }
        if (index >= _number) { return; }
        DiffC(getDiffAddress(_nameCommit, index, 0)).sendDiffAll{value: 0.5 ton, bounce: true, flag: 1}(branch, branchcommit);
        this._sendAllDiff{value: 0.2 ton, bounce: true, flag: 1}(branch, branchcommit, index + 1);
        getMoney(_pubkey);
    }
    
    function getAcceptedDiff(Diff value0, uint128 index1, uint128 index2) public view senderIs(getDiffAddress(_nameCommit, index1, index2)){
        value0;
        getMoney(_pubkey);
    }
    
    function getAcceptedContent(bytes value0, optional(string) value1, string branch, string path) public view senderIs(getSnapshotAddr(branch, path)){
        getMoney(_pubkey);
        tvm.accept();
        if (value1.hasValue()) { 
            Tree(_tree).getShaInfoCommit{value: 0.23 ton, bounce: true, flag: 1}(_nameCommit, Request(msg.sender, path, path, tvm.hash(value1.get()))); return;
        }
        Tree(_tree).getShaInfoCommit{value: 0.23 ton, bounce: true, flag: 1}(_nameCommit, Request(msg.sender, path, path, tvm.hash(gosh.unzip(value0))));
    }
    
    function getSnapshotAddr(string branch, string name) private view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(m_SnapshotCode, _rootRepo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }
        
    function _checkChain(uint256 pubkey,
        string branchName,
        address branchCommit,
        address newC) public view senderIs(address(this)) {
        if (branchCommit  == address(this)) {
                Commit(newC).ChainAccept{value: 0.3 ton, bounce: true }(_nameCommit, branchName, branchCommit, newC);
        }
        else {
            if (_parents.length == 0) { Commit(newC).NotCorrect{value: 0.2 ton, flag: 1}(branchName, branchCommit, _nameCommit); return; }
            Commit(_parents[0]).CommitCheckCommit{value: 0.3 ton, bounce: true }(pubkey, _nameCommit, branchName, branchCommit , newC);
        }
        getMoney(pubkey);
    }     
    
    function abortDiff(uint256 pubkey, string branch, address branchCommit, uint128 index) public senderIs(getDiffAddress(_nameCommit, index, 0)) {
        tvm.accept();    
        _continueDiff = false;
        _diffcheck = false;
        getMoney(pubkey);
        _approved = 0;
        if (_continueChain == true) { return; }
        this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branch, branchCommit);
    }
    
    function DiffCheckCommit(uint256 pubkey, string branch, address branchCommit, uint128 index) public senderIs(getDiffAddress(_nameCommit, index, 0)) {
        tvm.accept();    
        _approved += 1;
        if (_continueDiff == false) { return; }
        if (_approved < _number) { return; }
        _approved = 0;
        _continueDiff = false;
        _diffcheck = true;
        getMoney(pubkey);
        if (_continueChain == true) { return; }
        this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branch, branchCommit);
    }
    
    function ChainAccept(string name, string branchName, address branchCommit, address newC) public senderIs(branchCommit) {
        tvm.accept();
        require(_buildCommitAddr(name) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(newC == address(this), ERR_WRONG_DATA);
        _continueChain = false;
        _commitcheck = true;
        getMoney(_pubkey);
        if (_continueDiff == true) { return; }
        this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branchName, branchCommit);
    }
    
        
    function NotCorrect(string branch, address branchCommit, string commit) public {
        if (msg.sender != _buildCommitAddr(commit)){ return; }
        tvm.accept();
        _continueChain = false;
        _commitcheck = false;
        getMoney(_pubkey);
        if (_continueDiff == true) { return; }
        this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}(branch, branchCommit);
    }
    
    function acceptAll(string branch, address branchCommit) public senderIs(address(this)) {
        if ((_commitcheck != false) && (_diffcheck != false)) { 
            Repository(_rootRepo).setCommit{value: 0.3 ton, bounce: true }(branch, branchCommit, _nameCommit, _number);
            _number = 0;
        }
        else {
            this.cancelCommit{value: 0.2 ton, flag: 1}(_nameCommit, _number);
            _number = 0;
        }
    }
    
    function NotCorrectRepo(uint128 number) public view senderIs(_rootRepo){
        tvm.accept();
        getMoney(_pubkey);
        if (number != 0) { this._cancelCommitRepo{value: 0.2 ton, bounce: true, flag: 1}(0, number); }
    }
    
    function _cancelCommitRepo(uint128 index, uint128 number) public senderIs(address(this)) {
        tvm.accept();
        if (index >= number) {
            _commitcheck = false;
            _diffcheck = false; 
            return; 
        }
        DiffC(getDiffAddress(_nameCommit, index, 0)).cancelCommit{value : 0.2 ton, flag: 1}();
        this._cancelCommitRepo{value: 0.2 ton, bounce: true, flag: 1}(index + 1, number);
        getMoney(_pubkey);
    }
    
    function CommitCheckCommit(
        uint256 pubkey,
        string nameCommit,
        string branchName,
        address branchCommit ,  
        address newC) public view {
        require(_buildCommitAddr(nameCommit) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        this._checkChain{value: 0.2 ton, bounce: true, flag: 1}(pubkey, branchName, branchCommit, newC);
        getMoney(pubkey);
    }
    
    function getDiffAddress(string commit, uint128 index1, uint128 index2) private view returns(address) {
        TvmCell s1 = _composeDiffStateInit(commit, index1, index2);
        return  address(tvm.hash(s1));
    }
    
    function _composeDiffStateInit(string commit, uint128 index1, uint128 index2) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeDiff, _rootRepo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: commit, _index1: index1, _index2: index2}});
        return stateInit;
    }
    
    function gotCount(uint128 count) public senderIs(_tree) {
        _count = count;
        _countready = true;
        getMoney(_pubkey);
    }
    
    function checkFallbackDiff (uint128 index, address sender) public senderIs(address(this)){
        tvm.accept();
        if (index >= _number) { return; }
        if (sender == getDiffAddress(_nameCommit, index, 0)) { 
            _continueDiff = false;
            _diffcheck = false;
            getMoney(_pubkey);
            _approved = 0;
            if (_continueChain == true) { return; }
            this.acceptAll{value: 0.15 ton, bounce: true, flag: 1}("", sender);
        }
        this.checkFallbackDiff{value: 0.2 ton, bounce: true, flag: 1}(index + 1, sender);
        getMoney(_pubkey);
    }
    
    //Fallback/Receive
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
    function destroy(uint128 index) public {
        require(checkAccess(msg.pubkey(), msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(msg.sender);
    }
    
    //Setters
    function setTree(uint256 pubkey, address tree, uint128 index) public {
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        _tree = tree  ;
        getMoney(pubkey);
    } 
    
    //Getters
    
    function _buildCommitAddr(
        string commit
    ) private view returns(address) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_CommitCode, _rootRepo, version);
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

    function getRepoAdress() external view returns(address) {
        return _rootRepo;
    }
    
    function getDiffAdress(uint128 index1, uint128 index2) external view returns(address) {
        return getDiffAddress(_nameCommit, index1, index2);
    }

    function getCommit() external view returns (
        address repo,
        string branch,
        string sha,
        address[] parents,
        string content
    ) {
        return (_rootRepo, _nameBranch, _nameCommit, _parents, _commit);
    }
     
    function getCount() external view returns(uint128, bool) {
        return (_count, _countready);
    }

    function getVersion() external pure returns(string) {
        return version;
    }
}
