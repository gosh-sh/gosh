// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "commit.sol";
import "goshwallet.sol";
import "tag.sol";
import "task.sol";
import "snapshot.sol";
import "./libraries/GoshLib.sol";
import "./smv/modifiers/modifiers.sol";
import "./smv/External/tip3/libraries/TokenMsgFlag.sol";
import "./smv/External/tip3/TokenRoot.sol";
import "./smv/External/tip3/TokenRootUpgradeable.sol";

/* Root contract of Repository */
contract Repository is Modifiers{
    string constant version = "6.3.0";

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
    optional(string) _tokendescription;
    optional(Grants[]) _tokengrants;
    optional(uint128) _supply;
    optional(address) _tokenroot;

    string _metadata;

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
        TvmCell tokenrootcode,
        TvmCell tokenwalletcode,
        mapping(uint256 => string) versions,
        uint128 index,
        optional(AddrVersion) previousversion
        ) {
        require(_name != "", ERR_NO_DATA);
        tvm.accept();
        _description = desc;
        _versions = versions;
        _code[m_WalletCode] = WalletCode;
        _pubaddr = pubaddr;
        _systemcontract = rootgosh;
        _goshdao = goshdao;
        _nameDao = nameDao;
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        _name = name;
        _code[m_CommitCode] = CommitCode;
        _code[m_TagCode] = codeTag;
        _code[m_TreeCode] = codeTree;
        _code[m_SnapshotCode] = SnapshotCode;
        _code[m_DiffCode] = codeDiff;
        _code[m_contentSignature] = contentSignature;
        _code[m_TokenRepoRootCode] = tokenrootcode;
        _code[m_TokenRepoWalletCode] = tokenwalletcode;
        _previousversion = previousversion;
        _creator = msg.sender;
        if (_previousversion.hasValue()) { SystemContract(_systemcontract).checkUpdateRepo1{value: 0.3 ton, bounce: true, flag: 1}(_name, _nameDao, _previousversion.get(), address(this)); return; }
        _ready = true;
        _Branches[tvm.hash("main")] = Item("main", GoshLib.calculateCommitAddress(_code[m_CommitCode], address(this), "0000000000000000000000000000000000000000"), version);
        _head = "main";
    }

    function startToken(address pubaddr, string tokendescription, 
        string name,
        string symbol,
        uint8 decimals,
        Grants[] tokengrants) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, 0)) accept {
        if (_tokendescription.hasValue()) { return; }
        _tokendescription = tokendescription;
        _tokengrants = tokengrants;
        TvmCell stateInit = tvm.buildStateInit({
            contr: TokenRoot,
            varInit: {
                randomNonce_: 0,
                deployer_: address(this),
                name_: name,
                symbol_: symbol,
                decimals_: decimals,
                rootOwner_: address(this),
                walletCode_: _code[m_TokenRepoWalletCode]
            },
            code: _code[m_TokenRepoRootCode],
            pubkey: 0
        });

        _tokenroot = new TokenRoot {
            value: FEE_DEPLOY_TOKEN_ROOT,
            flag: TokenMsgFlag.SENDER_PAYS_FEES,
            bounce: false,
            stateInit: stateInit
        }(
            address(this),
            0,
            FEE_DEPLOY_TOKEN_WALLET,
            false,
            false,
            false,
            address(this)
        );
        this.startGrantToken{value: 0.1 ton, flag: 1}(tokengrants, uint128(0));
    }

    function startGrantToken(Grants[] tokengrants, uint128 index) public senderIs(this) accept {
        if (index >= tokengrants.length) { return; }   
        TvmCell b;   
        TokenRoot(_tokenroot.get()).mint{value: FEE_DEPLOY_TOKEN_WALLET + 0.5 ton, flag: 1}(tokengrants[index].value, GoshLib.calculateRepoRootWalletAddress(_code[m_TokenRepoWalletCode], _tokenroot.get(), tokengrants[index].pubaddr), FEE_DEPLOY_TOKEN_WALLET, address(this), false, b);
        if (_supply.hasValue() == false) {
            _supply = tokengrants[index].value;
        }
        else {
            _supply = _supply.get() + tokengrants[index].value;
        }
        this.startGrantToken{value: 0.1 ton, flag: 1}(tokengrants, index + 1);
    }

    function getWalletAddr(address wallet) public view senderIs(_tokenroot.get()) accept {
        wallet;
    }

    function transferFromWallet(address pubaddr, uint128 value, address pubaddr2) public view senderIs(_systemcontract) accept {
        address to = GoshLib.calculateRepoRootWalletAddress(_code[m_TokenRepoWalletCode], _tokenroot.get(), pubaddr2);
        address from = GoshLib.calculateRepoRootWalletAddress(_code[m_TokenRepoWalletCode], _tokenroot.get(), pubaddr);
        SystemContract(_systemcontract).transferFromWalletAgain{value: 0.1 ton, flag: 1}(_nameDao, _name, pubaddr, from, to, value);
    }

    function deployWalletForRepo(address pubaddr) public view senderIs(_systemcontract) accept {
        TokenRoot(_tokenroot.get()).deployWallet{value: FEE_DEPLOY_TOKEN_WALLET + 0.2 ton, flag: 1, callback: Repository.getWalletAddr}(pubaddr, 0);
    }

    function checkUpdateRepo4(AddrVersion prev, address answer) public view senderIs(_systemcontract) accept {
        TvmCell a;
        if (prev.addr != address(this)) {
            a = abi.encode(false, _Branches, _protectedBranch, _head, _hashtag);
            Repository(answer).checkUpdateRepoVer5{value : 0.15 ton, flag: 1}(version, a);
            return;
        }
        a = abi.encode(true, _Branches, _protectedBranch, _head, _hashtag, _description, _tokendescription, _tokengrants, _supply, _tokenroot, _metadata);
        Repository(answer).checkUpdateRepoVer5{value : 0.15 ton, flag: 1}(version, a);
    }

    function checkUpdateRepo5(bool ans, mapping(uint256 => Item) Branches, mapping(uint256 => bool) protectedBranch, string head) public senderIs(_previousversion.get().addr) accept {
        if (ans == false) { selfdestruct(_systemcontract); }
        _Branches = Branches;
        _protectedBranch = protectedBranch;
        _head = head;
        _ready = true;
    }

    function checkUpdateRepoVer5(string ver, TvmCell a) public senderIs(_previousversion.get().addr) accept {
        if (ver == "2.0.0"){
            mapping(uint256 => string) hashtag;
            bool ans;
            (ans, _Branches, _protectedBranch, _head, hashtag) = abi.decode(a, (bool , mapping(uint256 => Item), mapping(uint256 => bool), string, mapping(uint256 => string)));
            if (ans == false) { selfdestruct(_systemcontract); }
            this.smvdeployrepotagin{value: 0.1 ton, flag: 1}(hashtag.values());
            return;
        }
        if ((ver == "3.0.0")){
            mapping(uint256 => string) hashtag;
            bool ans;
            (ans, _Branches, _protectedBranch, _head, hashtag) = abi.decode(a, (bool , mapping(uint256 => Item), mapping(uint256 => bool), string, mapping(uint256 => string)));
            if (ans == false) { selfdestruct(_systemcontract); }
            this.smvdeployrepotagin{value: 0.1 ton, flag: 1}(hashtag.values());
            return;
        }
        if ((ver == "4.0.0") || (ver == "5.0.0") || (ver == "5.1.0") || (ver == "6.0.0") || (ver == "6.1.0") || (ver == "6.2.0")){
            mapping(uint256 => string) hashtag;
            bool ans;
            (ans, _Branches, _protectedBranch, _head, hashtag, _description) = abi.decode(a, (bool , mapping(uint256 => Item), mapping(uint256 => bool), string, mapping(uint256 => string), string));
            if (ans == false) { selfdestruct(_systemcontract); }
            this.smvdeployrepotagin{value: 0.1 ton, flag: 1}(hashtag.values());
            return;
        }
        if (ver == "6.3.0") {
            mapping(uint256 => string) hashtag;
            bool ans;
            (ans, _Branches, _protectedBranch, _head, hashtag, _description, _tokendescription, _tokengrants, _supply, _tokenroot, _metadata) = abi.decode(a, (bool , mapping(uint256 => Item), mapping(uint256 => bool), string, mapping(uint256 => string), string, optional(string), optional(Grants[]), optional(uint128), optional(address), string));
            if (ans == false) { selfdestruct(_systemcontract); }
            this.smvdeployrepotagin{value: 0.1 ton, flag: 1}(hashtag.values());
            return;
        }
    }

    function smvdeployrepotagin (string[] tag) public senderIs(address(this)) accept {
        require(tag.length + _counttag <= _limittag, ERR_TOO_MANY_TAGS);
        for (uint8 t = 0; t < tag.length; t++){
            if (_hashtag.exists(tvm.hash(tag[t]))) { continue; }
            _counttag++;
            _hashtag[tvm.hash(tag[t])] = tag[t];
            GoshWallet(_creator).deployRepoTag{value:0.2 ton, flag: 1}(_name, tag[t]);
        }
        _ready = true;
    }

    //Branch part
    function deployBranch(address pubaddr, string newname, string fromcommit, uint128 index)  public minValue(0.5 ton) {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
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
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(_protectedBranch[tvm.hash(name)] == false, ERR_BRANCH_PROTECTED);
        Commit(_Branches[tvm.hash(name)].commitaddr).cleanTree{value: 0.1 ton, flag: 1}();
        delete _Branches[tvm.hash(name)];
    }

    function initCommit(string namecommit, string branch, AddrVersion commit) public senderIs(getCommitAddr(namecommit)) accept {
        require(_previousversion.hasValue(), ERR_WRONG_DATA);
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        if (commit.version == "1.0.0") {
            _Branches[tvm.hash(branch)] = Item(branch, msg.sender, version);
            return;
        }
        if ((commit.version == "2.0.0") && ((_previousversion.get().version == "3.0.0") || (_previousversion.get().version == "4.0.0"))) {
            _Branches[tvm.hash(branch)] = Item(branch, msg.sender, version);
            return;
        }
        if ((commit.version == "3.0.0") && (_previousversion.get().version == "4.0.0")) {
            _Branches[tvm.hash(branch)] = Item(branch, msg.sender, version);
            return;
        }
        Repository(_previousversion.get().addr).isCorrectCommit{value: 0.3 ton, bounce: true, flag: 1}(namecommit, branch, commit.addr);
    }

    function askCommit(string namecommit, string branch) public view senderIs(getCommitAddr(namecommit)) accept {
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        Commit(msg.sender).answerCommit{value: 0.1 ton, flag: 1}(_Branches[tvm.hash(branch)].commitaddr, branch);
    }

    function isCorrectCommit(string namecommit, string branch, address commit) public view {
        if (commit == _Branches[tvm.hash(branch)].commitaddr) {
            Repository(msg.sender).correctCommit{value: 0.1 ton, bounce: true, flag: 1}(namecommit, branch);
        }
    }

    function commitCanceled(string namecommit) public senderIs(getCommitAddr(namecommit)) view accept {
        namecommit;
    }

    function correctCommit(string namecommit, string branch) public senderIs(_previousversion.get().addr) accept {
        _Branches[tvm.hash(branch)] = Item(branch, getCommitAddr(namecommit), version);
        Commit(getCommitAddr(namecommit)).allCorrect{value: 0.1 ton, flag: 1}(0, branch, false);
    }

    function changeDescription(address pubaddr, string descr, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        tvm.accept();
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
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
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        uint128 valueton = number * 1 ton + 0.5 ton;
        if (valueton > 1000 ton) { valueton = 1000 ton; }
        Commit(commit).SendDiffSmv{value: valueton, bounce: true, flag: 1}(branch, _Branches[tvm.hash(branch)].commitaddr, number, numberCommits, task);
    }

    //Selfdestruct
    function destroyRepo(address pubaddr, uint128 index) public view {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        uint256 key;
        this.destroyBranches{value: 0.1 ton, flag: 1}(key);
    }

    function destroyBranches(uint256 index) public senderIs(this) accept {
        for (uint128 i = 0; i < BATCH_SIZE_TREE; i++) {
            optional(uint256, Item) res = _Branches.next(index);
            if (res.hasValue()) {
                (uint256 key, Item data) = res.get();
                index = key;
                Commit(data.commitaddr).cleanTree{value: 0.1 ton, flag: 1}();
            }
            else {
                destroy();
                return;
            }
        }
        this.destroyBranches{value: 0.1 ton, flag: 1}(index);
    }

    function destroy() private {
        selfdestruct(_systemcontract);
    }

    //Setters
    function setCommit(string nameBranch, address oldcommit, string namecommit, uint128 number, uint128 number_commit, optional(ConfigCommit) task, bool force) public senderIs(getCommitAddr(namecommit)) {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_Branches.exists(tvm.hash(nameBranch)), ERR_BRANCH_NOT_EXIST);
        tvm.accept();
        if ((_Branches[tvm.hash(nameBranch)].commitaddr != oldcommit) && (force == false)) {
            Commit(getCommitAddr(namecommit)).NotCorrectRepo{value: 0.1 ton, flag: 1}(number);
            return;
        }
        _Branches[tvm.hash(nameBranch)] = Item(nameBranch, getCommitAddr(namecommit), version);
        if (task.hasValue()){
            ConfigCommit taskf = task.get();
            ConfigCommitBase tasksend = ConfigCommitBase({task: taskf.task, commit: getCommitAddr(namecommit), number_commit: number_commit, pubaddrassign: taskf.pubaddrassign, pubaddrreview: taskf.pubaddrreview, pubaddrmanager: taskf.pubaddrmanager, daoMembers: taskf.daoMembers});
            Task(taskf.task).isReady{value: 0.1 ton, flag: 1}(tasksend);
        }
        Commit(getCommitAddr(namecommit)).allCorrect{value: 0.1 ton, flag: 1}(number, nameBranch, force); 
    }

    function fromInitUpgrade2(string nameCommit, address commit, string ver, string branch) public view senderIs(getCommitAddr(nameCommit)) accept {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        if (_previousversion.hasValue() == false) { Commit(msg.sender).stopUpgrade{value:0.1 ton, flag: 1}();  return; }
        SystemContract(_systemcontract).fromInitUpgrade3{value: 0.3 ton, bounce: true, flag: 1}(_name, _nameDao, nameCommit, commit, ver, branch, msg.sender);
    }

    function fromInitUpgrade6(string nameCommit, address commit, string branch, address newcommit) public view senderIs(_systemcontract) accept {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        Commit(getCommitAddr(nameCommit)).fromInitUpgrade{value: 0.1 ton, flag: 1}(commit, branch, newcommit);
    }

    function setHEAD(address pubaddr, string nameBranch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(_Branches.exists(tvm.hash(nameBranch)), ERR_BRANCH_NOT_EXIST);
        tvm.accept();
        _head = nameBranch;
    }

    function updateRepoMetadata(address pubaddr, uint128 index, string metadata) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        _metadata = metadata;
    }

    //Protected branch

    function addProtectedBranch(address pubaddr, string branch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        if (_protectedBranch[tvm.hash(branch)] == true) { return; }
        _addProtectedBranch(branch);
    }

    function deleteProtectedBranch(address pubaddr, string branch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
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
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if ((_protectedBranch[tvm.hash(branch)] == false) || (isUpgrade == true)) {
            this.SendDiff{value: 0.7 ton, bounce: true, flag: 1}(branch, commit, number, numberCommits, task, isUpgrade);
            return;
        }
    }

    function smvdeployrepotag (address pub, uint128 index, string[] tag) public accept {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pub, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(tag.length + _counttag <= _limittag, ERR_TOO_MANY_TAGS);
        for (uint8 t = 0; t < tag.length; t++){
            if (_hashtag.exists(tvm.hash(tag[t]))) { continue; }
            _counttag++;
            _hashtag[tvm.hash(tag[t])] = tag[t];
            address addr = GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pub, index);
            GoshWallet(addr).deployRepoTag{value:0.2 ton, flag: 1}(_name, tag[t]);
        }
    }

    function smvdestroyrepotag (address pub, uint128 index, string[] tag) public accept {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pub, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        for (uint8 t = 0; t < tag.length; t++){
            if (_hashtag.exists(tvm.hash(tag[t])) == false) { continue; }
            _counttag--;
            delete _hashtag[tvm.hash(tag[t])];
            address addr = GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pub, index);
            GoshWallet(addr).destroyRepoTag{value:0.2 ton, flag: 1}(_name, tag[t]);
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

    function getRepoWalletAddr(address pubaddr) external view returns(address) {
        return GoshLib.calculateRepoRootWalletAddress(_code[m_TokenRepoWalletCode], _tokenroot.get(), pubaddr);
    }

    function getTreeAddr(uint256 shainnertree) external view returns(address) {
        return GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, address(this));
    }

    function getProtectedBranch() external view returns(mapping(uint256 => bool)) {
        return _protectedBranch;
    }

    function getSnapCode() external view returns(TvmCell) {
        return GoshLib.buildSnapshotCode(_code[m_SnapshotCode], address(this), version);
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

    function getSnapshotAddr(string commitsha, string name) external view returns(address) {
        return GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], this, commitsha, name);
    }

    function getDiffAddr (string commitName, uint128 index1, uint128 index2) external view returns(address) {
        return GoshLib.calculateDiffAddress(_code[m_DiffCode], address(this), commitName, index1, index2);
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
        return GoshLib.calculateCommitAddress(_code[m_CommitCode], address(this), nameCommit);
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
      
    function getTaskCode() external view returns(TvmCell) {
        return GoshLib.buildTaskCode(_code[m_TaskCode], address(this), version);
    }

    function getDetails() external view returns(string description, string name, Item[] alladress, string head, mapping(uint256 => string) hashtag, bool ready, optional(string) tokendescription, optional(Grants[]) tokengrants, optional(uint128) tokensupply, optional(address) tokenroot, string metadata)
    {
        Item[] AllBranches;
        for ((uint256 key, Item value) : _Branches) {
            key;
            AllBranches.push(value);
        }
        return (_description, _name, AllBranches, _head, _hashtag, _ready, _tokendescription, _tokengrants, _supply, _tokenroot, _metadata);
    }

    function getRepositoryIn() public view minValue(0.5 ton) {
        Item[] AllBranches;
        for ((uint256 key, Item value) : _Branches) {
            key;
            AllBranches.push(value);
        }
        IObject(msg.sender).returnRepo{value: 0.1 ton, flag: 1}(_description, _name, AllBranches, _head, _hashtag, _ready, _tokendescription, _tokengrants, _supply, _tokenroot, _metadata);
    }
}
