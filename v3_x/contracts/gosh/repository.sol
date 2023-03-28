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

import "commit.sol";
import "goshwallet.sol";
import "tag.sol";
import "task.sol";
import "snapshot.sol";
import "./libraries/GoshLib.sol";
import "./modifiers/modifiers.sol";

/* Root contract of Repository */
contract Repository is Modifiers{
    string constant version = "3.0.0";

    optional(AddrVersion) _previousversion;
    address _pubaddr;
    mapping(uint8 => TvmCell) _code;
    address _systemcontract;
    string static _name;
    string _nameDao;
    address public _goshdao;
    string _head;
    mapping(uint256 => Item) _Branches;
    mapping(uint256 => bool) _protectedBranch;
    mapping(uint256 => string) _hashtag;
    uint128 _limittag = 3;
    uint128 _counttag = 0;
    bool _ready = false;
    bool _limited = true;
    mapping(uint256 => string) public _versions;
    string public _description;
    address _creator;

    constructor(
        address pubaddr,
        string name,
        string nameDao,
        address goshdao,
        address rootgosh,
        string desc,
        TvmCell CommitCode,
        TvmCell WalletCode,
        TvmCell codeTag,
        TvmCell SnapshotCode,
        TvmCell codeTree,
        TvmCell codeDiff,
        TvmCell contentSignature,
        mapping(uint256 => string) versions,
        uint128 index,
        optional(AddrVersion) previousversion
        ) public {
        require(_name != "", ERR_NO_DATA);
        tvm.accept();
        _description = desc;
        _versions = versions;
        _code[m_WalletCode] = WalletCode;
        _pubaddr = pubaddr;
        _systemcontract = rootgosh;
        _goshdao = goshdao;
        _nameDao = nameDao;
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _name = name;
        _code[m_CommitCode] = CommitCode;
        _code[m_TagCode] = codeTag;
        _code[m_TreeCode] = codeTree;
        _code[m_SnapshotCode] = SnapshotCode;
        _code[m_DiffCode] = codeDiff;
        _code[m_contentSignature] = contentSignature;
        _previousversion = previousversion;
        if (_previousversion.hasValue()) { SystemContract(_systemcontract).checkUpdateRepo1{value: 0.3 ton, bounce: true, flag: 1}(_name, _nameDao, _previousversion.get(), address(this)); return; }
        _ready = true;
        TvmCell s1 = _composeCommitStateInit("0000000000000000000000000000000000000000");
        _Branches[tvm.hash("main")] = Item("main", address.makeAddrStd(0, tvm.hash(s1)), version);
        _head = "main";
        _creator = msg.sender;
    }

    function checkUpdateRepo4(AddrVersion prev, address answer) public view senderIs(_systemcontract) accept {
        if (prev.addr != address(this)) {
            TvmCell a = abi.encode(false, _Branches, _protectedBranch, _head, _hashtag);
            Repository(answer).checkUpdateRepoVer5{value : 0.15 ton, flag: 1}(version, a);
        }
        TvmCell a = abi.encode(true, _Branches, _protectedBranch, _head, _hashtag);
        Repository(answer).checkUpdateRepoVer5{value : 0.15 ton, flag: 1}(version, a);
    }

    function checkUpdateRepo5(bool ans, mapping(uint256 => Item) Branches, mapping(uint256 => bool) protectedBranch, string head) public senderIs(_previousversion.get().addr) accept {
        if (ans == false) { selfdestruct(giver); }
        _Branches = Branches;
        _protectedBranch = protectedBranch;
        _head = head;
        _ready = true;
    }
    
    function checkUpdateRepoVer5(string ver, TvmCell a) public senderIs(_previousversion.get().addr) accept {
        if (ver == "2.0.0"){
            (bool ans, mapping(uint256 => Item) Branches, mapping(uint256 => bool) protectedBranch, string head, mapping(uint256 => string) hashtag) = abi.decode(a, (bool , mapping(uint256 => Item), mapping(uint256 => bool), string, mapping(uint256 => string)));
            if (ans == false) { selfdestruct(giver); }
            _Branches = Branches;
            _protectedBranch = protectedBranch;
            _head = head;
            this.smvdeployrepotagin{value: 0.1 ton}(hashtag.values());
            return;
        }
        if (ver == "3.0.0"){
            (bool ans, mapping(uint256 => Item) Branches, mapping(uint256 => bool) protectedBranch, string head, mapping(uint256 => string) hashtag) = abi.decode(a, (bool , mapping(uint256 => Item), mapping(uint256 => bool), string, mapping(uint256 => string)));
            if (ans == false) { selfdestruct(giver); }
            _Branches = Branches;
            _protectedBranch = protectedBranch;
            _head = head;
            this.smvdeployrepotagin{value: 0.1 ton}(hashtag.values());
            return;
        }
    }
    
    function smvdeployrepotagin (string[] tag) public senderIs(address(this)) accept {
        require(tag.length + _counttag <= _limittag, ERR_TOO_MANY_TAGS);
        for (uint8 t = 0; t < tag.length; t++){     
            if (_hashtag.exists(tvm.hash(tag[t]))) { continue; }
            _counttag++;
            _hashtag[tvm.hash(tag[t])] = tag[t];
            GoshWallet(_creator).deployRepoTag{value:0.2 ton}(_name, tag[t]);   	
        }
        _ready = true;
    }

    //Branch part
    function deployBranch(address pubaddr, string newname, string fromcommit, uint128 index)  public minValue(0.5 ton) {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        require(_Branches.exists(tvm.hash(newname)) == false, ERR_BRANCH_EXIST);
        if ("0000000000000000000000000000000000000000" == fromcommit) { _Branches[tvm.hash(newname)] = Item(newname, getCommitAddr(fromcommit), version); return; }
        Commit(getCommitAddr(fromcommit)).isCorrect{value: 0.23 ton, flag: 1}(newname);
    }

    function commitCorrect(string newname, string fromcommit) public senderIs(getCommitAddr(fromcommit)) {
        tvm.accept();
         require(_Branches.exists(tvm.hash(newname)) == false, ERR_BRANCH_EXIST);
        _Branches[tvm.hash(newname)] = Item(newname, getCommitAddr(fromcommit), version);
    }

    function deleteBranch(address pubaddr, string name, uint128 index) public minValue(0.3 ton){
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        tvm.accept();
        require(_Branches.exists(tvm.hash(name)), ERR_BRANCH_NOT_EXIST);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        require(_protectedBranch[tvm.hash(name)] == false, ERR_BRANCH_PROTECTED);
        delete _Branches[tvm.hash(name)];
    }

    //Access part
    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }

    function _composeCommitStateInit(string _commit) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_CommitCode], address(this), version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
    }

    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_systemcontract : _systemcontract, _goshdao: _goshdao, _index: index}
        });
        return _contract;
    }

    function initCommit(string namecommit, string branch, AddrVersion commit) public senderIs(getCommitAddr(namecommit)) accept {
        require(_previousversion.hasValue(), ERR_WRONG_DATA);
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        if (commit.version == "1.0.0") {
            _Branches[tvm.hash(branch)] = Item(branch, msg.sender, version);
        }
        else { Repository(_previousversion.get().addr).isCorrectCommit{value: 0.3 ton, bounce: true, flag: 1}(namecommit, branch, commit.addr); }
    }

    function isCorrectCommit(string namecommit, string branch, address commit) public view {
        if ((_Branches[tvm.hash(branch)].commitaddr == getCommitAddr(namecommit)) && (commit == _Branches[tvm.hash(branch)].commitaddr)) {
            Repository(msg.sender).correctCommit{value: 0.1 ton, bounce: true, flag: 1}(namecommit, branch);
        }
    }

    function commitCanceled(string namecommit, string branch) public senderIs(getCommitAddr(namecommit)) view accept {
        namecommit; branch;
    }

    function correctCommit(string namecommit, string branch) public senderIs(_previousversion.get().addr) accept {
        _Branches[tvm.hash(branch)] = Item(branch, getCommitAddr(namecommit), version);
    }

    function changeDescription(address pubaddr, string descr, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        tvm.accept();
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        _description = descr;
    }
    
    //Diff part
    function SendDiff(string branch, address commit, uint128 number, uint128 numberCommits, optional(ConfigCommit) task, bool isUpgrade) public view senderIs(address(this)){
        tvm.accept();
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        uint128 valueton = number * 1 ton + 0.5 ton;
        if (valueton > 1000 ton) { valueton = 1000 ton; }
        Commit(commit).SendDiff{value: valueton, bounce: true, flag: 1}(branch, _Branches[tvm.hash(branch)].commitaddr, number, numberCommits, task, isUpgrade);
    }

    function SendDiffSmv(address pubaddr, uint128 index, string branch, address commit, uint128 number, uint128 numberCommits, optional(ConfigCommit) task) public view accept {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        uint128 valueton = number * 1 ton + 0.5 ton;
        if (valueton > 1000 ton) { valueton = 1000 ton; }
        Commit(commit).SendDiffSmv{value: valueton, bounce: true, flag: 1}(branch, _Branches[tvm.hash(branch)].commitaddr, number, numberCommits, task);
    }

    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public {
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        selfdestruct(giver);
    }

    //Setters
    function setCommit(string nameBranch, address oldcommit, string namecommit, uint128 number, uint128 number_commit, optional(ConfigCommit) task) public senderIs(getCommitAddr(namecommit)) {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_Branches.exists(tvm.hash(nameBranch)), ERR_BRANCH_NOT_EXIST);
        tvm.accept();
        if (_Branches[tvm.hash(nameBranch)].commitaddr != oldcommit) {
            Commit(getCommitAddr(namecommit)).NotCorrectRepo{value: 0.1 ton, flag: 1}(number);
            return;
        }
        _Branches[tvm.hash(nameBranch)] = Item(nameBranch, getCommitAddr(namecommit), version);
        if (task.hasValue()){
            ConfigCommit taskf = task.get();
            ConfigCommitBase tasksend = ConfigCommitBase({task: taskf.task, commit: getCommitAddr(namecommit), number_commit: number_commit, pubaddrassign: taskf.pubaddrassign, pubaddrreview: taskf.pubaddrreview, pubaddrmanager: taskf.pubaddrmanager, daoMembers: taskf.daoMembers});
            Task(taskf.task).isReady{value: 0.1 ton}(tasksend);
        }
        Commit(getCommitAddr(namecommit)).allCorrect{value: 0.1 ton, flag: 1}(number);
    }

    function fromInitUpgrade2(string nameCommit, address commit, string ver, string branch) public view senderIs(getCommitAddr(nameCommit)) accept {       
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        if (_previousversion.hasValue() == false) { Commit(msg.sender).stopUpgrade{value:0.1 ton}();  return; }
        SystemContract(_systemcontract).fromInitUpgrade3{value: 0.3 ton, bounce: true, flag: 1}(_name, _nameDao, nameCommit, commit, ver, branch, msg.sender);
    }
    
    function fromInitUpgrade6(string nameCommit, address commit, string branch, address newcommit) public view senderIs(_systemcontract) accept {       
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        Commit(getCommitAddr(nameCommit)).fromInitUpgrade(commit, branch, newcommit);
    }
    
    function setHEAD(address pubaddr, string nameBranch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(checkAccess(pubaddr, msg.sender, index),ERR_SENDER_NO_ALLOWED);
        require(_Branches.exists(tvm.hash(nameBranch)), ERR_BRANCH_NOT_EXIST);
        tvm.accept();
        _head = nameBranch;
    }

    //Protected branch

    function addProtectedBranch(address pubaddr, string branch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        if (_protectedBranch[tvm.hash(branch)] == true) { return; }
        _addProtectedBranch(branch);
    }

    function deleteProtectedBranch(address pubaddr, string branch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (_protectedBranch.exists(tvm.hash(branch)) == false) { return; }
        if (_protectedBranch[tvm.hash(branch)] == false) { return; }
        _deleteProtectedBranch(branch);
    }

    function _addProtectedBranch(string branch) private {
        _protectedBranch[tvm.hash(branch)] = true;
    }

    function _deleteProtectedBranch(string branch) private {
        delete _protectedBranch[tvm.hash(branch)];
    }

    function isNotProtected(address pubaddr, string branch, address commit, uint128 number, uint128 numberCommits, optional(ConfigCommit) task, bool isUpgrade, uint128 index) public view {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if ((_protectedBranch[tvm.hash(branch)] == false) || (isUpgrade == true)) {
            this.SendDiff{value: 0.7 ton, bounce: true, flag: 1}(branch, commit, number, numberCommits, task, isUpgrade);
            return;
        }
    }

    function _composeTreeStateInit(string shaTree) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildTreeCode(_code[m_TreeCode], version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaTree: shaTree, _repo: address(this)}});
        return stateInit;
    }

    function _composeDiffStateInit(string _commit, address repo, uint128 index1, uint128 index2) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_DiffCode], repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: _commit, _index1: index1, _index2: index2}});
        return stateInit;
    }
    
    function isDeleteSnap(string branch, string name) public view minValue(0.2 ton) senderIs(_getSnapshotAddr(branch, name)){
        tvm.accept();
        require(_Branches.exists(tvm.hash(branch)) == false, ERR_BRANCH_EXIST);
        Snapshot(msg.sender).destroyfinal{value:0.1 ton}();
    }
    
    function _getSnapshotAddr(string branch, string name) private view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], address(this), branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }
    
    function smvdeployrepotag (address pub, uint128 index, string[] tag) public accept {
        require(checkAccess(pub, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        require(tag.length + _counttag <= _limittag, ERR_TOO_MANY_TAGS);
        for (uint8 t = 0; t < tag.length; t++){     
            if (_hashtag.exists(tvm.hash(tag[t]))) { continue; }
            _counttag++;
            _hashtag[tvm.hash(tag[t])] = tag[t];
            TvmCell s1 = _composeWalletStateInit(pub, 0);
            address addr = address.makeAddrStd(0, tvm.hash(s1));
            GoshWallet(addr).deployRepoTag{value:0.2 ton}(_name, tag[t]);   	
        }
    }
    
    function smvdestroyrepotag (address pub, uint128 index, string[] tag) public accept {
        require(checkAccess(pub, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        for (uint8 t = 0; t < tag.length; t++){     
            if (_hashtag.exists(tvm.hash(tag[t])) == false) { continue; }
            _counttag--;
            delete _hashtag[tvm.hash(tag[t])];
            TvmCell s1 = _composeWalletStateInit(pub, 0);
            address addr = address.makeAddrStd(0, tvm.hash(s1));
            GoshWallet(addr).destroyRepoTag{value:0.2 ton}(_name, tag[t]);   	
        }
    }

    //Getters
    function getContentAddress(string commit, string label) external view returns(address) {
        address repo = address(this);
        TvmCell deployCode = GoshLib.buildSignatureCode(_code[m_contentSignature], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: ContentSignature, varInit: {_commit : commit, _label : label, _systemcontract : _systemcontract, _goshdao : _goshdao}});
       return address.makeAddrStd(0, tvm.hash(s1));
    }

    function isBranchProtected(string branch) external view returns(bool) {
        if (_protectedBranch.exists(tvm.hash(branch)) == false) {
            return false;
        }
        if (_protectedBranch[tvm.hash(branch)] == false) {
            return false;
        }
        return true;
    }

    function getTreeAddr(string treeName) external view returns(address) {
        TvmCell s1 = _composeTreeStateInit(treeName);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getProtectedBranch() external view returns(mapping(uint256 => bool)) {
        return _protectedBranch;
    }

    function getSnapCode(string branch) external view returns(TvmCell) {
        return GoshLib.buildSnapshotCode(_code[m_SnapshotCode], address(this), branch, version);
    }

    function getAddrBranch(string name) external view returns(Item) {
        return _Branches[tvm.hash(name)];
    }

    function getAllAddress() external view returns(Item[]) {
        Item[] AllBranches;
        for ((uint256 key, Item value) : _Branches) {
            key;
            AllBranches.push(value);
        }
        return AllBranches;
    }

    function getSnapshotAddr(string branch, string name) external view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], address(this), branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }

    function getDiffAddr (string commitName, uint128 index1, uint128 index2) external view returns(address) {
        TvmCell s1 = _composeDiffStateInit(commitName, address(this), index1, index2);
        return  address(tvm.hash(s1));
    }
    
    function getTags() external view returns(mapping(uint256 => string)) {
        return _hashtag;
    }

    function getCommitCode() external view returns(TvmCell) {
        return _code[m_CommitCode];
    }

    function getTagCode() external view returns(TvmCell) {
        return GoshLib.buildTagCode(_code[m_TagCode], address(this), version);
    }

    function getGoshAddress() external view returns(address) {
        return _systemcontract;
    }

    function getName() external view returns(string) {
        return _name;
    }

    function getHEAD() external view returns(string) {
        return _head;
    }

    function getCommitAddr(string nameCommit) public view returns(address)  {
        TvmCell s1 = _composeCommitStateInit(nameCommit);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getVersion() external pure returns(string, string) {
        return ("repository", version);
    }

    function getOwner() external view returns(address) {
        return _pubaddr;
    }

    function getPrevious() external view returns(optional(AddrVersion)) {
        return _previousversion;
    }

    function getReady() external view returns(bool) {
        return _ready;
    }
    
    function getDetails() external view returns(string description, string name, Item[] alladress, string head, mapping(uint256 => string) hashtag, bool ready)
    {
        Item[] AllBranches;
        for ((uint256 key, Item value) : _Branches) {
            key;
            AllBranches.push(value);
        }
        return (_description, _name, AllBranches, _head, _hashtag, _ready);
    }    
        
    function getRepositoryIn() public view minValue(0.3 ton) {
        Item[] AllBranches;
        for ((uint256 key, Item value) : _Branches) {
            key;
            AllBranches.push(value);
        }
        IObject(msg.sender).returnRepo{value: 0.1 ton}(_description, _name, AllBranches, _head, _hashtag, _ready);
    }
}
