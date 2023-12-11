// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./libraries/GoshLib.sol";
import "./smv/modifiers/modifiers.sol";
import "snapshot.sol";
import "commit.sol";
import "repository.sol";
import "diff.sol";

contract Snapshot is Modifiers {
    string constant version = "6.3.0";
    
    string static _baseCommit;
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
    bool _ready = false;
    string _pushcommit;
    
    uint128 timeMoney = 0; 
    bool _flag = false;
    bool _isPin;

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
        uint128 index,
        bytes data,
        bool isPin,
        string commit,
        optional(string) ipfsdata
    ) {
        tvm.accept();
        _pubaddr = pubaddr;
        _rootRepo = rootrepo;
        _code[m_SnapshotCode] = codeSnapshot;
        _code[m_CommitCode] = codeCommit;
        _code[m_DiffCode] = codeDiff;
        _snapshot = gosh.zip("");
        _oldsnapshot = _snapshot;
        _systemcontract = rootgosh;
        _goshdao = goshdao;
        _code[m_WalletCode] = WalletCode;
        _isPin = isPin;
        if (isPin == true) { _baseCommit = commit; }
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        _oldcommits = _baseCommit;
        _commits = _baseCommit;
        _oldsnapshot = data;
        _snapshot = data;
        _ipfsold = ipfsdata;
        _ipfs = ipfsdata;
        _code[m_TreeCode] = codeTree;
        if (data.empty()) { 
            _ready = true;
        }
        else {
            //ignore ipfs snapshot check
            if (ipfsdata.hasValue() == true) { _ready = true; return; }
            
            Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _oldcommits))
                .getAcceptedContent{value : 0.2 ton, flag: 1}(tvm.hash(gosh.unzip(_oldsnapshot)), NameOfFile);
        }
        getMoney();
    }
    
    function getMoney() private {
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
        if (_flag == true) { return; }
        if (address(this).balance > 100 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneySnap{value : 0.2 ton, flag: 1}(_baseCommit, _rootRepo, NameOfFile);
    }
    
    function returnTreeAnswer(Request value0, optional(TreeObject) value1, uint256 shainnertree) public senderIs(GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, _rootRepo)) {
        if (value1.hasValue() == false) { selfdestruct(_systemcontract); return; }
        if (value1.get().tvmshafile.get() != value0.sha) { selfdestruct(_systemcontract); return; }
        _ready = true;
    }
    
    function isReady(uint256 sha1, optional(address) branchcommit, uint128 typer) public minValue(0.15 ton) {
        if (typer == TYPE_SET_COMMIT) {
            if ((sha1 == tvm.hash(gosh.unzip(_snapshot))) || (_ipfs.hasValue() == true)) {
                Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(NameOfFile, _ready, branchcommit, typer, _baseCommit);
            } else { 
                Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(NameOfFile, false, branchcommit, typer, _baseCommit); 
            }
            return;
        }
        else {
            if ((typer == TYPE_DESTROY_BRANCH) && (_applying == false)) {                
                Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(NameOfFile, _ready, branchcommit, typer, _baseCommit);
                selfdestruct(_systemcontract); 
                return;
            } else {
                if ((sha1 == tvm.hash(gosh.unzip(_oldsnapshot))) || (_ipfsold.hasValue() == true)) {
                    Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(NameOfFile, _ready, branchcommit, typer, _baseCommit);
                } else { 
                    Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(NameOfFile, false, branchcommit, typer, _baseCommit); 
                }
            }
        }
    }

    function applyDiff(string namecommit, Diff diff, uint128 index1, uint128 index2) public {
        require(msg.isExternal == false, ERR_INVALID_SENDER);
        require(_ready == true, ERR_SNAPSHOT_NOT_READY);
        require(diff.nameSnap == NameOfFile, ERR_INVALID_SENDER);
        tvm.accept();
        getMoney();
        uint256 empty;
        if ((_applying == true) && (msg.sender != GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _pushcommit, index1, index2))) {
            DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty);
            return;
        } else {
            require(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, namecommit, index1, index2) == msg.sender, ERR_SENDER_NO_ALLOWED);
            _applying = true; 
            _commits = diff.commit;
            _pushcommit = namecommit;
        }
        if (diff.removeIpfs == true) {
            if ((diff.ipfs.hasValue()) || (_ipfs.hasValue() == false) || (diff.patch.hasValue() == false)) { 
            	DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty); 
            	return;
            }            
            if (tvm.hash(gosh.unzip(diff.patch.get())) == diff.sha256) {
                _snapshot = diff.patch.get();
                _ipfs = null;
                DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(true, namecommit, tvm.hash(gosh.unzip(_snapshot)));
                _applying = true;
            }
            else {
                DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, tvm.hash(gosh.unzip(diff.patch.get())));
            }
            return;
        }
        if (diff.ipfs.hasValue()) {
            _ipfs = diff.ipfs.get();
            DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(true, namecommit, empty);
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
            optional(bytes) res = gosh.applyZipBinPatchQ(_snapshot, diff.patch.get());
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
        require(msg.sender == GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _pushcommit, index1, index2), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        _snapshot = _oldsnapshot;
        _ipfs = _ipfsold;
        _commits = _oldcommits;
        _pushcommit = _oldcommits;
        _applying = false;
    }

    function approve(uint128 index1, uint128 index2, Diff diff) public {
        diff;
        require(msg.sender == GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _pushcommit, index1, index2), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        _oldsnapshot = _snapshot;
        _oldcommits = _commits;
        _ipfsold = _ipfs;
        _applying = false;
//        this.sendContent{value: 0.1 ton, flag: 1}(_snapshot, _ipfsold, _commits);
        if ((_oldsnapshot.empty()) && (_ipfsold.hasValue() == false)) { selfdestruct(_systemcontract); return; }
        Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _oldcommits)).canDelete{value: 0.1 ton, flag: 1}(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _pushcommit), _baseCommit, NameOfFile);
        _pushcommit = _commits;
    }

    function sendContent(bytes snapshot, optional(string) ipfs, string commit) public pure senderIs(address(this)) accept {
        snapshot; ipfs; commit;
        return;
    }

    function canDelete() public senderIs(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _oldcommits)) accept {
        selfdestruct(_systemcontract);
    }

    //Private getters
    function getSnapshotAddr(string name) private view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], _rootRepo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: name}});
        address addr = address.makeAddrStd(0, tvm.hash(stateInit));
        return addr;
    }
    
    receive() external {
        if (msg.sender == _goshdao) {
            _flag = false;
        }
    }
    
    onBounce(TvmSlice body) external {
        body;
        if (msg.sender == GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _oldcommits)) { selfdestruct(_systemcontract); }
    }
    
    fallback() external {
        if (msg.sender == GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _oldcommits)) { selfdestruct(_systemcontract); }
    }

    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public minValue(0.3 ton) accept {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        selfdestruct(_systemcontract);
    }

    //Getters
    function getSnapshot() external view
        returns(string temporaryCommit, bytes temporarySnapData, optional(string) temporaryIpfs, string approvedCommit, bytes approvedSnapData, optional(string) approvedIpfs, string baseCommit, bool isSnapReady, bool isPin)    {
        return (_commits, _snapshot, _ipfs, _oldcommits, _oldsnapshot, _ipfsold, _baseCommit, _ready, _isPin);
    }
    
    function getSnapshotIn() public view minValue(0.5 ton)
    {
        IObject(msg.sender).returnSnap{value: 0.1 ton, flag: 1}(_commits, _snapshot, _ipfs, _oldcommits, _oldsnapshot, _ipfsold, _baseCommit, _ready);
    }

    function getName() external view returns(string) {
        return NameOfFile;
    }

    function getAddrRepository() external view returns(address) {
        return _rootRepo;
    }
    
    function getBaseCommit() external view returns(string) {
        return _baseCommit;
    }

    function getVersion() external pure returns(string, string) {
        return ("snapshot", version);
    }
    
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
}
