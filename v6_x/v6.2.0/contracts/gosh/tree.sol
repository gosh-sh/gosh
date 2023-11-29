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
import "./libraries/GoshLib.sol";
import "./goshwallet.sol";
import "./commit.sol";
import "./tree.sol";
import "./snapshot.sol";
import "./diff.sol";
import "./goshdao.sol";

/* Root contract of Tree */
contract Tree is Modifiers {
    string constant version = "6.2.0";

    mapping(uint256 => TreeObject) _tree;
    uint256 static _shaInnerTree;
    address static _repo;
    address _pubaddr;
    address _systemcontract;
    address _goshdao;
    mapping(uint8 => TvmCell) _code;
    uint128 _needAnswer = 0;
    bool _check = false;
    bool _root = false;
    string _commitsha;
    address _checkaddr;
    bool _flag = false;
    optional(PauseTree) _saved;
    optional(string) _branch;
    string _shaTree;
    bool _isCorrect = false;
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
        string shaTree,
        uint128 number,
        uint128 index) {
        _shaTree = shaTree;
        tvm.accept();
        require(_shaTree != "", ERR_NO_DATA);
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
        if (_neednumber == 0) { 
            require(_shaInnerTree == 0, ERR_SENDER_NO_ALLOWED);       
            _isReady = true; 
        }
        else { this.addTreeself{value: 0.2 ton, flag: 1}(uint256(0), data); }
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
        getMoney();
        if (_isReady == true) { return; }
        if (_neednumber == _number) { return; }
        for (uint128 i = 0; i < BATCH_SIZE_TREE; i++) {
            optional(uint256, TreeObject) res = tree1.next(index);
            if (res.hasValue()) {
                TreeObject obj;
                (index, obj) = res.get();
                if (_tree.exists(index) == false) { 
                    _tree[index] = obj;
                    _number += 1; 
                    if (_neednumber == _number) {
                        this.calculateInnerTreeHash{value: 0.1 ton, flag: 1}(0, 0);
                        return;
                    }
                }
                if (i + 1 == BATCH_SIZE_TREE_DIFF) { 
                    this.addTreeself{value: 0.2 ton, flag: 1}(index, tree1);
                }
            }
            else {
                if (_neednumber == _number) {
                    this.calculateInnerTreeHash{value: 0.1 ton, flag: 1}(0, 0);
                    return;
                }
            }
        }
    }

    function calculateInnerTreeHash(
        uint256 key,
        uint256 finalhash
    ) public senderIs(address(this)) accept {
        optional(uint256, TreeObject) res = _tree.next(key);
        uint128 index = 0;
        uint256 newkey;
        TreeObject data;
        while (res.hasValue()) {
            (newkey, data) = res.get();
            index = index + 1;
            finalhash = tvm.hash(abi.encode(finalhash, data));
            if (index == 3) {
                index = 0;
                this.calculateInnerTreeHash{value: 0.1 ton, flag: 1}(newkey, finalhash);
                return;
            }
            res = _tree.next(newkey);
        }
        if (finalhash != _shaInnerTree) { selfdestruct(_systemcontract); return; }
        _isReady = true;   
    }

    function SendDiff2(string namecommit, string branch, address branchcommit, uint128 number, uint128 numberCommits, optional(ConfigCommit) task, bool isUpgrade) public senderIs(GoshLib.calculateCommitAddress(_code[m_CommitCode], _repo, namecommit)){
        tvm.accept();
        getMoney();        
        require(_isReady == true, ERR_PROCCESS_END);
        Commit(msg.sender).SendDiff3{value: 0.1 ton, flag: 1}(branch, branchcommit, number, numberCommits, task, isUpgrade);
    }

    function checkFull(string namecommit, optional(string) branch, address repo, string commitsha, uint128 typer, optional(address) branchcommit) public senderIs(GoshLib.calculateCommitAddress(_code[m_CommitCode], repo, namecommit)) {
        if (_isCorrect == true) {
            if (typer == TYPE_SET_COMMIT) 
            {
                Commit(msg.sender).treeAcceptAfterCommit{value: 0.1 ton, flag: 1}(branch.get(), branchcommit.get()); 
            }
            else
            {
                Commit(msg.sender).treeAccept{value: 0.1 ton, flag: 1}(_commitsha, branch, branchcommit, typer); 
            }
        }
        require(_check == false, ERR_PROCCESS_IS_EXIST);
        require(_isReady == true, ERR_PROCCESS_END);
        _branch = branch;
        _check = true;
        _commitsha = commitsha;
        _root = true;
        _checkaddr = msg.sender;
        getMoney();
        this.checkTree{value: 0.2 ton, flag: 1}(0, "", typer, commitsha, branchcommit);
    }

    function checkTree(uint256 index, string path, uint128 typer, string commitsha, optional(address) branchcommit) public senderIs(address(this)) {
        require(_check == true, ERR_PROCCESS_END);
        require(_isReady == true, ERR_PROCCESS_END);
        getMoney();
        if (address(this).balance < 5 ton) { _saved = PauseTree(index, path, typer, commitsha, branchcommit); return; }
        optional(uint256, TreeObject) res = _tree.next(index);
        if (res.hasValue()) {
            TreeObject obj;
            (index, obj) = res.get();
            if (typer == TYPE_SET_CORRECT) {
                if (obj.mode == "040000") { _needAnswer += 1;
                    if (path != "" ) { Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], obj.tvmshatree.get(), _repo)).setCorrectTree{value: 0.2 ton, flag: 1}(_shaInnerTree, path + obj.name); }
                    else { Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], obj.tvmshatree.get(), _repo)).setCorrectTree{value: 0.2 ton, flag: 1}(_shaInnerTree, obj.name); }
                }
            }
            else {
                if (obj.mode == "040000") { _needAnswer += 1;
                    if (path != "" ) { Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], obj.tvmshatree.get(), _repo)).getCheckTree{value: 0.2 ton, flag: 1}(_shaInnerTree, commitsha, path + obj.name, branchcommit, typer); }
                    else { Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], obj.tvmshatree.get(), _repo)).getCheckTree{value: 0.2 ton, flag: 1}(_shaInnerTree, commitsha, obj.name, branchcommit, typer); }
                }
                else if ((obj.mode == "100644") || (obj.mode == "100664") || (obj.mode == "100755") || (obj.mode == "120000")) {
                    _needAnswer += 1;
                    if ((typer == TYPE_INITUPGRADE) || (typer == TYPE_DESTROY_BRANCH) || (typer == TYPE_SET_COMMIT)) {
                        if (path != "" ) { Snapshot(GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], _repo, obj.commit, path + obj.name)).isReady{value: 0.2 ton, flag: 1}(obj.tvmshafile.get(), branchcommit, typer); }
                        else { Snapshot(GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], _repo, obj.commit, obj.name)).isReady{value: 0.2 ton, flag: 1}(obj.tvmshafile.get(), branchcommit, typer); }
                    }
                    else {
                        if (path != "" ) { Snapshot(GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], _repo, commitsha, path + obj.name)).isReady{value: 0.2 ton, flag: 1}(obj.tvmshafile.get(), branchcommit, typer); }
                        else { Snapshot(GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], _repo, commitsha, obj.name)).isReady{value: 0.2 ton, flag: 1}(obj.tvmshafile.get(), branchcommit, typer); }
                    }
                }
            }
            this.checkTree{value: 0.2 ton, flag: 1}(index, path, typer, commitsha, branchcommit);
        }
        if (_needAnswer == 0) {
            if (_root == false) { _isCorrect = true; Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaInnerTree, true, branchcommit, typer); }
            else { 
                _isCorrect = true; 
                if (typer == TYPE_SET_COMMIT) 
                {
                    Commit(_checkaddr).treeAcceptAfterCommit{value: 0.1 ton, flag: 1}(_branch.get(), branchcommit.get()); 
                }
                else
                {
                    Commit(_checkaddr).treeAccept{value: 0.1 ton, flag: 1}(_commitsha, _branch, branchcommit, typer); 
                }
            }
            _check = false;
            _needAnswer = 0;
        }
    }

    function answerIs(string name, bool _ready, optional(address) branchcommit, uint128 typer, string baseCommit) public {
        if (msg.sender != GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], _repo, baseCommit, name)) {
            require(msg.sender == GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], _repo, "//PINTAG//" + baseCommit, name), ERR_INVALID_SENDER);
        }
        tvm.accept();
        getMoney();
        require(_check == true, ERR_PROCCESS_END);
        require(_needAnswer > 0, ERR_NO_NEED_ANSWER);
        require(_isReady == true, ERR_PROCCESS_END);
        if (_ready == false) {
            if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaInnerTree, false, branchcommit, typer); }
            _check = false;
            _needAnswer = 0;
            return;
        }
        _needAnswer -= 1;
        if (_needAnswer != 0) { return; }
        if (_saved.hasValue() == true) { return; }
        if (_root == false) { _isCorrect = true; Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaInnerTree, true, branchcommit, typer); }
        else 
        { 
            _isCorrect = true;  
            if (typer == TYPE_SET_COMMIT) 
            {
                Commit(_checkaddr).treeAcceptAfterCommit{value: 0.1 ton, flag: 1}(_branch.get(), branchcommit.get()); 
            }
            else
            {
                Commit(_checkaddr).treeAccept{value: 0.1 ton, flag: 1}(_commitsha, _branch, branchcommit, typer); 
            } 
        }
        _check = false;
        _needAnswer = 0;
    }

    function getCheckTree(uint256 shainnertree, string commitsha, string path, optional(address) branchcommit, uint128 typer) public senderIs(GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, _repo)) {
        require(_isReady == true, ERR_PROCCESS_END);      tvm.accept();
        if (_isCorrect == true) {
            if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaInnerTree, true, branchcommit, typer); }
            else 
            { 
                if (typer == TYPE_SET_COMMIT) 
                {
                    Commit(_checkaddr).treeAcceptAfterCommit{value: 0.1 ton, flag: 1}(_branch.get(), branchcommit.get()); 
                }
                else
                {
                    Commit(_checkaddr).treeAccept{value: 0.1 ton, flag: 1}(_commitsha, _branch, branchcommit, typer); 
                } 
            }
        }
        path += "/";
        require(_check == false, ERR_PROCCESS_IS_EXIST);
        _check = true;
        _commitsha = commitsha;
        _checkaddr = msg.sender;
        _root = false;
        getMoney();
        this.checkTree{value: 0.2 ton, flag: 1}(0, path, typer, commitsha, branchcommit);
    }

    function gotCheckTree(uint256 shainnertree, bool res, optional(address) branchcommit, uint128 typer) public senderIs(GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, _repo)) {
        require(_isReady == true, ERR_PROCCESS_END);
        tvm.accept();
        getMoney();
        if (_check == false) { return; }
        if (res == false) {
            if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaInnerTree, false, branchcommit, typer); }
            _check = false;
            _needAnswer = 0;
            return;
        }
        _needAnswer -= 1;
        if (_needAnswer != 0) { return; }
        if (_saved.hasValue() == true) { return; }
        if (_root == false) { _isCorrect = true; Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaInnerTree, true, branchcommit, typer); }
        else { 
            _isCorrect = true; 
            if (typer == TYPE_SET_COMMIT) 
            {
                Commit(_checkaddr).treeAcceptAfterCommit{value: 0.1 ton, flag: 1}(_branch.get(), branchcommit.get()); 
            }
            else
            {
                Commit(_checkaddr).treeAccept{value: 0.1 ton, flag: 1}(_commitsha, _branch, branchcommit, typer); 
            } 
        }    
        _check = false;
        _needAnswer = 0;
    }

    function setCorrect(string namecommit) public senderIs(GoshLib.calculateCommitAddress(_code[m_CommitCode], _repo, namecommit)) accept {
        _isCorrect = true;
        this.checkTree{value: 0.2 ton, flag: 1}(0, "", TYPE_SET_CORRECT, "", null);
    }

    function setCorrectTree(uint256 shainnertree, string path) public senderIs(GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, _repo)) accept {
        _isCorrect = true;
        this.checkTree{value: 0.2 ton, flag: 1}(0, path, TYPE_SET_CORRECT, "", null);
    }

    function getMoney() private {
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
        if (_flag == true) { return; }
        if (address(this).balance > 300 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneyTree{value : 0.2 ton, flag: 1}(_repo, _shaInnerTree);
    }

    //Fallback/Receive
    receive() external {
        if (msg.sender == _goshdao) {
            _flag = false;
            if (_saved.hasValue() == true) {
                PauseTree val = _saved.get();
                this.checkTree{value: 0.1 ton, flag: 1}(val.index, val.path, val.typer, val.branch, val.branchcommit);
                _saved = null;
            }
        }
    }

    onBounce(TvmSlice body) external {
        body;
        if (_root == false) {  
            address zeroaddr; 
            if (_checkaddr != zeroaddr) { 
                Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaInnerTree, false, null, 0); 
            }
        }
        _check = false;
        _root = false;
        _needAnswer = 0;
    }

    fallback() external {
        if (_root == false) {  
            address zeroaddr; 
            if (_checkaddr != zeroaddr) { 
                Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaInnerTree, false, null, 0); 
            }
        }
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

    function getShaInfoTree(uint256 shainnertree, Request value0) public {
        require(_isReady == true, ERR_PROCCESS_END);
        require(msg.sender == GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, _repo), ERR_SENDER_NO_ALLOWED);
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
                Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], _tree[tvm.hash("tree:" + nowPath)].tvmshatree.get(), _repo)).getShaInfoTree{value: 0.25 ton, flag: 1}(_shaInnerTree, value0);
            }
            else {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.21 ton, flag: 1}(value0, null, _shaInnerTree);
            }
            getMoney();
            return;
        }
        else {
            if (_tree.exists(tvm.hash("blob:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("blob:" + value0.lastPath)], _shaInnerTree);
                return;
            }
            if (_tree.exists(tvm.hash("blobExecutable:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("blobExecutable:" + value0.lastPath)], _shaInnerTree);
                return;
            }
            if (_tree.exists(tvm.hash("link:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("link:" + value0.lastPath)], _shaInnerTree);
                return;
            }
            if (_tree.exists(tvm.hash("commit:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).returnTreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("commit:" + value0.lastPath)], _shaInnerTree);
                return;
            }
            Snapshot(value0.answer).returnTreeAnswer{value: 0.22 ton, flag: 1}(value0, null, _shaInnerTree);
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
        return (_isReady, _tree, _shaInnerTree, _shaTree, _pubaddr);
    }
        
    function getTreeIn() public view minValue(0.5 ton) {
        IObject(msg.sender).returnTree{value: 0.1 ton, flag: 1}(_tree, _shaInnerTree, _shaTree, _pubaddr);
    }

    function gettree() external view returns(mapping(uint256 => TreeObject)) {
        return (_tree);
    }

    function getsha() external view returns(uint256) {
        return _shaInnerTree;
    }
    
    function getVersion() external pure returns(string, string) {
        return ("tree", version);
    }

    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
