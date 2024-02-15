// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./smv/modifiers/modifiers.sol";
import "goshwallet.sol";
import "commit.sol";
import "snapshot.sol";
import "repository.sol";
import "tree.sol";
import "goshdao.sol";
import "./libraries/GoshLib.sol";

/* Root contract of Diff */
contract DiffC is Modifiers {
    string constant version = "6.3.0";
    
    uint128 static _index1;
    uint128 static _index2;
    uint128 _index2max;
    string static _nameCommit;
    address _pubaddr;
    address _rootRepo;
    address _goshdao;
    string _nameBranch;
    string _name;
    bool check = false;
    Diff[] _diff;
    string _timebranch;
    mapping(uint8 => TvmCell) _code;
    address _systemcontract;
    uint128 _approved = 0;
    string _branchName;
    address _branchcommit;
    address _newC;
    bool _last;
    bool _entry;
    bool _flag = false;
    bool _isCancel = false;
    bool _isCorrect = false;
    
    uint128 timeMoney = 0; 
    
    optional(PauseDiff) _saved; 

    constructor(address goshdao, 
        address rootGosh, 
        address pubaddr,
        string nameRepo, 
        string nameBranch, 
        address repo,
        TvmCell WalletCode,
        TvmCell codeDiff,
        TvmCell CommitCode,
        TvmCell TreeCode,
        Diff[] diffs,
        uint128 index,
        bool last
        ) {
        require(_nameCommit != "", ERR_NO_DATA);
        tvm.accept();
        _code[m_TreeCode] = TreeCode;
        _code[m_WalletCode] = WalletCode;         
        _systemcontract = rootGosh;
        _goshdao = goshdao;
        _pubaddr = pubaddr;
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(diffs.length == 1, ERR_WRONG_DATA);
        _name = nameRepo;
        _rootRepo = repo;
        _nameBranch = nameBranch;
        _code[m_DiffCode] = codeDiff;
        _code[m_CommitCode] = CommitCode;
        _diff = diffs;
        _last = last;
        Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _diff[0].commit))
                .getAcceptedContentDiff{value : 0.2 ton, flag: 1}(_nameCommit, _diff[0].sha256, _diff[0].nameSnap, _index1, _index2);
        getMoney();
    }

    function returnTreeAnswer(Request value0, optional(TreeObject) value1, uint256 shainnertree) public senderIs(GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, _rootRepo)) {
        if (value1.hasValue() == false) { 
            if (_diff[0].sha256 == 0x96a296d224f285c67bee93c30f8a309157f0daa35dc5b87e410b78630a09cfc7) {
                _isCorrect = true;
                return;
            }
            selfdestruct(_systemcontract); 
            return; 
        }
        if (value1.get().tvmshafile.get() != value0.sha) { selfdestruct(_systemcontract); return; }
        _isCorrect = true;   
    }
    
    function getMoney() private {
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
        if (_flag == true) { return; }
        if (address(this).balance > 10 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneyDiff{value : 0.2 ton, flag: 1}(_rootRepo, _nameCommit, _index1, _index2);
    }
    
    function checkAllAccess(address sender) private view returns(bool) {
        if (address(this) == sender) { return true; }
        if (GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit) == sender) { return true; }
        if (_index2 == 0) { return false; }
        if (GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, _index2 - 1) == sender) { return true; }
        return false;
    }
    
    //Commit part
    function allCorrect(string branch) public {
        tvm.accept();
        require(checkAllAccess(msg.sender), ERR_SENDER_NO_ALLOWED);
        this.applyDiff{value: 0.1 ton, flag: 1}(0, branch);
        _timebranch = branch;
        getMoney();
    }
    
    function cancelCommit() public {
        tvm.accept();
        require(checkAllAccess(msg.sender), ERR_SENDER_NO_ALLOWED);
        _isCancel = true;
        this.cancelDiff{value: 0.1 ton, flag: 1}(0);
        getMoney();
    }
    
    //Diff part        
    function sendDiffAll(string branch, address branchcommit) public {
        tvm.accept();
        require(_entry == false, ERR_DIFF_ALREADY_USED);
        require(checkAllAccess(msg.sender), ERR_SENDER_NO_ALLOWED);
        if (branch != _nameBranch) { 
            Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(branch, branchcommit, _index1, _index2);
            return;
        }
        if ((_index2 == 0) && (_last != true)) { _index2max = 1e25; }
        else { _index2max = 0; }
        _entry = true;
        _branchcommit = branchcommit;
        if (_isCorrect == false) {
            Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(branch, branchcommit, _index1, _index2);
            return; 
        }
        if (_diff.length != 0) { 
            this.sendDiff{value: 0.1 ton, flag: 1}(0, branchcommit);
            getMoney();
            return;
        }
        if (_index2 == 0) { Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(branch, _branchcommit, _index1);  } 
        else { DiffC(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, 0)).approveDiffDiff{value: 0.1 ton, flag: 1}(true, _index2, _last);  }
        getMoney();
    }
    
    function sendDiff(uint128 index, address branchcommit) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (_isCancel == true) { return; }
        if (address(this).balance < 5 ton) { _saved = PauseDiff(0, branchcommit, index); return; }
        if (index > _diff.length) { return; }
        if (index == _diff.length) { 
            if (_last == false) { 
                DiffC(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, _index2 + 1)).sendDiffAll{value : 0.2 ton, flag: 1}(_nameBranch, branchcommit);
            }
            return; 
        }
        Snapshot(_diff[index].snap).applyDiff{value : 0.5 ton, flag: 1}(_nameCommit, _diff[index], _index1, _index2);
        this.sendDiff{value: 0.1 ton, flag: 1}(index + 1, branchcommit);
    }
    
    function approveDiff(bool res, string commit, uint256 sha) public {
        tvm.accept();
        sha;
        commit;
        bool isIt = false;
        for (Diff a : _diff) {
            if (a.snap == msg.sender) { isIt = true; }
        }
        getMoney();
        if (isIt == false) { return; }
        if (res != true) { 
            if (_index2 == 0) { Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1, _index2); }
            else { DiffC(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, 0)).approveDiffDiff{value: 0.1 ton, flag: 1}(false, _index2, _last); }
            return; 
        }
        this.approveDiffFinal{value: 0.2 ton, flag: 1}(true);
    
    }
    
    function approveDiffFinal(bool res) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (res != true) { _isCancel = true; this.cancelDiff{value: 0.1 ton, flag: 1}(0); return; }
        _approved += 1;
        uint256 need = _diff.length;
        if (_approved == need + _index2max) {
            if (_index2 == 0) { Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1);  } 
            else { DiffC(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, 0)).approveDiffDiff{value: 0.1 ton, flag: 1}(true, _index2, _last);  }
        }
        getMoney();
    }
    
    function approveDiffDiff(bool res, uint128 index, bool last) public senderIs(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, index)) {
        if (res != true) { 
            if (_index2 == 0) { 
                Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1, _index2); 
                _isCancel = true;
                this.cancelDiff{value: 0.1 ton, flag: 1}(0); 
            }
            else { DiffC(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, 0)).approveDiffDiff{value: 0.1 ton, flag: 1}(false, _index2, _last); }
            return; 
        }
        getMoney();
        if (last == true) { _index2max = index;}
        _approved += 1;
        uint256 need = _diff.length;
        if (_approved == need + _index2max) {
            if (_index2 == 0) { Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1);  } 
            else { DiffC(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, 0)).approveDiffDiff{value: 0.1 ton, flag: 1}(true, _index2, _last); }
        }
        getMoney();
    }
    
    function applyDiff(uint128 index, string branch) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (address(this).balance < 5 ton) { _saved = PauseDiff(1, address.makeAddrNone(), index); return; }
        if (index > _diff.length) { delete _diff; return; }
        if (index == _diff.length) { 
            if (_last == false) { DiffC(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, _index2 + 1)).allCorrect{value : 0.2 ton, flag: 1}(branch); }
            selfdestruct(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)); return;
        }
        Snapshot(_diff[index].snap).approve{value : 0.2 ton, flag: 1}(_index1, _index2, _diff[index]); 
        Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _diff[index].commit)).getAcceptedDiff{value : 0.2 ton, flag: 1}(_diff[index], _index1, index, _nameBranch);
        this.applyDiff{value: 0.2 ton, flag: 1}(index + 1, _timebranch);
    }
    
    function cancelDiff(uint128 index) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (address(this).balance < 5 ton) { _saved = PauseDiff(2, address.makeAddrNone(), index); return; }
        if (_last == false) { DiffC(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, _index2 + 1)).cancelCommit{value : 0.2 ton, flag: 1}(); }
        if (index > _diff.length) { delete _diff; _approved = 0; return; }
        if (index == _diff.length) { 
            _approved = 0;
            selfdestruct(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)); return;
        }
        Snapshot(_diff[index].snap).cancelDiff{value : 0.2 ton, flag: 1}(_index1, _index2, _diff[index].commit);
        this.cancelDiff{value: 0.2 ton, flag: 1}(index + 1);
    }
    
    function checkSender(uint128 index, address sender) public view senderIs(address(this)) {
        if (index >= _diff.length) { return; }
        if (_diff[index].snap == sender) { Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1, _index2); return; }
        this.checkSender{value: 0.2 ton, flag: 1}(index + 1, msg.sender);
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _goshdao) {
            _flag = false;
            if (_saved.hasValue() == true) {
                PauseDiff val = _saved.get();
                if (val.send == 0) {
                    this.sendDiff{value: 0.1 ton, flag: 1}(val.index, val.branchcommit);
                }
                if (val.send == 1) {
                    this.applyDiff{value: 0.1 ton, flag: 1}(val.index, _timebranch);
                }
                if (val.send == 2) {
                    this.cancelDiff{value: 0.1 ton, flag: 1}(val.index);
                }               
                _saved = null;
            }
        }
    }
    
    onBounce(TvmSlice body) external pure {
        body;
        this.checkSender{value: 0.1 ton, flag: 1}(0, msg.sender);
    }
    
    fallback() external pure {
        this.checkSender{value: 0.1 ton, flag: 1}(0, msg.sender);
    }
    
    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public {
        require(_isCorrect == false, ERR_SENDER_NO_ALLOWED);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        selfdestruct(_systemcontract);
    }
    
    //Getters
    function getdiffs() external view returns(Diff[]) {
        return _diff;
    }

    function getNextAddress() external view returns(address) {
        return GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _nameCommit, _index1, _index2 + 1);
    }

    function getStatus() external view returns(bool) {
        return _isCorrect;
    }
    
    function getVersion() external pure returns(string, string) {
        return ("diff", version);
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
