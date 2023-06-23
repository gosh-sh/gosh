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
import "./smv/modifiers/modifiers.sol";
import "snapshot.sol";
import "commit.sol";
import "repository.sol";
import "diff.sol";

contract Snapshot is Modifiers {
    string constant version = "5.1.0";
    
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
    
    uint128 timeMoney = 0; 
    bool _flag = false;

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
    ) {
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
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
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
            
            Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode], _rootRepo, _oldcommits))
                .getAcceptedContent{value : 0.2 ton, flag: 1}(_oldsnapshot, _ipfsold, _branch, _name);
        }
        getMoney();
    }
    
    function getMoney() private {
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
        if (_flag == true) { return; }
        if (address(this).balance > 1000 ton) { return; }
        _flag = true;
        GoshDao(_goshdao).sendMoneySnap{value : 0.2 ton, flag: 1}(_branch, _rootRepo, _name);
    }
    
    function returnTreeAnswer(Request value0, optional(TreeObject) value1, string sha) public senderIs(GoshLib.calculateTreeAddress(_code[m_TreeCode], sha, _rootRepo)) {
        if (value1.hasValue() == false) { selfdestruct(_systemcontract); return; }
        if (value1.get().sha256 != value0.sha) { selfdestruct(_systemcontract); return; }
        _ready = true;
    }
    
    function isReady(uint256 sha1, optional(address) branchcommit, uint128 typer) public view minValue(0.15 ton) {
        if ((typer == 2) && (_applying == true)){
            if ((sha1 == tvm.hash(gosh.unzip(_snapshot))) || (_ipfs.hasValue() == true)) {
                Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(_name, _ready, branchcommit, typer);
            } else { 
                Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(_name, false, branchcommit, typer); 
            }
        }
        else {
            if ((sha1 == tvm.hash(gosh.unzip(_oldsnapshot))) || (_ipfsold.hasValue() == true)) {
                Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(_name, _ready, branchcommit, typer);
            } else { 
                Tree(msg.sender).answerIs{value: 0.1 ton, flag: 1}(_name, false, branchcommit, typer); 
            }
        }
    }

    function applyDiff(string namecommit, Diff diff, uint128 index1, uint128 index2) public {
        require(msg.isExternal == false, ERR_INVALID_SENDER);
        require(_ready == true, ERR_SNAPSHOT_NOT_READY);
        if (_basemaybe == "") { _basemaybe = diff.commit; }
        tvm.accept();
        getMoney();
        uint256 empty;
        
        if ((_applying == true) && (msg.sender != GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _commits, index1, index2))) {
            DiffC(msg.sender).approveDiff{value: 0.1 ton, flag: 1}(false, namecommit, empty);
            return;
        } else {
            require(GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, namecommit, index1, index2) == msg.sender, ERR_SENDER_NO_ALLOWED);
            _applying = true; 
            _commits = namecommit;
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
        require(msg.sender == GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _commits, index1, index2), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        _basemaybe = "";
        _snapshot = _oldsnapshot;
        _ipfs = _ipfsold;
        _commits = _oldcommits;
        _applying = false;
    }

    function approve(uint128 index1, uint128 index2, Diff diff) public {
        diff;
        require(msg.sender == GoshLib.calculateDiffAddress(_code[m_DiffCode], _rootRepo, _commits, index1, index2), ERR_SENDER_NO_ALLOWED);
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
    function destroy(address pubaddr, uint128 index) public view minValue(0.3 ton) accept {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        Repository(_rootRepo).isDeleteSnap{value: 0.4 ton, flag: 1} (_branch, _name);
    }
    
    function destroyfinal() public senderIs(_rootRepo) {
        selfdestruct(_systemcontract);
    }

    //Getters
    function getSnapshot() external view
        returns(string, bytes, optional(string), string, bytes, optional(string), string, bool)
    {
        return (_commits, _snapshot, _ipfs, _oldcommits, _oldsnapshot, _ipfsold, _baseCommit, _ready);
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
