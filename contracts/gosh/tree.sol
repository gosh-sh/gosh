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
import "./libraries/GoshLib.sol";
import "goshwallet.sol";
import "commit.sol";
import "tree.sol";
import "snapshot.sol";
import "diff.sol";

/* Root contract of Tree */
contract Tree is Modifiers {
    string constant version = "0.5.1";
    
    uint256 _shaTreeLocal;
    mapping(uint256 => TreeObject) _tree;
    mapping(uint256 => Compare) _ready;
    mapping(uint256 => address) _readyAddr;
    string static _shaTree;
    address static _repo;
    optional(string) _ipfs;
    uint256 _pubkey;
    address _rootGosh;
    address _goshdao;
    TvmCell m_WalletCode;
    TvmCell m_codeDiff;
    TvmCell m_codeTree;
    TvmCell m_codeCommit;
    TvmCell m_SnapshotCode;
    TreeAnswer[] request;
    
    constructor(
        uint256 pubkey,
        mapping(uint256 => TreeObject) data, 
        optional(string) ipfs, 
        address rootGosh,
        address goshdao,
        uint256 rootPubkey,
        TvmCell WalletCode,
        TvmCell codeDiff,
        TvmCell codeTree,
        TvmCell codeCommit,
        TvmCell SnapshotCode,
        uint128 index) public {
        require(_shaTree != "", ERR_NO_DATA);
        tvm.accept();
        m_WalletCode = WalletCode;
        _pubkey = rootPubkey;
        _rootGosh = rootGosh;
        _goshdao = goshdao;
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED);  
        _ipfs = ipfs;      
        m_codeDiff = codeDiff;
        m_codeTree = codeTree;
        m_codeCommit = codeCommit;
        m_SnapshotCode = SnapshotCode;
        _tree = data;
        getMoney(_pubkey);
    }    
    
    function checkBranch(string branch, string commit) public senderIs(getCommitAddr(commit)) {
        tvm.accept();
        require(_ready.exists(tvm.hash(branch)) == false, ERR_PROCCESS_IS_EXIST);
        _readyAddr[tvm.hash(branch)] = msg.sender;
        this.check{value: 0.2 ton, flag: 1}(branch, commit, 0);
    }
    
    function check(string branch, string commit, uint256 index) public senderIs(address(this)) {
        optional(uint256, TreeObject) res = _tree.next(index);
        if (res.hasValue()) {
            TreeObject obj;
            (index, obj) = res.get();
            _ready[tvm.hash(branch)].value0 += 1; 
            if (obj.mode == "040000") {
                Tree(getTreeAddr(obj.sha1)).checkBranchTree(branch, commit, _shaTree); 
            }
            else { Snapshot(getSnapshotAddr(branch, obj.name)).isReady{value: 0.4 ton, flag: 1}(commit, _shaTree); }
            this.check{value: 0.2 ton, flag: 1}(branch, commit, index + 1);
        }
        getMoney(_pubkey);
    }
    
    function checkBranchTree(string branch, string commit, string sha) public senderIs(getTreeAddr(sha)) {
        _readyAddr[tvm.hash(branch)] = msg.sender;
        require(_ready.exists(tvm.hash(branch)) == false, ERR_PROCCESS_IS_EXIST);
        this.check{value: 0.2 ton, flag: 1}(branch, commit, 0);
    }
    
    function answerSnap(string branch, string name, string commit, bool res) public senderIs(getSnapshotAddr(branch, name)) {
        tvm.accept();
        if (res == true) { _ready[tvm.hash(branch)].value1 += 1; } 
        if (_ready[tvm.hash(branch)].value0 == _ready[tvm.hash(branch)].value1) { 
            if (getCommitAddr(commit) == _readyAddr[tvm.hash(branch)]) { Commit(getCommitAddr(commit)).branchAccept{value: 0.2 ton, flag:1}(branch);  }
            else { Tree(_readyAddr[tvm.hash(branch)]).answerTree{value: 0.2 ton, flag:1}(branch, _shaTree, commit, true); }
            delete _readyAddr[tvm.hash(branch)];
            delete _ready[tvm.hash(branch)];
        }
    }
    
    function answerTree(string branch, string sha, string commit, bool res) public senderIs(getTreeAddr(sha)) {
        tvm.accept();
        if (res == true) { _ready[tvm.hash(branch)].value1 += 1; } 
        if (_ready[tvm.hash(branch)].value0 == _ready[tvm.hash(branch)].value1) { 
            if (getCommitAddr(commit) == _readyAddr[tvm.hash(branch)]) { Commit(getCommitAddr(commit)).branchAccept{value: 0.2 ton, flag:1}(branch); }
            else { Tree(_readyAddr[tvm.hash(branch)]).answerTree{value: 0.2 ton, flag:1}(branch, _shaTree, commit, true); }
            delete _readyAddr[tvm.hash(branch)];
            delete _ready[tvm.hash(branch)];
        }
    }
    
    function getMoney(uint256 pubkey) private view {
        TvmCell s1 = _composeWalletStateInit(pubkey, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        if (address(this).balance > 80 ton) { return; }
        GoshWallet(addr).sendMoneyTree{value : 0.2 ton}(_repo, _shaTree);
    }
    
    function getShaInfoDiff(string commit, uint128 index1, uint128 index2, Request value0) public view {
        require(checkAccessDiff(commit, msg.sender, index1, index2), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        getShaInfo(value0);
        getMoney(_pubkey);
    }    
    
    function getShaInfoCommit(string commit, Request value0) public view senderIs(getCommitAddr(commit)) {
        tvm.accept();
        getShaInfo(value0);
        getMoney(_pubkey);
    }    
    
    function getShaInfoTree(string sha, Request value0) public view {
        require(msg.sender == getTreeAddr(sha), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        getShaInfo(value0);
        getMoney(_pubkey);
    }    
    
    function getShaInfo(Request value0) private view {
        optional(uint32) pos = value0.lastPath.find(byte('/'));
        if (pos.hasValue() == true){
            string nowPath = value0.lastPath.substr(0, pos.get());
            value0.lastPath = value0.lastPath.substr(pos.get() + 1);
            if (_tree.exists(tvm.hash("tree:" + nowPath))) {
                Tree(getTreeAddr(_tree[tvm.hash("tree:" + nowPath)].sha1)).getShaInfoTree{value: 0.25 ton, flag: 1}(_shaTree, value0);
            }
            else {
                Snapshot(value0.answer).TreeAnswer{value: 0.21 ton, flag: 1}(value0, null, _shaTree);
            }
            getMoney(_pubkey);
            return;
        }
        else {
            if (_tree.exists(tvm.hash("blob:" + value0.lastPath)) == false) {
                Snapshot(value0.answer).TreeAnswer{value: 0.22 ton, flag: 1}(value0, null, _shaTree);
            }
            else {
                Snapshot(value0.answer).TreeAnswer{value: 0.23 ton, flag: 1}(value0, _tree[tvm.hash("blob:" + value0.lastPath)], _shaTree);
            }
            getMoney(_pubkey);
            return;
        }
    }
    
    function getSnapshotAddr(string branch, string name) internal view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(m_SnapshotCode, _repo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }
     
    function getCommitAddr(string commit) internal view returns(address) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeCommit, _repo, version);
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
  
    function destroy(uint128 index) public {
        require(checkAccess(msg.pubkey(), msg.sender, index), ERR_SENDER_NO_ALLOWED);
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
}
