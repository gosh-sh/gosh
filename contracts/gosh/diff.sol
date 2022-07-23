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
import "tree.sol";
import "./libraries/GoshLib.sol";

/* Root contract of Diff */
contract DiffC is Modifiers {
    string constant version = "0.5.2";
    
    uint128 static _index1;
    uint128 static _index2;
    string static _nameCommit;
    uint256 _pubkey;
    address _rootRepo;
    address _goshdao;
    string _nameBranch;
    string _name;
    bool check = false;
    Diff[] _diff;
    TvmCell m_WalletCode;
    TvmCell m_codeDiff;
    TvmCell m_CommitCode;
    address _rootGosh;
    uint128 _approved = 0;
    string _branchName;
    address _branchcommit;
    address _newC;
    bool _last;
    bool _entry;

    constructor(address goshdao, 
        address rootGosh, 
        uint256 pubkey,
        uint256 pubkeysender, 
        string nameRepo, 
        string nameBranch, 
        address repo,
        TvmCell WalletCode,
        TvmCell codeDiff,
        TvmCell CommitCode,
        Diff[] diffs,
        uint128 index,
        bool last
        ) public {
        require(_nameCommit != "", ERR_NO_DATA);
        tvm.accept();
        m_WalletCode = WalletCode;        
        _rootGosh = rootGosh;
        _goshdao = goshdao;
        _pubkey = pubkey;
        require(checkAccess(pubkeysender, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _name = nameRepo;
        _rootRepo = repo;
        _nameBranch = nameBranch;
        m_codeDiff = codeDiff;
        m_CommitCode = CommitCode;
        _diff = diffs;
        _last = last;
        getMoney(_pubkey);
    }
    
    //TODO ask sha from tree and compare
    
    function getMoney(uint256 pubkey) private view{
        TvmCell s1 = _composeWalletStateInit(pubkey, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        if (address(this).balance > 80 ton) { return; }
        GoshWallet(addr).sendMoneyDiff{value : 0.2 ton}(_rootRepo, _nameCommit, _index1, _index2);
    }
    
    function checkAccess(uint256 pubkey, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubkey, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function checkAllAccess(address sender) private view returns(bool) {
        if (address(this) == sender) { return true; }
        if (_buildCommitAddr(_nameCommit) == sender) { return true; }
        if (_index2 == 0) { return false; }
        if (getDiffAddress(_index2 - 1) == sender) { return true; }
        return false;
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
    
    //Tree part
    function TreeAnswer(Request value0, optional(TreeObject) value1, string sha) public pure {
        tvm.accept();    
        value0; value1; sha;
    }
    
    //Commit part
    function allCorrect() public view {
        tvm.accept();
        require(checkAllAccess(msg.sender), ERR_SENDER_NO_ALLOWED);
        this.applyDiff{value: 0.1 ton, flag: 1}(0);
        getMoney(_pubkey);
    }
    
    function cancelCommit() public view {
        tvm.accept();
        require(checkAllAccess(msg.sender), ERR_SENDER_NO_ALLOWED);
        this.cancelDiff{value: 0.1 ton, flag: 1}(0);
        getMoney(_pubkey);
    }
    
    function _buildCommitAddr(
        string commit
    ) private view returns(address) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_CommitCode, _rootRepo, version);
        TvmCell state = tvm.buildStateInit({
            code: deployCode,
            contr: Commit,
            varInit: { _nameCommit: commit }
        });
        return address(tvm.hash(state));
    }
    
    //Diff part        
    function sendDiffAll(string branch, address branchcommit) public {
        tvm.accept();
        require(_entry == false, ERR_DIFF_ALREADY_USED);
        require(checkAllAccess(msg.sender), ERR_SENDER_NO_ALLOWED);
        if (branch != _nameBranch) { 
            Commit(_buildCommitAddr(_nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(_pubkey, branch, branchcommit, _index1);
            return;
        }
        _entry = true;
        _branchcommit = branchcommit;
        if (_diff.length != 0) { 
            this.sendDiff{value: 0.1 ton, flag: 1}(0, branchcommit);
            getMoney(_pubkey);
            return;
        }
        if (_index2 == 0) { Commit(_buildCommitAddr(_nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(_pubkey, branch, _branchcommit, _index1);  } 
        else { DiffC(getDiffAddress(_index2 - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(true);  }
        getMoney(_pubkey);
    }
    
    function sendDiff(uint128 index, address branchcommit) public view senderIs(address(this)) {
        tvm.accept();
        if (index > _diff.length) { return; }
        if (index == _diff.length) { 
            if (_last == false) { 
                DiffC(getDiffAddress(_index2 + 1)).sendDiffAll{value : 0.2 ton, flag: 1}(_nameBranch, branchcommit);
            }
            return; 
        }
        Snapshot(_diff[index].snap).applyDiff{value : 0.2 ton, flag: 1}(_nameCommit, _diff[index], _index1, _index2);
        getMoney(_pubkey);
        this.sendDiff{value: 0.1 ton, flag: 1}(index + 1, branchcommit);
    }
    
    function approveDiff(bool res, string commit, uint256 sha) public view {
        tvm.accept();
        sha;
        bool isIt = false;
        for (Diff a : _diff) {
            if (a.snap == msg.sender) { isIt = true; }
        }
        getMoney(_pubkey);
        if (isIt == false) { return; }
        if (res != true) { 
            if (_index2 == 0) { Commit(_buildCommitAddr(_nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(_pubkey, _nameBranch, _branchcommit, _index1); }
            else { DiffC(getDiffAddress(_index2 - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(false); }
            return; 
        }
        Commit(_buildCommitAddr(commit)).getTreeSha{value: 0.2 ton, flag: 1}(_nameCommit, _index1, _index2);
    
    }
    
    function approveDiffFinal(string commit, bool res) public senderIs(_buildCommitAddr(commit)) {
        tvm.accept();
        getMoney(_pubkey);
        if (res != true) { this.cancelDiff{value: 0.1 ton, flag: 1}(0); return; }
        _approved += 1;
        uint256 need = _diff.length;
        if (_last == false) { need += 1; }
        if (_approved == need) {
            if (_index2 == 0) { Commit(_buildCommitAddr(_nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(_pubkey, _nameBranch, _branchcommit, _index1);  } 
            else { DiffC(getDiffAddress(_index2 - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(true);  }
        }
        getMoney(_pubkey);
    }
    
    function approveDiffDiff(bool res) public senderIs(getDiffAddress(_index2 + 1)){
        tvm.accept();
        if (res != true) { 
            if (_index2 == 0) { 
                Commit(_buildCommitAddr(_nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(_pubkey, _nameBranch, _branchcommit, _index1); 
                this.cancelDiff{value: 0.1 ton, flag: 1}(0); 
            }
            else { DiffC(getDiffAddress(0)).approveDiffDiff{value: 0.1 ton, flag: 1}(false); }
            return; 
        }
        getMoney(_pubkey);
        _approved += 1;
        uint256 need = _diff.length;
        if (_last == false) { need += 1; }
        if (_approved == need) {
            if (_index2 == 0) { Commit(_buildCommitAddr(_nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(_pubkey, _nameBranch, _branchcommit, _index1);  } 
            else { DiffC(getDiffAddress(_index2 - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(true); }
        }
        getMoney(_pubkey);
    }
    
    function applyDiff(
        uint128 index) public senderIs(address(this)) {
        tvm.accept();
        if (index > _diff.length) { delete _diff; return; }
        if (index == _diff.length) { 
            if (_last == false) { DiffC(getDiffAddress(_index2 + 1)).allCorrect{value : 0.2 ton, flag: 1}(); }
            selfdestruct(_buildCommitAddr(_nameCommit)); return;
        }
        Snapshot(_diff[index].snap).approve{value : 0.2 ton, flag: 1}(_index1, _index2); 
        Commit(_buildCommitAddr(_diff[index].commit)).getAcceptedDiff{value : 0.2 ton, flag: 1}(_diff[index], _index1, index);
        getMoney(_pubkey);
        this.applyDiff{value: 0.1 ton, flag: 1}(index + 1);
    }
    
    function cancelDiff(
        uint128 index) public senderIs(address(this)) {
        tvm.accept();
        if (_last == false) { DiffC(getDiffAddress(_index2 + 1)).cancelCommit{value : 0.2 ton, flag: 1}(); }
        if (index > _diff.length) { delete _diff; _approved = 0; return; }
        if (index == _diff.length) { 
            _approved = 0;
            selfdestruct(_buildCommitAddr(_nameCommit)); return;
        }
        Snapshot(_diff[index].snap).cancelDiff{value : 0.2 ton, flag: 1}(_index1, _index2);
        getMoney(_pubkey);
        this.cancelDiff{value: 0.1 ton, flag: 1}(index + 1);
    }
    
    function getDiffAddress(uint128 index) private view returns(address) {
        TvmCell s1 = _composeDiffStateInit(index);
        return  address(tvm.hash(s1));
    }
    
    function _composeDiffStateInit(uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeDiff, _rootRepo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: _nameCommit, _index1: _index1, _index2: index}});
        return stateInit;
    }
    
    function checkSender(uint128 index, address sender) public view senderIs(address(this)) {
        if (index >= _diff.length) { return; }
        if (_diff[index].snap == sender) { this.cancelCommit{value: 0.1 ton, flag: 1}(); return; }
        this.checkSender{value: 0.2 ton, flag: 1}(index + 1, msg.sender);
    }
    
    //Fallback/Receive
    onBounce(TvmSlice body) external pure {
        body;
        this.checkSender{value: 0.1 ton, flag: 1}(0, msg.sender);
    }
    
    fallback() external pure {
        this.checkSender{value: 0.1 ton, flag: 1}(0, msg.sender);
    }
    
    //Selfdestruct
    function destroy(uint128 index) public {
        require(checkAccess(msg.pubkey(), msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(msg.sender);
    }
    
    //Getters
    function getdiffs() external view returns(Diff[]) {
        return _diff;
    }

    function getNextAdress() external view returns(address) {
        return getDiffAddress(_index2 + 1);
    }
    
    function getVersion() external pure returns(string) {
        return version;
    }
}
