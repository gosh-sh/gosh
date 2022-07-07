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
import "diff.sol";

/* Root contract of Tree */
contract Tree is Modifiers {
    string constant version = "0.4.1";
    
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
    
    constructor(
        uint256 pubkey,
        TreeObject[] data, 
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
        if (_ipfs.hasValue() == false) { this.checkCorrect{value: 0.2 ton, flag: 1}(data); }
    }    
    
    function countAll(uint256 pubkey, uint128 index) public {
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED); 
        require(_count == false, ERR_PROCCESS_IS_EXIST);
        _count = true;
        getMoney(_pubkey);
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
        getMoney(_pubkey);
    }
    
    function gotCount(string name, uint128 res) public senderIs(getTreeAddr(name)) {
        tvm.accept();
        require(_countend == true, ERR_PROCCESS_END);
        require(_needAnswer > 0, ERR_NO_NEED_ANSWER);
        _countFiles += res;
        _needAnswer -= 1;
        if (_needAnswer == 0) { _countend = true; this.sendRequests{value: 0.1 ton, flag: 1}(0); }  
        getMoney(_pubkey);
    }
    
    function sendRequests(uint256 index) public senderIs(address(this)) {
        require(index < request.length, NOT_ERR);
        if (request[index].isCommit == true) { Commit(msg.sender).gotCount(_countFiles); }
        else { Tree(msg.sender).gotCount(_shaTree, _countFiles); }
        if (index == request.length - 1) { delete request; return; }
        this.sendRequests{value: 0.1 ton, flag: 1}(index + 1);
        getMoney(_pubkey);
    }
    
    function getCountCommit(string commit, address repo) public senderIs(getCommitAddr(commit, repo)){
        tvm.accept();
        if (_countend == true) { Commit(msg.sender).gotCount(_countFiles); }
        request.push(TreeAnswer(msg.sender, true));
        getMoney(_pubkey);
        return;
    }
    
    function getCountTree(string name) public senderIs(getTreeAddr(name)) {
        tvm.accept();
        if (_countend == true) { Tree(msg.sender).gotCount(_shaTree, _countFiles); }
        request.push(TreeAnswer(msg.sender, false));
        getMoney(_pubkey);
        return;
    }
    
    function getMoney(uint256 pubkey) private view{
        TvmCell s1 = _composeWalletStateInit(pubkey, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        if (address(this).balance > 80 ton) { return; }
        GoshWallet(addr).sendMoneyTree{value : 0.2 ton}(_repo, _shaTree);
        getMoney(_pubkey);
    }
  
    function checkCorrect(TreeObject[] data) public senderIs(address(this)) {
        tvm.accept();
        string allTree;
        bytes byteTree;
        bytes allbytes;
        for (TreeObject value : data) {
            _tree[tvm.hash(value.name)] = value;
            if (value.mode == "040000") { allTree = "40000"; }
            else { allTree = value.mode; } 
            allTree += " " + value.name + "\'0";
            byteTree.append(bytes(allTree));
            byteTree.append(bytes(value.sha1));
        }
        allTree = "tree " + format("{}", byteTree.length) + "\'0";
        allbytes.append(bytes(allTree));
        allbytes.append(byteTree);
        _shaTreeLocal = tvm.hash(allbytes);
        getMoney(_pubkey);
    }
    
    function getShaInfoDiff(string commit, uint128 index, Request value0) public view {
        require(checkAccessDiff(commit, msg.sender, index), ERR_SENDER_NO_ALLOWED);
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
        optional(uint32) pos = value0.lastPath.find(byte('\''));
        if (pos.hasValue() == true){
            string nowPath = value0.lastPath.substr(0, pos.get() - 1);
            value0.lastPath = value0.lastPath.substr(pos.get() + 1);
            if (_tree.exists(tvm.hash(nowPath))) {
                Tree(getTreeAddr(_tree[tvm.hash(nowPath)].sha1)).getShaInfoTree(_shaTree, value0);
            }
            else {
                DiffC(value0.answer).TreeAnswer{value: 0.2 ton, flag: 1}(value0, null);
            }
            getMoney(_pubkey);
            return;
        }
        else {
            if (_tree.exists(tvm.hash(value0.lastPath))) {
                DiffC(value0.answer).TreeAnswer{value: 0.2 ton, flag: 1}(value0, null);
            }
            else {
                DiffC(value0.answer).TreeAnswer{value: 0.2 ton, flag: 1}(value0, _tree[tvm.hash(value0.lastPath)]);
            }
            getMoney(_pubkey);
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
    
    function checkAccessDiff(string commit, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeDiffStateInit(commit, _repo, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function _composeDiffStateInit(string commit, address repo, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeDiff, repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: commit, _index: index}});
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
    
    function gettree() external view returns(mapping(uint256 => TreeObject)) {
        return _tree;
    }
    
    function getsha() external view returns(uint256, string) {
        return (_shaTreeLocal, _shaTree);
    }

    function getVersion() external pure returns(string) {
        return version;
    }
}
