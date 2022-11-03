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

import "./libraries/GoshLib.sol";
import "./modifiers/modifiers.sol";
import "snapshot.sol";
import "commit.sol";
import "repository.sol";
import "diff.sol";

contract Snapshot is Modifiers {
    string constant version = "0.11.0";
    
    string _baseCommit;
    string _basemaybe = "";
    address _pubaddr;
    address _rootRepo;
    bytes _snapshot;
    bytes _oldsnapshot;
    address _systemcontract;
    address _goshdao;
    string _oldcommits;
    string _commits;
    optional(string) _ipfs;
    optional(string) _ipfsold;
    mapping(uint8 => TvmCell) _code;
    string static NameOfFile;
    bool _applying = false;
    string _name; 
    string _branch;
    bool _ready = false;

    constructor(
        address pubaddr,
        address rootgosh,
        address goshdao,
        address rootrepo,
        TvmCell codeSnapshot,
        TvmCell codeCommit,
        TvmCell codeDiff,
        TvmCell WalletCode,
        TvmCell codeTree,
        string branch,
        string name,
        uint128 index,
        bytes data,
        optional(string) ipfsdata,
        string commit
    ) public {
        tvm.accept();
        _pubaddr = pubaddr;
        _rootRepo = rootrepo;
        _code[m_SnapshotCode] = codeSnapshot;
        _code[m_CommitCode] = codeCommit;
        _code[m_DiffCode] = codeDiff;
        _snapshot = gosh.zip("");
        _oldsnapshot = _snapshot;
        _branch = branch;
        _name = name;
        _systemcontract = rootgosh;
        _goshdao = goshdao;
        _code[m_WalletCode] = WalletCode;
        require(checkAccess(_pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _oldcommits = commit;
        _commits = commit;
        _oldsnapshot = data;
        _snapshot = data;
        _ipfsold = ipfsdata;
        _ipfs = ipfsdata;
        _baseCommit = commit;
        _code[m_TreeCode] = codeTree;
        if (_baseCommit.empty()) { 
            require(data.empty(), ERR_NOT_EMPTY_DATA);
            require(ipfsdata.hasValue() == false, ERR_NOT_EMPTY_DATA);
            _ready = true;
        }
        else {
            //ignore ipfs snapshot check
            if (ipfsdata.hasValue() == true) { _ready = true; return; }
            
            Commit(_buildCommitAddr(_oldcommits))
                .getAcceptedContent{value : 0.2 ton, flag: 1}(_oldsnapshot, _ipfsold, _branch, _name);
        }
    }

    function _buildCommitAddr(
        string commit
    ) private view returns(address) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_CommitCode], _rootRepo, version);
        TvmCell state = tvm.buildStateInit({
            code: deployCode, 
            contr: Commit,
            varInit: {_nameCommit: commit}
        });
        return address(tvm.hash(state));
    }
    
    function TreeAnswer(Request value0, optional(TreeObject) value1, string sha) public senderIs(getTreeAddr(sha)) {
        if (value1.hasValue() == false) { selfdestruct(_rootRepo); return; }
        if (value1.get().sha256 != value0.sha) { selfdestruct(_rootRepo); return; }
        _ready = true;
    }
    
    function getTreeAddr(string shaTree) internal view returns(address) {
        TvmCell deployCode = GoshLib.buildTreeCode(_code[m_TreeCode], version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaTree: shaTree, _repo: _rootRepo}});
        //return tvm.insertPubkey(stateInit, pubkey);
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }

    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }

    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_systemcontract : _systemcontract, _goshdao: _goshdao, _index: index}
        });
        return _contractflex;
    }
    
    function isReady(uint256 sha1, uint128 typer) public view minValue(0.15 ton) {
        if ((sha1 == tvm.hash(gosh.unzip(_snapshot))) || (_ipfs.hasValue() == true)) {
            Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(_name, _ready, typer);
        } else { 
            Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(_name, false, typer); 
        }
        
    }

    function applyDiff(string namecommit, Diff diff, uint128 index1, uint128 index2) public {
        require(msg.isExternal == false, ERR_INVALID_SENDER);
        require(_ready == true, ERR_SNAPSHOT_NOT_READY);
        if (_basemaybe == "") { _basemaybe = diff.commit; }
        tvm.accept();
        uint256 empty;
        if ((_applying == true) && (msg.sender != _buildDiffAddr(_commits, index1, index2))) {
            DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty);
            return;
        } else {
            require(_buildDiffAddr(namecommit, index1, index2) == msg.sender, ERR_SENDER_NO_ALLOWED);
            _applying = true; 
            _commits = namecommit;
        }
        if (diff.ipfs.hasValue()) {
            _ipfs = diff.ipfs.get();
            DiffC(msg.sender).approveDiff{value: 0.15 ton, flag: 1}(true, namecommit, empty);
            _applying = true;
            return;
        } else {
            if (_ipfs.hasValue() == true) {
                DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty);
                return;
            }
            if (diff.patch.hasValue() == false) {
                DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty);
                return;
            }
//            optional(bytes) res = gosh.applyZipBinPatchQ(_snapshot, diff.patch.get());
            optional(bytes) res = gosh.applyZipPatchQ(_snapshot, diff.patch.get());
            if (res.hasValue() != true) {
                DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty);
                return;
            }
            if (tvm.hash(gosh.unzip(res.get())) == diff.sha256) {
                       _snapshot = res.get();
                        DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(true, namecommit, tvm.hash(gosh.unzip(_snapshot)));
                        _applying = true;
            }
            else {
                DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, tvm.hash(gosh.unzip(res.get())));
            }
            return;
        }
    }

    function cancelDiff(uint128 index1, uint128 index2, string commit) public {
        commit;
        require(msg.sender == _buildDiffAddr(_commits, index1, index2), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        _basemaybe = "";
        _snapshot = _oldsnapshot;
        _ipfs = _ipfsold;
        _commits = _oldcommits;
        _applying = false;
    }

    function approve(uint128 index1, uint128 index2, string commit) public {
        commit;
        require(msg.sender == _buildDiffAddr(_commits, index1, index2), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (_baseCommit.empty()) { 
            _baseCommit = _basemaybe; 
            _basemaybe = "";  
        }
        _oldsnapshot = _snapshot;
        _oldcommits = _commits;
        _ipfsold = _ipfs;
        _applying = false;
    }

    //Private getters
    function getSnapshotAddr(string branch, string name) private view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], _rootRepo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: name}});
        address addr = address.makeAddrStd(0, tvm.hash(stateInit));
        return addr;
    }

    function _buildDiffAddr(
        string commit,
        uint128 index1,
        uint128 index2
    ) private view returns(address) {
        TvmCell deployCode = GoshLib.buildDiffCode(_code[m_DiffCode], _rootRepo, version);
        TvmCell state = tvm.buildStateInit({
            code: deployCode, 
            contr: DiffC,
            varInit: {_nameCommit: commit, _index1: index1, _index2: index2}
        });
        return address(tvm.hash(state));
    }
    
    onBounce(TvmSlice body) external {
        body;
        if (msg.sender == _buildCommitAddr(_oldcommits)) { selfdestruct(_rootRepo); }
    }
    
    fallback() external {
        if (msg.sender == _buildCommitAddr(_oldcommits)) { selfdestruct(_rootRepo); }
    }

    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public {
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(msg.sender);
    }

    //Getters
    function getSnapshot() external view
        returns(string, bytes, optional(string), string, bytes, optional(string), string, bool)
    {
        return (_commits, _snapshot, _ipfs, _oldcommits, _oldsnapshot, _ipfsold, _baseCommit, _ready);
    }

    function getName() external view returns(string) {
        return NameOfFile;
    }

    function getRepoAdress() external view returns(address) {
        return _rootRepo;
    }
    
    function getBaseCommit() external view returns(string) {
        return _baseCommit;
    }

    function getVersion() external pure returns(string) {
        return version;
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
