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

import "./smv/modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "./goshwallet.sol";
import "./commit.sol";
import "./tree.sol";
import "./snapshot.sol";
import "./diff.sol";
import "./goshdao.sol";

/* Root contract of Tree */
contract Tree is Modifiers {
    string constant version = "4.0.0";

    uint256 _shaTreeLocal;
    mapping(uint256 => TreeObject) _tree;
    string static _shaTree;
    address static _repo;
    address _pubaddr;
    address _systemcontract;
    address _goshdao;
    mapping(uint8 => TvmCell) _code;
    uint128 _needAnswer = 0;
    bool _check = false;
    bool _root = false;
    string _checkbranch;
    address _checkaddr;
    bool _flag = false;
    optional(PauseTree) _saved;

    uint128 _number = 0;
    uint128 _neednumber;
    bool _isReady = false;
    uint128 timeMoney = 0; 
    
    constructor(
        address pubaddr,
        mapping(uint256 => TreeObject) data,
        address rootGosh,
        address goshdao,
        TvmCell WalletCode,
        TvmCell codeDiff,
        TvmCell codeTree,
        TvmCell codeCommit,
        TvmCell SnapshotCode,
        uint128 number,
        uint128 index) {
        require(_shaTree != "", ERR_NO_DATA);
        tvm.accept();
        _code[m_WalletCode] = WalletCode;
        _code[m_SnapshotCode] = SnapshotCode;
        _pubaddr = pubaddr;
        _systemcontract = rootGosh;
        _goshdao = goshdao;
        _neednumber = number;
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        _code[m_DiffCode] = codeDiff;
        _code[m_TreeCode] = codeTree;
        _code[m_CommitCode] = codeCommit;
        this.addTreeself{value: 0.2 ton, flag: 1}(uint256(0), data);
        getMoney();
    }

    function addTree(address pubaddr, uint128 index, mapping(uint256 => TreeObject) tree1) public {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        require(_isReady == false, ERR_PROCCESS_END);
        getMoney();
        this.addTreeself{value: 0.2 ton, flag: 1}(uint256(0), tree1);
    }

    function addTreeself(uint256 index, mapping(uint256 => TreeObject) tree1) public senderIs(address(this)){
        tvm.accept();
        if (_isReady == true) { return; }
        optional(uint256, TreeObject) res = tree1.next(index);
        if (res.hasValue()) {
            TreeObject obj;
            (index, obj) = res.get();
            if (_tree.exists(index) == false) { 
                _number += 1; 
                if (_neednumber == _number) {
                    _isReady = true;   
                }
            }
            _tree[index] = obj;
            this.addTreeself{value: 0.2 ton, flag: 1}(index, tree1);
        }
    }

    function checkFull(string namecommit, address repo, string branch, uint128 typer) public senderIs(GoshLib.calculateCommitAddress(_code[m_CommitCode], repo, namecommit)) {
        require(_check == false, ERR_PROCCESS_IS_EXIST);
        require(_isReady == true, ERR_PROCCESS_END);
        _check = true;
        _checkbranch = branch;
        _root = true;
        _checkaddr = msg.sender;
        getMoney();
        this.checkTree{value: 0.2 ton, flag: 1}(0, "", typer);
    }

    function checkTree(uint256 index, string path, uint128 typer) public senderIs(address(this)) {
        require(_check == true, ERR_PROCCESS_END);
        require(_isReady == true, ERR_PROCCESS_END);
        getMoney();
        if (address(this).balance < 5 ton) { _saved = PauseTree(index, path, typer); return; }
        optional(uint256, TreeObject) res = _tree.next(index);
        if (res.hasValue()) {
            TreeObject obj;
            (index, obj) = res.get();
            if (obj.mode == "040000") { _needAnswer += 1;
                if (path != "" ) { Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], obj.sha1, _repo)).getCheckTree{value: 0.2 ton, flag: 1}(_shaTree, _checkbranch, path + obj.name, typer); }
                else { Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], obj.sha1, _repo)).getCheckTree{value: 0.2 ton, flag: 1}(_shaTree, _checkbranch, obj.name, typer); }
            }
            else if ((obj.mode == "100644") || (obj.mode == "100664") || (obj.mode == "100755") || (obj.mode == "120000")) {
                _needAnswer += 1;
                if (path != "" ) { Snapshot(GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], _repo, _checkbranch, path + obj.name)).isReady{value: 0.2 ton, flag: 1}(obj.sha256, typer); }
                else { Snapshot(GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], _repo, _checkbranch, obj.name)).isReady{value: 0.2 ton, flag: 1}(obj.sha256, typer); }
            }
            this.checkTree{value: 0.2 ton, flag: 1}(index, path, typer);
        }
    }

    function answerIs(string name, bool _ready, uint128 typer) public senderIs(GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], _repo, _checkbranch, name)) {
        tvm.accept();
        getMoney();
        require(_check == true, ERR_PROCCESS_END);
        require(_needAnswer > 0, ERR_NO_NEED_ANSWER);
        require(_isReady == true, ERR_PROCCESS_END);
        if (_ready == false) {
            if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, false, typer); }
            _check = false;
            _needAnswer = 0;
            return;
        }
        _needAnswer -= 1;
        if (_needAnswer != 0) { return; }
        if (_saved.hasValue() == true) { return; }
        if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, true, typer); }
        else { Commit(_checkaddr).treeAccept{value: 0.1 ton, flag: 1}(_checkbranch, typer); }
        _check = false;
        _needAnswer = 0;
    }

    function getCheckTree(string name, string branch, string path, uint128 typer) public senderIs(GoshLib.calculateTreeAddress(_code[m_TreeCode], name, _repo)) {
        require(_isReady == true, ERR_PROCCESS_END);      tvm.accept();
        path += "/";
        require(_check == false, ERR_PROCCESS_IS_EXIST);
        _check = true;
        _checkbranch = branch;
        _checkaddr = msg.sender;
        _root = false;
        getMoney();
        this.checkTree{value: 0.2 ton, flag: 1}(0, path, typer);
    }

    function gotCheckTree(string name, bool res, uint128 typer) public senderIs(GoshLib.calculateTreeAddress(_code[m_TreeCode], name, _repo)) {
        require(_isReady == true, ERR_PROCCESS_END);
        tvm.accept();
        getMoney();
        if (_check == true) { return; }
        if (_needAnswer > 0) { return; }
        if (res == false) {
            if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, false, typer); }
            _check = false;
            _needAnswer = 0;
            return;
        }
        _needAnswer -= 1;
        if (_needAnswer != 0) { return; }
        if (_saved.hasValue() == true) { return; }
        if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, true, typer); }
        else { Commit(_checkaddr).treeAccept{value: 0.1 ton, flag: 1}(_checkbranch, typer); }
        _check = false;
        _needAnswer = 0;
    }

    function getMoney() private {
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
        if (_flag == true) { return; }
        if (address(this).balance > 300 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneyTree{value : 0.2 ton, flag: 1}(_repo, _shaTree);
    }

    //Fallback/Receive
    receive() external {
        if (msg.sender == _goshdao) {
            _flag = false;
            if (_saved.hasValue() == true) {
                PauseTree val = _saved.get();
                this.checkTree{value: 0.1 ton, flag: 1}(val.index, val.path, val.typer);
                _saved = null;
            }
        }
    }

    onBounce(TvmSlice body) external {
        body;
        if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, false, 0); }
        _check = false;
        _root = false;
        _needAnswer = 0;
    }

    fallback() external {
        if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, false, 0); }
        _check = false;
        _root = false;
        _needAnswer = 0;
    }

    function getShaInfoDiff(string commit, uint128 index1, uint128 index2, Request value0) public {
        require(GoshLib.calculateDiffAddress(_code[m_DiffCode], _repo, commit, index1, index2) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(_isReady == true, ERR_PROCCESS_END);
        tvm.accept();
        getShaInfo(value0);
        getMoney();
    }

    function getShaInfoCommit(string commit, Request value0) public senderIs(GoshLib.calculateCommitAddress(_code[m_CommitCode], _repo, commit)) {
        require(_isReady == true, ERR_PROCCESS_END);
        tvm.accept();
        getShaInfo(value0);
        getMoney();
    }

    function getShaInfoTree(string sha, Request value0) public {
        require(_isReady == false, ERR_PROCCESS_END);
        require(msg.sender == GoshLib.calculateTreeAddress(_code[m_TreeCode], sha, _repo), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        getShaInfo(value0);
        getMoney();
    }

    function getShaInfo(Request value0) private {
        string symbol = '/';
        optional(uint32) pos = value0.lastPath.find(symbol);
        getMoney();
        if (pos.hasValue() == true){
            string nowPath = value0.lastPath.substr(0, pos.get());
            value0.lastPath = value0.lastPath.substr(pos.get() + 1);
            if (_tree.exists(tvm.hash("tree:" + nowPath))) {
                Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], _tree[tvm.hash("tree:" + nowPath)].sha1, _repo)).getShaInfoTree{value: 0.25 ton, flag: 1}(_shaTree, value0);
            }
            else {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.21 ton, flag: 1}(value0, null, _shaTree);
            }
            getMoney();
            return;
        }
        else {
            if (_tree.exists(tvm.hash("blob:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("blob:" + value0.lastPath)], _shaTree);
                return;
            }
            if (_tree.exists(tvm.hash("blobExecutable:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("blobExecutable:" + value0.lastPath)], _shaTree);
                return;
            }
            if (_tree.exists(tvm.hash("link:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("link:" + value0.lastPath)], _shaTree);
                return;
            }
            if (_tree.exists(tvm.hash("commit:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("commit:" + value0.lastPath)], _shaTree);
                return;
            }
            Snapshot(value0.answer).returnTreeAnswer{value: 0.22 ton, flag: 1}(value0, null, _shaTree);
            return;
        }
    }

    function destroy(address pubaddr, uint128 index) public {
        require(_isReady == false, ERR_PROCCESS_END);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        selfdestruct(_systemcontract);
    }

    //Getters
    function getDetails() external view returns(bool, mapping(uint256 => TreeObject), uint256, string, address){
        return (_isReady, _tree, _shaTreeLocal, _shaTree, _pubaddr);
    }
        
    function getTreeIn() public view minValue(0.5 ton) {
        IObject(msg.sender).returnTree{value: 0.1 ton, flag: 1}(_tree, _shaTreeLocal, _shaTree, _pubaddr);
    }

    function gettree() external view returns(mapping(uint256 => TreeObject)) {
        return (_tree);
    }

    function getsha() external view returns(uint256, string) {
        return (_shaTreeLocal, _shaTree);
    }
    
    function getVersion() external pure returns(string, string) {
        return ("tree", version);
    }

    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
