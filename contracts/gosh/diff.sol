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
    string constant version = "0.4.1";
    
    uint128 static _index;
    string static _nameCommit;
    uint256 _pubkey;
    address _rootRepo;
    address _goshdao;
    string _nameBranch;
    string _commit;
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

    constructor(address goshdao, 
        address rootGosh, 
        uint256 value0,
        uint256 value1, 
        string nameRepo, 
        string nameBranch, 
        address branchcommit,
        string commit, 
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
        _name = nameRepo;
        _rootGosh = rootGosh;
        _goshdao = goshdao;
        _pubkey = value0;
        _rootRepo = repo;
        _nameBranch = nameBranch;
        _branchcommit = branchcommit;
        _commit = commit;
        m_WalletCode = WalletCode;
        m_codeDiff = codeDiff;
        m_CommitCode = CommitCode;
        _diff = diffs;
        _last = last;
        require(checkAccess(value1, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        getMoney(_pubkey);
    }
    
    //TODO ask sha from tree and compare
    
    function getMoney(uint256 pubkey) private view{
        TvmCell s1 = _composeWalletStateInit(pubkey, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        if (address(this).balance > 80 ton) { return; }
        GoshWallet(addr).sendMoneyDiff{value : 0.2 ton}(_rootRepo, _nameCommit, _index);
    }
    
    function checkAccess(uint256 pubkey, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubkey, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function checkAllAccess(address sender) private view returns(bool) {
        if (_buildCommitAddr(_nameCommit) == sender) { return true; }
        if (_index == 0) { return false; }
        if (getDiffAddress(_index - 1) == sender) { return true; }
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
    function TreeAnswer(Request value0, optional(TreeObject) value1) public pure {
        tvm.accept();    
        value0; value1;
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
    function sendDiffAll() public view {
        tvm.accept();
        require(checkAllAccess(msg.sender), ERR_SENDER_NO_ALLOWED);
        this.sendDiff{value: 0.1 ton, flag: 1}(0);
        getMoney(_pubkey);
    }
    
    function sendDiff(
        uint128 index) public view senderIs(address(this)) {
        tvm.accept();
        if (index > _diff.length) { return; }
        if (index == _diff.length) { 
            if (_last == false) { 
                DiffC(getDiffAddress(_index + 1)).sendDiffAll{value : 0.2 ton, flag: 1}();
            }
            return; 
        }
        Snapshot(_diff[index].snap).applyDiff{value : 0.2 ton, flag: 1}(_nameCommit, _diff[index], _index);
        getMoney(_pubkey);
        this.sendDiff{value: 0.1 ton, flag: 1}(index + 1);
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
        if (res != true) { this.cancelDiff{value: 0.1 ton, flag: 1}(0); return; }
        Commit(_buildCommitAddr(commit)).getTreeSha{value: 0.2 ton, flag: 1}(_nameCommit, _index);
    
    }
    
    function approveDiffFinal(string commit, bool res) public senderIs(_buildCommitAddr(commit)) {
        tvm.accept();
        getMoney(_pubkey);
        if (res != true) { this.cancelDiff{value: 0.1 ton, flag: 1}(0); return; }
        _approved += 1;
        if (_approved == _diff.length) {
            if (_index == 0) { Commit(_buildCommitAddr(_nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(_pubkey, _nameCommit, _nameBranch, _branchcommit, _buildCommitAddr(_nameCommit));  } 
            else { DiffC(getDiffAddress(_index - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(true);  }
        }
        getMoney(_pubkey);
    }
    
    function approveDiffDiff(bool res) public senderIs(getDiffAddress(_index + 1)){
        tvm.accept();
        if (res != true) { this.cancelDiff{value: 0.1 ton, flag: 1}(0); return; }
        getMoney(_pubkey);
        _approved += 1;
        if (_approved == _diff.length) {
            if (_index == 0) { Commit(_buildCommitAddr(_nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(_pubkey, _nameCommit, _nameBranch, _branchcommit, _buildCommitAddr(_nameCommit));  } 
            else { DiffC(getDiffAddress(_index - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(true); selfdestruct(_buildCommitAddr(_nameCommit));}
        }
        getMoney(_pubkey);
    }
    
    function applyDiff(
        uint128 index) public senderIs(address(this)) {
        tvm.accept();
        if (index > _diff.length) { delete _diff; return; }
        if (index == _diff.length) { 
            if (_last == true) { return; }
            DiffC(getDiffAddress(_index + 1)).allCorrect{value : 0.2 ton, flag: 1}();
            selfdestruct(_buildCommitAddr(_nameCommit)); return;
        }
        Snapshot(_diff[index].snap).approve{value : 0.2 ton, flag: 1}();
        Commit(_buildCommitAddr(_diff[index].commit)).getAcceptedDiff{value : 0.2 ton, flag: 1}(_diff[index], index);
        getMoney(_pubkey);
        this.applyDiff{value: 0.1 ton, flag: 1}(index + 1);
    }
    
    function cancelDiff(
        uint128 index) public senderIs(address(this)) {
        tvm.accept();
        if (_last == false) { DiffC(getDiffAddress(_index + 1)).cancelCommit{value : 0.2 ton, flag: 1}(); }
        if (index > _diff.length) { delete _diff; _approved = 0; return; }
        if (index == _diff.length) { 
            _approved = 0;
            selfdestruct(_buildCommitAddr(_nameCommit)); return;
        }
        Snapshot(_diff[index].snap).cancelDiff{value : 0.2 ton, flag: 1}();
        getMoney(_pubkey);
        this.cancelDiff{value: 0.1 ton, flag: 1}(index + 1);
    }
    
    function getDiffAddress(uint128 index) private view returns(address) {
        TvmCell s1 = _composeDiffStateInit(index);
        return  address(tvm.hash(s1));
    }
    
    function _composeDiffStateInit(uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeDiff, _rootRepo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: _nameCommit, _index: index}});
        return stateInit;
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
        return getDiffAddress(_index + 1);
    }
    
    function getVersion() external pure returns(string) {
        return version;
    }
}
