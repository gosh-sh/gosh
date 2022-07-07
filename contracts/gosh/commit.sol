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
    string constant version = "0.4.1";
    
    uint256 _pubkey;
    address _rootRepo;
    address _goshdao;
    address _diff;
    string static _nameCommit;
    string _nameBranch;
    string _commit;
    string _name;
    bool check = false;  
    TvmCell m_WalletCode;
    TvmCell m_CommitCode;
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
        address diff,
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
        m_codeDiff = codeDiff;
        _diff = diff;
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
    
    function getTreeSha(string commit, uint128 index) public view senderIs(getDiffAddress(commit, index)) {
        DiffC(msg.sender).approveDiffFinal{value: 0.2 ton, flag: 1}(_nameCommit, true);
        getMoney(_pubkey);    
    }
    
    //Commit part
    function allCorrect() public view senderIs(_rootRepo){
        tvm.accept();
        DiffC(_diff).allCorrect{value : 0.2 ton, flag: 1}();
        getMoney(_pubkey);
    }
    
    function cancelCommit(string namecommit) public view {
        tvm.accept();
        require(_buildCommitAddr(namecommit) == msg.sender, ERR_SENDER_NO_ALLOWED);
        getMoney(_pubkey);
        DiffC(_diff).cancelCommit{value : 0.2 ton, flag: 1}();
    }
    
    function SendDiff(string branch, address branchcommit) public view senderIs(_rootRepo){
        tvm.accept();
        require(branch == _nameBranch, ERR_WRONG_BRANCH);
        DiffC(_diff).sendDiffAll{value: 0.5 ton, bounce: true, flag: 1}(branchcommit);
        this._checkChain{value: 0.2 ton, bounce: true, flag: 1}(_pubkey, branch, branchcommit, address(this));
        getMoney(_pubkey);
    }
    
    function NotCorrect() public view senderIs(_rootRepo){
        tvm.accept();
        getMoney(_pubkey);
        if (_diff != address.makeAddrNone()) { DiffC(_diff).cancelCommit{value : 0.2 ton, flag: 1}(); }
    }
    
    function getAcceptedDiff(Diff value0, uint128 index) public view senderIs(getDiffAddress(_nameCommit, index)){
        value0;
        getMoney(_pubkey);
    }
        
    function _checkChain(uint256 pubkey,
        string branchName,
        address branchCommit,
        address newC) public view senderIs(address(this)) {
        if (branchCommit  == address(this)) {
                Commit(newC).ChainAccept{value: 0.3 ton, bounce: true }(_nameCommit, branchCommit, newC);
        }
        else {
            if (_parents.length == 0) { Commit(newC).cancelCommit{value: 0.2 ton, flag: 1}(_nameCommit); return; }
            Commit(_parents[0]).CommitCheckCommit{value: 0.3 ton, bounce: true }(pubkey, _nameCommit, branchName, branchCommit , address(this));
        }
        getMoney(pubkey);
    }     
    
    function DiffCheckCommit(uint256 pubkey, address branchCommit) public senderIs(getDiffAddress(_nameCommit, 0)) {
        tvm.accept();    
        _diffcheck = true;
        getMoney(pubkey);
        if (_commitcheck == false) { return; }
        acceptAll(branchCommit);
    }
    
    function ChainAccept(string name, address branchCommit, address newC) public senderIs(branchCommit) {
        tvm.accept();
        require(_buildCommitAddr(name) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(newC == address(this), ERR_WRONG_DATA);
        _commitcheck = true;
        getMoney(_pubkey);
        if (_diffcheck == false) { return; }
        acceptAll(branchCommit);
    }
    
    function acceptAll(address branchCommit) private {
        _commitcheck = false;
        _diffcheck = false;
        Repository(_rootRepo).setCommit{value: 0.3 ton, bounce: true }(_nameBranch, branchCommit, _nameCommit);
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
    
    function getDiffAddress(string commit, uint128 index) private view returns(address) {
        TvmCell s1 = _composeDiffStateInit(commit, index);
        return  address(tvm.hash(s1));
    }
    
    function _composeDiffStateInit(string commit, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeDiff, _rootRepo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: commit, _index: index}});
        return stateInit;
    }
    
    function gotCount(uint128 count) public senderIs(_tree) {
        _count = count;
        _countready = true;
        getMoney(_pubkey);
    }
    
    //Fallback/Receive
    receive() external view {
        if (msg.sender == _tree) {
            DiffC(_diff).cancelCommit{value : 0.2 ton, flag: 1}();
        }
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
    
    function getDiffAdress() external view returns(address) {
        return _diff;
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
