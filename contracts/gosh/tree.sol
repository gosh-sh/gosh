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
import "goshdao.sol";

/* Root contract of Tree */
contract Tree is Modifiers {
    string constant version = "0.10.0";
    
    uint256 _shaTreeLocal;
    mapping(uint256 => TreeObject) _tree;
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
    uint128 _countFiles = 0;
    uint128 _needAnswer = 0;
    bool _count = false;
    bool _countend = false;
    TreeAnswer[] request;
    bool _flag = false;
    
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
        _tree = data;
        getMoney();
    }    
    
    function countAll(uint256 pubkey, uint128 index) public {
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED); 
        require(_count == false, ERR_PROCCESS_IS_EXIST);
        _count = true;
        getMoney();
        this.count{value: 0.2 ton, flag: 1}(0);
    }
    
    function count(uint256 index) public senderIs(address(this)) {
        optional(uint256, TreeObject) res = _tree.next(index);
        if (res.hasValue()) {
            TreeObject obj;
            (index, obj) = res.get();
            if (obj.mode == "040000") { _needAnswer += 1; Tree(getTreeAddr(obj.sha1)).getCountTree(_shaTree); }
            else if ((obj.mode == "100644") || (obj.mode == "100664") || (obj.mode == "100755") || (obj.mode == "120000") || (obj.mode == "160000")) { _countFiles += 1; }
            this.count{value: 0.2 ton, flag: 1}(index + 1);
        }
        getMoney();
    }
    
    function gotCount(string name, uint128 res) public senderIs(getTreeAddr(name)) {
        tvm.accept();
        require(_countend == true, ERR_PROCCESS_END);
        require(_needAnswer > 0, ERR_NO_NEED_ANSWER);
        _countFiles += res;
        _needAnswer -= 1;
        if (_needAnswer == 0) { _countend = true; this.sendRequests{value: 0.1 ton, flag: 1}(0); }  
        getMoney();
    }
    
    function sendRequests(uint256 index) public senderIs(address(this)) {
        require(index < request.length, NOT_ERR);
        if (request[index].isCommit == true) { Commit(msg.sender).gotCount(_countFiles); }
        else { Tree(msg.sender).gotCount(_shaTree, _countFiles); }
        if (index == request.length - 1) { delete request; return; }
        this.sendRequests{value: 0.1 ton, flag: 1}(index + 1);
        getMoney();
    }
    
    function getCountCommit(string commit, address repo) public senderIs(getCommitAddr(commit, repo)){
        tvm.accept();
        if (_countend == true) { Commit(msg.sender).gotCount(_countFiles); }
        request.push(TreeAnswer(msg.sender, true));
        getMoney();
        return;
    }
    
    function getCountTree(string name) public senderIs(getTreeAddr(name)) {
        tvm.accept();
        if (_countend == true) { Tree(msg.sender).gotCount(_shaTree, _countFiles); }
        request.push(TreeAnswer(msg.sender, false));
        getMoney();
        return;
    }
    
    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 100 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneyTree{value : 0.2 ton}(_repo, _shaTree);
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _goshdao) {
            _flag = false;
        }
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
         
    function getCount() external view returns(uint128) {
        return _countFiles;
    }
    
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
