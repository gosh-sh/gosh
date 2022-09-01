// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ton-solidity >=0.61.2;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import "./modifiers/modifiers.sol";
import "goshwallet.sol";

contract Profile is Modifiers {

    string constant version = "0.11.0";
    
    // mapping to store hashes of inbound messages;
    mapping(uint256 => uint32) m_messages;
    LastMsg m_lastMsg;
    // Each transaction is limited by gas, so we must limit count of iteration in loop.
    uint8 constant MAX_CLEANUP_MSGS = 20;

    modifier saveMsg() {
        /* m_messages[m_lastMsg.msgHash] = m_lastMsg.expireAt;
        gc(); */
        _saveMsg();
        _;
    }

    uint256 static _pubkey;

    function _saveMsg() inline internal {
        m_messages[m_lastMsg.msgHash] = m_lastMsg.expireAt;
        gc();
    }

    struct LastMsg {
        uint32 expireAt;
        uint256 msgHash;
    }

    function gc() private {
        uint counter = 0;
        for ((uint256 msgHash, uint32 expireAt) : m_messages) {
            if (counter >= MAX_CLEANUP_MSGS) {
                break;
            }
            counter++;
            if (expireAt <= now) {
                delete m_messages[msgHash];
            }
        }
    }

    
    modifier onlyOwnerPubkeyList() {
        require (_owners.exists(msg.pubkey()) == true, ERR_SENDER_NO_ALLOWED) ;
        _;
    }
    
    address static _goshroot;
    bool _flag = false;
    mapping(uint256 => bool) _owners;

    constructor(
    ) public senderIs(_goshroot) {
        _owners[_pubkey] = true;
//        getMoney();
    }
    
    function addPubkey(
        uint256 pubkey
    ) public onlyOwnerPubkeyList  accept saveMsg {
        _owners[pubkey] = true;
//        getMoney();
    }

    function deletePubkey(
        uint256 pubkey
    ) public onlyOwnerPubkeyList  accept saveMsg {
        delete _owners[pubkey];
//        getMoney();
    }

    //Content part
    function deployContent(
        address wallet,
        string repoName,
        string commit,
        string label,
        string content
    ) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deployContent{value: 0.1 ton, flag : 1}(repoName, commit, label, content);
//        getMoney();
    }
    
    function deployWallet(address wallet) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deployWallet{value: 0.1 ton, flag : 1}();
//        getMoney();
    }

    function destroyWallet(address wallet) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).destroyWallet{value: 0.1 ton, flag : 1}();
//        getMoney();
    }

    //Money part
/*    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 10000 ton) { return; }
        _flag = true;
        GoshRoot(_goshroot).sendMoney{value : 0.2 ton}(_pubaddr, _goshdao, 21000 ton, _index);
    }
*/

    function destroyObject(address wallet, address obj) public onlyOwnerPubkeyList  accept view {
        GoshWallet(wallet).destroyObject{value: 0.1 ton, flag : 1}(obj);
    }

    //Repository part
    function deployRepository(address wallet, string nameRepo) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deployRepository{value: 0.1 ton, flag : 1}(nameRepo);
//        getMoney();
    }

    //Snapshot part
    function deployNewSnapshot(address wallet, string branch, string commit, address repo, string name, bytes snapshotdata, optional(string) snapshotipfs) public onlyOwnerPubkeyList  accept saveMsg{
        GoshWallet(wallet).deployNewSnapshot{value: 0.1 ton, flag : 1}(branch, commit, repo, name, snapshotdata, snapshotipfs);
//        getMoney();
    }

    function deleteSnapshot(address wallet, address snap) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deleteSnapshot{value: 0.1 ton, flag : 1}(snap);
//        getMoney();
    }

    //Diff part
    function deployDiff(
        address wallet,
        string repoName,
        string branchName,
        string commitName,
        Diff[] diffs,
        uint128 index1,
        uint128 index2,
        bool last
    ) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deployDiff{value: 0.1 ton, flag : 1}(repoName, branchName, commitName, diffs, index1, index2, last);
//      getMoney();
    }

    //Commit part
    function deployCommit(
        address wallet,
        string repoName,
        string branchName,
        string commitName,
        string fullCommit,
        address[] parents,
        address tree
    ) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deployCommit{value: 0.1 ton, flag : 1}(repoName, branchName, commitName, fullCommit, parents, tree);
//      getMoney();
    }

    function setCommit(
        address wallet,
        string repoName,
        string branchName,
        string commit,
        uint128 numberChangedFiles
    ) public onlyOwnerPubkeyList accept saveMsg {
        GoshWallet(wallet).setCommit{value: 0.1 ton, flag : 1}(repoName, branchName, commit, numberChangedFiles);
//        getMoney();
    }
    
    //Branch part
    function deployBranch(
        address wallet,
        string repoName,
        string newName,
        string fromCommit
    ) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deployBranch{value: 0.1 ton, flag : 1}(repoName, newName, fromCommit);
    }

    function deleteBranch(
        address wallet,
        string repoName,
        string Name
    ) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deleteBranch{value: 0.1 ton, flag : 1}(repoName, Name);
    }

    function setHEAD(
        address wallet,
        string repoName,
        string branchName
    ) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).setHEAD{value: 0.1 ton, flag : 1}(repoName, branchName);
    }

    //Tag part
    function deployTag(
        address wallet,
        string repoName,
        string nametag,
        string nameCommit,
        string content,
        address commit
    ) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deployTag{value: 0.1 ton, flag : 1}(repoName, nametag, nameCommit, content, commit);
    }

    function deleteTag(address wallet, string repoName, string nametag) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deleteTag{value: 0.1 ton, flag : 1}(repoName, nametag);
    }
    
    //Config
    function updateConfig(address wallet) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).updateConfig{value: 0.1 ton, flag : 1}();
    }  
    
    function setConfig(address wallet, uint128 limit_wallets, uint128 limit_time, uint128 limit_messages) public view onlyOwnerPubkeyList accept {
        GoshWallet(wallet).setConfig{value: 0.1 ton, flag : 1}(limit_wallets, limit_time, limit_messages);
    }
   
    //Tree part
    function deployTree(
        address wallet,
        string repoName,
        string shaTree,
        mapping(uint256 => TreeObject) datatree,
        optional(string) ipfs
    ) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).deployTree{value: 0.1 ton, flag : 1}(repoName, shaTree, datatree, ipfs);
    }

    function startProposalForSetCommit(
        address wallet,
        string repoName,
        string branchName,
        string commit,
        uint128 numberChangedFiles
    ) public onlyOwnerPubkeyList accept saveMsg {
        GoshWallet(wallet).startProposalForSetCommit{value: 0.1 ton, flag : 1}(repoName, branchName, commit, numberChangedFiles);
    }

    function startProposalForAddProtectedBranch(
        address wallet,
        string repoName,
        string branchName
    ) public onlyOwnerPubkeyList accept saveMsg {
        GoshWallet(wallet).startProposalForAddProtectedBranch{value: 0.1 ton, flag : 1}(repoName, branchName);        
    }

    function startProposalForDeleteProtectedBranch(
        address wallet,
        string repoName,
        string branchName
    ) public onlyOwnerPubkeyList accept saveMsg {
        GoshWallet(wallet).startProposalForDeleteProtectedBranch{value: 0.1 ton, flag : 1}(repoName, branchName);  
    }

    function tryProposalResult(address wallet, address proposal) public onlyOwnerPubkeyList  accept saveMsg{
        GoshWallet(wallet).tryProposalResult{value: 0.1 ton, flag : 1}(proposal);  
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _goshroot) {
            _flag = false;
        }
    }

    //Selfdestruct
    function destroy() public onlyOwnerPubkeyList {
        selfdestruct(_goshroot);
    }
    
    //Getters
}
