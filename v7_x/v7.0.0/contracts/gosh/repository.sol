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
    string constant version = "7.0.0";

    optional(AddrVersion) _previousversion;
    address _pubaddr;
    mapping(uint8 => TvmCell) _code;
    address _systemcontract;
    string static _name;
    string _nameDao;
    address public _goshdao;
    string _head;
    mapping(uint256 => Branch) _Branches;
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
    //    TvmCell data = tvm.codeSalt(tvm.code()).get();
    //    (uint256 codehash, uint256 hash) = abi.decode(data, (uint256, uint256));
    //    hash;
    //    require(codehash == tvm.hash(WalletCode), ERR_SENDER_NO_ALLOWED);
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
        string[] tags;
        _Branches[tvm.hash("main")] = Branch("main", GoshLib.calculateCommitAddress(_code[m_CommitCode], address(this), "0000000000000000000000000000000000000000", _code[m_WalletCode]), version, false, tags, 0);
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
        TvmBuilder b;
        b.store("Biodiversity");
        TvmCell data = tvm.setCodeSalt(_code[m_TokenRepoRootCode], b.toCell());
        b.store(address(this));
        TvmCell data1 = tvm.setCodeSalt(_code[m_TokenRepoWalletCode], b.toCell());
        TvmCell stateInit = tvm.buildStateInit({
            contr: TokenRoot,
            varInit: {
                randomNonce_: 0,
                deployer_: address(this),
                name_: name,
                symbol_: symbol,
                decimals_: decimals,
                rootOwner_: address(this),
                walletCode_: data1
            },
            code: data,
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
        TokenRoot(_tokenroot.get()).mint{value: FEE_DEPLOY_TOKEN_WALLET + 0.5 ton, flag: 1}(tokengrants[index].value, tokengrants[index].pubaddr, FEE_DEPLOY_TOKEN_WALLET, address(this), false, b);
        if (_supply.hasValue() == false) {
            _supply = tokengrants[index].value;
        }
        else {
            _supply = _supply.get() + tokengrants[index].value;
        }
        this.startGrantToken{value: 0.1 ton, flag: 1}(tokengrants, index + 1);
    }

    function transferFromWallet(address pubaddr, uint128 value, address pubaddr2) public view senderIs(_systemcontract) accept {
        address from = GoshLib.calculateRepoRootWalletAddress(_code[m_TokenRepoWalletCode], address(this), _tokenroot.get(), pubaddr);
        SystemContract(_systemcontract).transferFromWalletAgain{value: 0.1 ton, flag: 1}(_nameDao, _name, pubaddr, from, pubaddr2, value);
    }

    function checkUpdateRepo4(AddrVersion prev, address answer) public view senderIs(_systemcontract) accept {
        TvmCell a;
        if (prev.addr != address(this)) {
            a = abi.encode(false, _Branches, _head, _hashtag);
            Repository(answer).checkUpdateRepoVer5{value : 0.15 ton, flag: 1}(version, a);
            return;
        }
        a = abi.encode(true, _Branches, _head, _hashtag, _description, _tokendescription, _tokengrants, _supply, _tokenroot, _metadata);
        Repository(answer).checkUpdateRepoVer5{value : 0.15 ton, flag: 1}(version, a);
    }

    function checkUpdateRepoVer5(string ver, TvmCell a) public senderIs(_previousversion.get().addr) accept {
        if (ver == "7.0.0") {
            mapping(uint256 => string) hashtag;
            bool ans;
            (ans, _Branches, _head, hashtag, _description, _tokendescription, _tokengrants, _supply, _tokenroot, _metadata) = abi.decode(a, (bool , mapping(uint256 => Branch), string, mapping(uint256 => string), string, optional(string), optional(Grants[]), optional(uint128), optional(address), string));
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
        string[] tags;
        if ("0000000000000000000000000000000000000000" == fromcommit) { _Branches[tvm.hash(newname)] = Branch(newname, getCommitAddr(fromcommit), version, false, tags, 0); return; }
        Commit(getCommitAddr(fromcommit)).isCorrect{value: 0.23 ton, flag: 1}(newname);
    }

    function commitCorrect(string newname, string fromcommit) public senderIs(getCommitAddr(fromcommit)) {
        tvm.accept();
         require(_Branches.exists(tvm.hash(newname)) == false, ERR_BRANCH_EXIST);
        _Branches[tvm.hash(newname)].branchname = newname;
        _Branches[tvm.hash(newname)].commitaddr = getCommitAddr(fromcommit); 
        _Branches[tvm.hash(newname)].commitversion = version;
    }

    function deleteBranch(address pubaddr, string name, uint128 index) public minValue(0.3 ton){
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        tvm.accept();
        require(_Branches.exists(tvm.hash(name)), ERR_BRANCH_NOT_EXIST);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(_Branches[tvm.hash(name)].isProtected == false, ERR_BRANCH_PROTECTED);
        Commit(_Branches[tvm.hash(name)].commitaddr).cleanTree{value: 0.1 ton, flag: 1}();
        delete _Branches[tvm.hash(name)];
    }

    function initCommit(string namecommit, string branch, AddrVersion commit) public view senderIs(getCommitAddr(namecommit)) accept {
        require(_previousversion.hasValue(), ERR_WRONG_DATA);
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
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
        _Branches[tvm.hash(branch)].branchname = branch;
        _Branches[tvm.hash(branch)].commitaddr = getCommitAddr(namecommit); 
        _Branches[tvm.hash(branch)].commitversion = version;
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
        if (_Branches[tvm.hash(branch)].isProtected == true) {
            require(_Branches[tvm.hash(branch)].tags.length == 0, ERR_BRANCH_PROTECTED);
        }
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
            optional(uint256, Branch) res = _Branches.next(index);
            if (res.hasValue()) {
                (uint256 key, Branch data) = res.get();
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
        _Branches[tvm.hash(nameBranch)].branchname = nameBranch;
        _Branches[tvm.hash(nameBranch)].commitaddr = getCommitAddr(namecommit); 
        _Branches[tvm.hash(nameBranch)].commitversion = version;
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

    function updatePriorities(address pubaddr, uint128 index, BranchPriority[] priorities) public view {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        this.updatePrioritiesIn{value: 0.1 ton, flag: 1}(priorities, 0);
    }

    function updatePrioritiesIn(BranchPriority[] priorities, uint128 index) public senderIs(address(this)) {
        tvm.accept();   
        for (uint i = 0; i < 10; i++) {
            if (priorities.length <= index + i) {
                return;
            }
            if (_Branches.exists(tvm.hash(priorities[index + i].name))) {
                _Branches[tvm.hash(priorities[index + i].name)].priority = priorities[index + i].priority;
            }
        }     
        this.updatePrioritiesIn{value: 0.1 ton, flag: 1}(priorities, index + 10);
    }

    //Protected branch

    function addProtectedBranch(address pubaddr, string branch, string[] tags, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(tags.length <= 4,ERR_TOO_MANY_TAGS);
        tvm.accept();
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        _addProtectedBranch(branch, tags);
    }

    function deleteProtectedBranch(address pubaddr, string branch, uint128 index) public {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (_Branches.exists(tvm.hash(branch)) == false) { return; }
        if (_Branches[tvm.hash(branch)].isProtected == false) { return; }
        _deleteProtectedBranch(branch);
    }

    function _addProtectedBranch(string branch, string[] tags) private {
        _Branches[tvm.hash(branch)].isProtected = true;
        _Branches[tvm.hash(branch)].tags = tags;
    }

    function _deleteProtectedBranch(string branch) private {
        _Branches[tvm.hash(branch)].isProtected = false;
        string[] tags;
        _Branches[tvm.hash(branch)].tags = tags;
    }

    function isNotProtected(address pubaddr, string branch, address commit, uint128 number, uint128 numberCommits, optional(ConfigCommit) task, bool isUpgrade, mapping(uint256=> bool) membertag, uint128 index) public view {
        require(_ready == true, ERR_REPOSITORY_NOT_READY);
        require(_Branches.exists(tvm.hash(branch)), ERR_BRANCH_NOT_EXIST);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if ((_Branches[tvm.hash(branch)].isProtected == false) || (isUpgrade == true)) {
            this.SendDiff{value: 0.7 ton, bounce: true, flag: 1}(branch, commit, number, numberCommits, task, isUpgrade);
            return;
        } else {
            for (uint128 i = 0; i < _Branches[tvm.hash(branch)].tags.length; i++){
                if (membertag[tvm.hash(_Branches[tvm.hash(branch)].tags[i])] == true) {
                    this.SendDiff{value: 0.7 ton, bounce: true, flag: 1}(branch, commit, number, numberCommits, task, isUpgrade);
                    return;
                }
            }    
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
        TvmCell deployCode = GoshLib.buildSignatureCode(_code[m_contentSignature], repo, version, _code[m_WalletCode]);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: ContentSignature, varInit: {_commit : commit, _label : label, _systemcontract : _systemcontract, _goshdao : _goshdao}});
       return address.makeAddrStd(0, tvm.hash(s1));
    }

    function isBranchProtected(string branch) external view returns(optional(Branch)) {
        if (_Branches[tvm.hash(branch)].isProtected == true) {
            return _Branches[tvm.hash(branch)];
        }
        return null;
    }

    function getRepoWalletAddr(address pubaddr) external view returns(address) {
        return GoshLib.calculateRepoRootWalletAddress(_code[m_TokenRepoWalletCode], address(this), _tokenroot.get(), pubaddr);
    }

    function getTreeAddr(uint256 shainnertree) external view returns(address) {
        return GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, address(this), _code[m_WalletCode]);
    }

    function getSnapCode() external view returns(TvmCell) {
        return GoshLib.buildSnapshotCode(_code[m_SnapshotCode], address(this), version, _code[m_WalletCode]);
    }

    function getAddrBranch(string name) external view returns(Branch) {
        return _Branches[tvm.hash(name)];
    }

    function getAllAddress() external view returns(Branch[]) {
        Branch[] AllBranches;
        for ((uint256 key, Branch value) : _Branches) {
            key;
            AllBranches.push(value);
        }
        return AllBranches;
    }

    function getSnapshotAddr(string commitsha, string name) external view returns(address) {
        return GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], this, commitsha, name, _code[m_WalletCode]);
    }

    function getDiffAddr (string commitName, uint128 index1, uint128 index2) external view returns(address) {
        return GoshLib.calculateDiffAddress(_code[m_DiffCode], address(this), commitName, index1, index2, _code[m_WalletCode]);
    }

    function getTags() external view returns(mapping(uint256 => string)) {
        return _hashtag;
    }

    function getCommitCode() external view returns(TvmCell) {
        return _code[m_CommitCode];
    }

    function getTagCode() external view returns(TvmCell) {
        return GoshLib.buildTagCode(_code[m_TagCode], address(this), version, _code[m_WalletCode]);
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
        return GoshLib.calculateCommitAddress(_code[m_CommitCode], address(this), nameCommit, _code[m_WalletCode]);
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
        return GoshLib.buildTaskCode(_code[m_TaskCode], address(this), version, _goshdao);
    }

    function getTokenRootCode() external view returns(TvmCell) {
        TvmBuilder b;
        b.store("Biodiversity");
        return tvm.setCodeSalt(_code[m_TokenRepoRootCode], b.toCell());
    }    

    function getDetails() external view returns(string description, string name, Branch[] alladress, string head, mapping(uint256 => string) hashtag, bool ready, optional(string) tokendescription, optional(Grants[]) tokengrants, optional(uint128) tokensupply, optional(address) tokenroot, string metadata)
    {
        Branch[] AllBranches;
        for ((uint256 key, Branch value) : _Branches) {
            key;
            AllBranches.push(value);
        }
        return (_description, _name, AllBranches, _head, _hashtag, _ready, _tokendescription, _tokengrants, _supply, _tokenroot, _metadata);
    }

    function getRepositoryIn() public view minValue(0.5 ton) {
        Branch[] AllBranches;
        for ((uint256 key, Branch value) : _Branches) {
            key;
            AllBranches.push(value);
        }
        IObject(msg.sender).returnRepo{value: 0.1 ton, flag: 1}(_description, _name, AllBranches, _head, _hashtag, _ready, _tokendescription, _tokengrants, _supply, _tokenroot, _metadata);
    }
}
