// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ton-solidity >=0.61.2;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./libraries/GoshLib.sol";
import "./modifiers/modifiers.sol";
import "snapshot.sol";
import "commit.sol";
import "repository.sol";
import "diff.sol";

contract Snapshot is Modifiers {
    string version = "0.4.1";
    
    uint256 _pubkey;
    address _rootRepo;
    bytes _snapshot;
    bytes _oldsnapshot;
    address _olddiff;
    address _diff;
    address _rootgosh;
    address _goshdao;
    string _oldcommits;
    string _commits;
    optional(string) _ipfs;
    optional(string) _ipfsold;
    TvmCell m_codeSnapshot;
    TvmCell m_CommitCode;
    TvmCell m_codeDiff;
    TvmCell m_WalletCode;
    string static NameOfFile;
    bool _applying = false;
    string _name; 
    string _branch;

    constructor(uint256 pubkeysender, uint256 pubkey,address rootgosh, address goshdao, address rootrepo, TvmCell codeSnapshot, TvmCell codeCommit, TvmCell codeDiff, TvmCell WalletCode, string branch, string name, uint128 index, bytes data, optional(string) ipfsdata, string commit) public {
        tvm.accept();
        _pubkey = pubkey;
        _rootRepo = rootrepo;
        m_codeSnapshot = codeSnapshot;
        m_CommitCode = codeCommit;
        m_codeDiff = codeDiff;
        _snapshot = gosh.zip("");
        _oldsnapshot = _snapshot;
        _branch = branch;
        _name = name;
        _rootgosh = rootgosh;
        _goshdao = goshdao;
        m_WalletCode = WalletCode;
        require(checkAccess(pubkeysender, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _oldcommits = commit;
        _commits = commit;
        _oldsnapshot = data;
        _snapshot = data;
        _ipfsold = ipfsdata;
        _ipfs = ipfsdata;
        Commit(_buildCommitAddr(_oldcommits)).getAcceptedContent{value : 0.2 ton, flag: 1}(_oldsnapshot, _ipfsold, NameOfFile);
    }
    
    function _buildCommitAddr(
        string commit
    ) private view returns(address) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_CommitCode, _rootRepo, version);
        TvmCell state = tvm.buildStateInit({
            code: deployCode, 
            contr: Commit,
            varInit: {_nameCommit: commit}
        });
        return address(tvm.hash(state));
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
            varInit: {_rootRepoPubkey: _pubkey, _rootgosh : _rootgosh, _goshdao: _goshdao, _index: index}
        });
        return _contractflex;
    }   

    function applyDiff(string namecommit, Diff diff, uint128 index) public {
        require(msg.isExternal == false, ERR_INVALID_SENDER);
        tvm.accept();
        uint256 empty;
        if ((_applying == true) && (msg.sender != _diff)) {DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty); return;}
        else { 
            require(_buildDiffAddr(namecommit, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
            _applying = true; 
            _diff = msg.sender;
            _commits = namecommit;
        }
        if (diff.ipfs.hasValue()) {
            _ipfs = diff.ipfs.get();
             DiffC(msg.sender).approveDiff{value: 0.15 ton, flag: 1}(true, namecommit, empty); 
             _applying = true;
             return;
        }
        else {
             if (_ipfs.hasValue() == true) { DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty); return; }
             if (diff.patch.hasValue() == false) { DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty); return;  }
             optional(bytes) res = gosh.applyZipPatchQ(_snapshot, diff.patch.get());
             if (res.hasValue() != true) { DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty); return; }
             _snapshot = res.get();
             DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(true, namecommit, tvm.hash(gosh.unzip(_snapshot))); 
             _applying = true;
             return;
        }
    }
    
    function cancelDiff() public {
        require(msg.sender == _diff, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        _snapshot = _oldsnapshot;
        _ipfs = _ipfsold;
        _diff = _olddiff;
        _applying = false;
    }
    
    function approve() public {
        require(msg.sender == _diff, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        _oldsnapshot = _snapshot;
        _olddiff = _diff;
        _oldcommits = _commits;
        _ipfsold = _ipfs;
        _applying = false;
    }
    
    //Private getters
    function getSnapshotAddr(string branch, string name) private view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(m_codeSnapshot, _rootRepo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: name}});
        address addr = address.makeAddrStd(0, tvm.hash(stateInit));
        return addr;
    }
    
    function _buildDiffAddr(
        string commit,
        uint128 index
    ) private view returns(address) {
        TvmCell deployCode = GoshLib.buildDiffCode(m_codeDiff, _rootRepo, version);
        TvmCell state = tvm.buildStateInit({
            code: deployCode, 
            contr: DiffC,
            varInit: {_nameCommit: commit, _index: index}
        });
        return address(tvm.hash(state));
    }

    //Selfdestruct
    function destroy(uint256 value, uint128 index) public {
        require(checkAccess(value, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(msg.sender);
    }
    
    //Setters
    function setSnapshotSelf(string commits, address commit, bytes snapshot, optional(string) ipfs, string branch) public {
        require(msg.sender == getSnapshotAddr(branch, branch + "/" + _name));
        tvm.accept();
        _oldsnapshot = snapshot;
        _ipfsold = ipfs;
        _oldcommits = commits;
        _olddiff = commit;
        _snapshot = snapshot;
        _ipfs = ipfs;
        _commits = commits;
        _diff = commit;
    }

    //Getters
    function getSnapshot() external view returns(string, bytes, optional(string), string, bytes, optional(string)) {
        return (_commits, _snapshot, _ipfs, _oldcommits, _oldsnapshot, _ipfsold);
    }

    function getName() external view returns(string) {
        return NameOfFile;
    }

    function getRepoAdress() external view returns(address) {
        return _rootRepo;
    }

    function getVersion() external view returns(string) {
        return version;
    }
}