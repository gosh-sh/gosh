// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity =0.64.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./modifiers/modifiers.sol";
import "./libraries/GoshLib.sol";
import "goshwallet.sol";
import "commit.sol";
import "tree.sol";
import "snapshot.sol";
import "diff.sol";
import "goshdao.sol";

struct PauseTree {
    uint256 index;
    string path;
}

/* Root contract of Tree */
contract Tree is Modifiers {
    string constant version = "0.11.0";
    
    uint256 _shaTreeLocal;
    mapping(uint256 => TreeObject) _tree;
    string static _shaTree;
    address static _repo;
    optional(string) _ipfs;
    address _pubaddr;
    address _goshroot;
    address _goshdao;
    TvmCell m_WalletCode;
    TvmCell m_codeDiff;
    TvmCell m_codeTree;
    TvmCell m_codeCommit;
    TvmCell m_SnapshotCode;
    uint128 _needAnswer = 0;
    bool _check = false;
    bool _root = false;
    string _checkbranch;
    address _checkaddr;
    bool _flag = false;
    optional(PauseTree) _saved; 
    
    constructor(
        address pubaddr,
        mapping(uint256 => TreeObject) data, 
        optional(string) ipfs, 
        address rootGosh,
        address goshdao,
        TvmCell WalletCode,
        TvmCell codeDiff,
        TvmCell codeTree,
        TvmCell codeCommit,
        TvmCell SnapshotCode,
        uint128 index) public {
        require(_shaTree != "", ERR_NO_DATA);
        tvm.accept();
        m_WalletCode = WalletCode;
        m_SnapshotCode = SnapshotCode;
        _pubaddr = pubaddr;
        _goshroot = rootGosh;
        _goshdao = goshdao;
        require(checkAccess(_pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);  
        _ipfs = ipfs;      
        m_codeDiff = codeDiff;
        m_codeTree = codeTree;
        m_codeCommit = codeCommit;
        _tree = data;
        getMoney();
    }    
    
    function checkFull(string namecommit, address repo, string branch) public senderIs(getCommitAddr(namecommit, repo)) {
        require(_check == false, ERR_PROCCESS_IS_EXIST);
        _check = true;
        _checkbranch = branch;
        _root = true;
        _checkaddr = msg.sender;
        getMoney();
        this.checkTree{value: 0.2 ton, flag: 1}(0, "");
    }
    
    function checkTree(uint256 index, string path) public senderIs(address(this)) {
        require(_check == true, ERR_PROCCESS_END);
        if (address(this).balance < 5 ton) { _saved = PauseTree(index, path); return; }
        optional(uint256, TreeObject) res = _tree.next(index);
        if (res.hasValue()) {
            TreeObject obj;
            (index, obj) = res.get();
            if (obj.mode == "040000") { _needAnswer += 1; 
                if (path != "" ) { Tree(getTreeAddr(obj.sha1)).getCheckTree{value: 0.2 ton, flag: 1}(_shaTree, _checkbranch, path + obj.name); }
                else { Tree(getTreeAddr(obj.sha1)).getCheckTree{value: 0.2 ton, flag: 1}(_shaTree, _checkbranch, obj.name); }
            }
            else if ((obj.mode == "100644") || (obj.mode == "100664") || (obj.mode == "100755") || (obj.mode == "120000") || (obj.mode == "160000")) { 
                _needAnswer += 1;
                if (path != "" ) { Snapshot(getSnapshotAddr(_checkbranch, path + obj.name)).isReady{value: 0.2 ton, flag: 1}(); }
                else { Snapshot(getSnapshotAddr(_checkbranch, obj.name)).isReady{value: 0.2 ton, flag: 1}(); }
            }
            this.checkTree{value: 0.2 ton, flag: 1}(index + 1, path);
        }
        getMoney();
    }
    
    function answerIs(string name, bool _ready) public senderIs(getSnapshotAddr(_checkbranch, name)) {
        tvm.accept();
        require(_check == true, ERR_PROCCESS_END);
        require(_needAnswer > 0, ERR_NO_NEED_ANSWER);
        if (_ready == false) { 
            if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, false); } 
            _check = false; 
            _needAnswer = 0; 
            getMoney(); 
            return; 
        }
        _needAnswer -= 1;
        if (_needAnswer != 0) { getMoney(); return; }
        if (_saved.hasValue() == true) { return; }
        if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, true); }  
        else { Commit(_checkaddr).treeAccept{value: 0.1 ton, flag: 1}(_checkbranch); }
        getMoney();
    }
    
    function getCheckTree(string name, string branch, string path) public senderIs(getTreeAddr(name)) {
        tvm.accept();
        path += "/";
        require(_check == false, ERR_PROCCESS_IS_EXIST);
        _check = true;
        _checkbranch = branch;
        _checkaddr = msg.sender;
        _root = false;
        getMoney();
        this.checkTree{value: 0.2 ton, flag: 1}(0, path);
    }
    
    function gotCheckTree(string name, bool res) public senderIs(getTreeAddr(name)) {
        tvm.accept();
        require(_check == true, ERR_PROCCESS_END);
        require(_needAnswer > 0, ERR_NO_NEED_ANSWER);
        if (res == false) { 
            if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, false); } 
            _check = false; 
            _needAnswer = 0; 
            getMoney(); 
            return; 
        }
        _needAnswer -= 1;
        if (_needAnswer != 0) { getMoney(); return; }
        if (_saved.hasValue() == true) { return; }
        if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, true); }  
        else { Commit(_checkaddr).treeAccept{value: 0.1 ton, flag: 1}(_checkbranch); }
        getMoney();
    }
    
    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 300 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneyTree{value : 0.2 ton}(_repo, _shaTree);
    }
    
    function getSnapshotAddr(string branch, string name) private view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(m_SnapshotCode, _repo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _goshdao) {
            _flag = false;
            if (_saved.hasValue() == true) {
                PauseTree val = _saved.get();
                this.checkTree{value: 0.1 ton, flag: 1}(val.index, val.path);           
                _saved = null;
            }
        }
    }
    
    onBounce(TvmSlice body) external {
        body;
        if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, false); }
        _check = false;
        _root = false;
        _needAnswer = 0;
    }
    
    fallback() external {
        if (_root == false) { Tree(_checkaddr).gotCheckTree{value: 0.1 ton, flag: 1}(_shaTree, false); }
        _check = false;
        _root = false;
        _needAnswer = 0;
    }
    
    function getShaInfoDiff(string commit, uint128 index1, uint128 index2, Request value0) public {
        require(checkAccessDiff(commit, msg.sender, index1, index2), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        getShaInfo(value0);
        getMoney();
    }    
    
    function getShaInfoCommit(string commit, Request value0) public senderIs(getCommitAddr(commit, _repo)) {
        tvm.accept();
        getShaInfo(value0);
        getMoney();
    }    
    
    function getShaInfoTree(string sha, Request value0) public {
        require(msg.sender == getTreeAddr(sha), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        getShaInfo(value0);
        getMoney();
    }    
    
    function getShaInfo(Request value0) private {
        optional(uint32) pos = value0.lastPath.find(byte('/'));
        getMoney();
        if (pos.hasValue() == true){
            string nowPath = value0.lastPath.substr(0, pos.get());
            value0.lastPath = value0.lastPath.substr(pos.get() + 1);
            if (_tree.exists(tvm.hash("tree:" + nowPath))) {
                Tree(getTreeAddr(_tree[tvm.hash("tree:" + nowPath)].sha1)).getShaInfoTree{value: 0.25 ton, flag: 1}(_shaTree, value0);
            }
            else {
                Snapshot(value0.answer).TreeAnswer{value: 0.21 ton, flag: 1}(value0, null, _shaTree);
            }
            getMoney();
            return;
        }
        else {
            if (_tree.exists(tvm.hash("blob:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).TreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("blob:" + value0.lastPath)], _shaTree);
                return;
            }
            if (_tree.exists(tvm.hash("blobExecutable:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).TreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("blobExecutable:" + value0.lastPath)], _shaTree);
                return;
            }
            if (_tree.exists(tvm.hash("link:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).TreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("link:" + value0.lastPath)], _shaTree);
                return;
            }
            if (_tree.exists(tvm.hash("commit:" + value0.lastPath)) == true) {
                Snapshot(value0.answer).TreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("commit:" + value0.lastPath)], _shaTree);
                return;
            }
            Snapshot(value0.answer).TreeAnswer{value: 0.22 ton, flag: 1}(value0, null, _shaTree);
            return;
        }
    }
     
    function getCommitAddr(string commit, address repo) internal view returns(address) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeCommit, repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: commit}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }
    
    function getTreeAddr(string sha) private view returns(address) {
        TvmCell deployCode = GoshLib.buildTreeCode(m_codeTree, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaTree: sha, _repo: _repo}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }
    
    function checkAccessDiff(string commit, address sender, uint128 index1, uint128 index2) internal view returns(bool) {
        TvmCell s1 = _composeDiffStateInit(commit, _repo, index1, index2);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function _composeDiffStateInit(string commit, address repo, uint128 index1, uint128 index2) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeDiff, repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: commit, _index1: index1, _index2: index2}});
        return stateInit;
    }

    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(m_WalletCode, pubaddr, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_goshroot : _goshroot, _goshdao: _goshdao, _index: index}
        });
        return _contractflex;
    }
  
    function destroy(address pubaddr, uint128 index) public {
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(msg.sender);
    }
    
    //Getters
    
    function gettree() external view returns(mapping(uint256 => TreeObject), optional(string)) {
        return (_tree, _ipfs);
    }
    
    function getsha() external view returns(uint256, string) {
        return (_shaTreeLocal, _shaTree);
    }

    function getVersion() external pure returns(string) {
        return version;
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
