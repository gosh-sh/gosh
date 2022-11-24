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
import "tree.sol";
import "goshdao.sol";
import "./libraries/GoshLib.sol";

struct PauseDiff {
    uint128 send;
    address branchcommit;
    uint128 index;
}

/* Root contract of Diff */
contract DiffC is Modifiers {
    string constant version = "1.0.0";
    
    uint128 static _index1;
    uint128 static _index2;
    string static _nameCommit;
    address _pubaddr;
    address _rootRepo;
    address _goshdao;
    string _nameBranch;
    string _name;
    bool check = false;
    Diff[] _diff;
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
        Diff[] diffs,
        uint128 index,
        bool last
        ) public {
        require(_nameCommit != "", ERR_NO_DATA);
        tvm.accept();
        _code[m_WalletCode] = WalletCode;         
        _systemcontract = rootGosh;
        _goshdao = goshdao;
        _pubaddr = pubaddr;
        require(checkAccess(_pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _name = nameRepo;
        _rootRepo = repo;
        _nameBranch = nameBranch;
        _code[m_DiffCode] = codeDiff;
        _code[m_CommitCode] = CommitCode;
        _diff = diffs;
        _last = last;
        getMoney();
    }
    
    function getMoney() private {
        if (now - timeMoney > 3600) { _flag = false; timeMoney = now; }
        if (_flag == true) { return; }
        if (address(this).balance > 10 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneyDiff{value : 0.2 ton}(_rootRepo, _nameCommit, _index1, _index2);
    }
    
    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
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
    
    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: { _systemcontract: _systemcontract, _goshdao: _goshdao, _index: index}
        });
        return _contract;
    }
    
    //Tree part
    function TreeAnswer(Request value0, optional(TreeObject) value1, string sha) public pure {
        tvm.accept();    
        value0; value1; sha;
    }
    
    //Commit part
    function allCorrect() public {
        tvm.accept();
        require(checkAllAccess(msg.sender), ERR_SENDER_NO_ALLOWED);
        this.applyDiff{value: 0.1 ton, flag: 1}(0);
        getMoney();
    }
    
    function cancelCommit() public {
        tvm.accept();
        require(checkAllAccess(msg.sender), ERR_SENDER_NO_ALLOWED);
        _isCancel = true;
        this.cancelDiff{value: 0.1 ton, flag: 1}(0);
        getMoney();
    }
    
    function _buildCommitAddr(string commit) private view returns(address) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_CommitCode], _rootRepo, version);
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
            Commit(_buildCommitAddr(_nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(branch, branchcommit, _index1);
            return;
        }
        _entry = true;
        _branchcommit = branchcommit;
        if (_diff.length != 0) { 
            this.sendDiff{value: 0.1 ton, flag: 1}(0, branchcommit);
            getMoney();
            return;
        }
        if (_index2 == 0) { Commit(_buildCommitAddr(_nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(branch, _branchcommit, _index1);  } 
        else { DiffC(getDiffAddress(_index2 - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(true);  }
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
                DiffC(getDiffAddress(_index2 + 1)).sendDiffAll{value : 0.2 ton, flag: 1}(_nameBranch, branchcommit);
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
            if (_index2 == 0) { Commit(_buildCommitAddr(_nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1); }
            else { DiffC(getDiffAddress(_index2 - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(false); }
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
        if (_last == false) { need += 1; }
        if (_approved == need) {
            if (_index2 == 0) { Commit(_buildCommitAddr(_nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1);  } 
            else { DiffC(getDiffAddress(_index2 - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(true);  }
        }
        getMoney();
    }
    
    function approveDiffDiff(bool res) public senderIs(getDiffAddress(_index2 + 1)){
        tvm.accept();
        if (res != true) { 
            if (_index2 == 0) { 
                Commit(_buildCommitAddr(_nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1); 
                _isCancel = true;
                this.cancelDiff{value: 0.1 ton, flag: 1}(0); 
            }
            else { DiffC(getDiffAddress(_index2 - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(false); }
            return; 
        }
        getMoney();
        _approved += 1;
        uint256 need = _diff.length;
        if (_last == false) { need += 1; }
        if (_approved == need) {
            if (_index2 == 0) { Commit(_buildCommitAddr(_nameCommit)).DiffCheckCommit{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1);  } 
            else { DiffC(getDiffAddress(_index2 - 1)).approveDiffDiff{value: 0.1 ton, flag: 1}(true); }
        }
        getMoney();
    }
    
    function applyDiff(uint128 index) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (address(this).balance < 5 ton) { _saved = PauseDiff(1, address.makeAddrNone(), index); return; }
        if (index > _diff.length) { delete _diff; return; }
        if (index == _diff.length) { 
            if (_last == false) { DiffC(getDiffAddress(_index2 + 1)).allCorrect{value : 0.2 ton, flag: 1}(); }
            selfdestruct(_buildCommitAddr(_nameCommit)); return;
        }
        Snapshot(_diff[index].snap).approve{value : 0.2 ton, flag: 1}(_index1, _index2, _diff[index]); 
        Commit(_buildCommitAddr(_diff[index].commit)).getAcceptedDiff{value : 0.2 ton, flag: 1}(_diff[index], _index1, index, _nameBranch);
        this.applyDiff{value: 0.1 ton, flag: 1}(index + 1);
    }
    
    function cancelDiff(uint128 index) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (address(this).balance < 5 ton) { _saved = PauseDiff(2, address.makeAddrNone(), index); return; }
        if (_last == false) { DiffC(getDiffAddress(_index2 + 1)).cancelCommit{value : 0.2 ton, flag: 1}(); }
        if (index > _diff.length) { delete _diff; _approved = 0; return; }
        if (index == _diff.length) { 
            _approved = 0;
            selfdestruct(_buildCommitAddr(_nameCommit)); return;
        }
        Snapshot(_diff[index].snap).cancelDiff{value : 0.2 ton, flag: 1}(_index1, _index2, _diff[index].commit);
        this.cancelDiff{value: 0.1 ton, flag: 1}(index + 1);
    }
    
    function getDiffAddress(uint128 index) private view returns(address) {
        TvmCell s1 = _composeDiffStateInit(index);
        return  address(tvm.hash(s1));
    }
    
    function _composeDiffStateInit(uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_DiffCode], _rootRepo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: _nameCommit, _index1: _index1, _index2: index}});
        return stateInit;
    }
    
    function checkSender(uint128 index, address sender) public view senderIs(address(this)) {
        if (index >= _diff.length) { return; }
        if (_diff[index].snap == sender) { Commit(_buildCommitAddr(_nameCommit)).abortDiff{value: 0.1 ton, flag: 1}(_nameBranch, _branchcommit, _index1); return; }
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
                    this.applyDiff{value: 0.1 ton, flag: 1}(val.index);
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
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(msg.sender);
    }
    
    //Getters
    function getdiffs() external view returns(Diff[]) {
        return _diff;
    }

    function getNextAddress() external view returns(address) {
        return getDiffAddress(_index2 + 1);
    }
    
    function getVersion() external pure returns(string) {
        return version;
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
