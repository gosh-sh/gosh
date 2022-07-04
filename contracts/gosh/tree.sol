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
        uint128 index) public {
        require(_shaTree != "", ERR_NO_DATA);
        tvm.accept();
        _ipfs = ipfs;
        _pubkey = rootPubkey;
        _rootGosh = rootGosh;
        _goshdao = goshdao;
        m_WalletCode = WalletCode;
        m_codeDiff = codeDiff;
        m_codeTree = codeTree;
        require(checkAccess(pubkey, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        if (_ipfs.hasValue() == false) { checkCorrect(data); }
    }    
    
    function getMoney(uint256 pubkey) private view{
        TvmCell s1 = _composeWalletStateInit(pubkey, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        if (address(this).balance > 80 ton) { return; }
        GoshWallet(addr).sendMoneyTree{value : 0.2 ton}(_repo, _shaTree);
    }
    
    function checkCorrect(TreeObject[] data) private {
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
    }
    
    function getShaInfoDiff(string commit, uint128 index, Request value0) public view {
        require(checkAccessDiff(commit, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        getShaInfo(value0);
    }    
    
    function getShaInfoTree(string sha, Request value0) public view {
        require(msg.sender == getTreeAddr(sha), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        getShaInfo(value0);
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
            return;
        }
        else {
            if (_tree.exists(tvm.hash(value0.lastPath))) {
                DiffC(value0.answer).TreeAnswer{value: 0.2 ton, flag: 1}(value0, null);
            }
            else {
                DiffC(value0.answer).TreeAnswer{value: 0.2 ton, flag: 1}(value0, _tree[tvm.hash(value0.lastPath)]);
            }
            return;
        }
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