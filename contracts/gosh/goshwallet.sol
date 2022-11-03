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

/* import "./modifiers/modifiers.sol";
 */import "repository.sol";
import "commit.sol";
import "diff.sol";
import "tag.sol";
import "systemcontract.sol";
import "tree.sol";
import "goshwallet.sol";
import "profile.sol";
import "content-signature.sol";
import "./libraries/GoshLib.sol";
import "../smv/SMVAccount.sol";
import "../smv/Libraries/SMVConstants.sol";
import "../smv/LockerPlatform.sol";

abstract contract Object {
    function destroy(address pubaddr, uint128 index) external {}
}

contract GoshWallet is  Modifiers, SMVAccount, IVotingResultRecipient {

    //Modifiers
    modifier check_client(uint256 _platform_id) {
        uint256 expected = calcClientAddress (_platform_id);
        require ( msg.sender.value == expected, SMVErrors.error_not_my_client) ;
        _ ;
    }

    string constant version = "0.11.0";

    address static _systemcontract;
    address _rootpubaddr;
    string _nameDao;
    bool _flag = false;
    mapping(uint8 => TvmCell) _code;
    uint128 counter = 0;
    uint128 _last_time = 0;
    uint128 _walletcounter = 1;
    uint128 _limit_wallets;

    bool _tombstone = false;

    uint128 timeMoney = 0;

    constructor(
        address rootpubaddr,
        address pubaddr,
        string nameDao,
        TvmCell commitCode,
        TvmCell repositoryCode,
        TvmCell WalletCode,
        TvmCell TagCode,
        TvmCell SnapshotCode,
        TvmCell codeTree,
        TvmCell codeDiff,
        TvmCell contentSignature,
        uint128 limit_wallets,
        optional(uint256) access,
        //added for SMV
        TvmCell lockerCode,
        TvmCell tokenWalletCode,
        TvmCell platformCode,
        TvmCell clientCode,
        TvmCell proposalCode,
        address _tip3Root
    ) public SMVAccount(pubaddr, lockerCode, tokenWalletCode, tvm.hash(platformCode), platformCode.depth(),
                        tvm.hash(clientCode), clientCode.depth(), tvm.hash(proposalCode),
                        proposalCode.depth(), _tip3Root
    ) {
        _rootpubaddr = rootpubaddr;
        _nameDao = nameDao;
        _code[m_WalletCode] = WalletCode;
        if (_index == 0) { require(msg.sender == _goshdao, ERR_SENDER_NO_ALLOWED); }
        if (_index != 0) { require(msg.sender == _getWalletAddr(0), ERR_SENDER_NO_ALLOWED); }
        _code[m_CommitCode] = commitCode;
        _code[m_RepositoryCode] = repositoryCode;
        _code[m_TagCode] = TagCode;
        _code[m_SnapshotCode] = SnapshotCode;
        _code[m_TreeCode] = codeTree;
        _code[m_DiffCode] = codeDiff;
        _code[m_contentSignature] = contentSignature;
        _access = access;
        _limit_wallets = limit_wallets;
        ///////////////////
        m_SMVPlatformCode = platformCode;
        m_SMVClientCode = clientCode;
        m_SMVProposalCode = proposalCode;
        m_lockerCode = lockerCode;
        Profile(_pubaddr).deployedWallet(_systemcontract, _goshdao, _index, version);
        getMoney();
    }

    //Profile part
    function turnOnPubkey(
        uint256 pubkey
    ) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        _access = pubkey;
        getMoney();
        GoshWallet(_getWalletAddr(_index + 1)).turnOnPubkeyIn{value : 0.15 ton, flag: 1}(pubkey);
    }

    function turnOffPubkey(
    ) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        _access = null;
        getMoney();
        GoshWallet(_getWalletAddr(_index + 1)).turnOffPubkeyIn{value : 0.15 ton, flag: 1}();
    }

    function turnOnPubkeyIn(
        uint256 pubkey
    ) public senderIs(_getWalletAddr(_index - 1)) accept saveMsg {
        _access = pubkey;
        getMoney();
        GoshWallet(_getWalletAddr(_index + 1)).turnOnPubkeyIn{value : 0.15 ton, flag: 1}(pubkey);
    }

    function turnOffPubkeyIn(
    ) public senderIs(_getWalletAddr(_index - 1)) accept saveMsg {
        _access = null;
        getMoney();
        GoshWallet(_getWalletAddr(_index + 1)).turnOffPubkeyIn{value : 0.15 ton, flag: 1}();
    }

    //Content part
    function deployContent(
        string repoName,
        string commit,
        string label,
        string content
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = _buildRepositoryAddr(repoName);
        TvmCell deployCode = GoshLib.buildSignatureCode(_code[m_contentSignature], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: ContentSignature, varInit: {_commit : commit, _label : label, _systemcontract : _systemcontract, _goshdao : _goshdao}});
        new ContentSignature{
            stateInit: s1, value: 5 ton, wid: 0
        }(_pubaddr, _code[m_WalletCode], content, _index);
        getMoney();
    }

    function setTombstoneWallet(string description) public senderIs(_goshdao)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        _tombstone = true;
        if (_index >= _walletcounter - 1) { return; }
        GoshWallet(_getWalletAddr(_index + 1)).askForTombstone{value : 0.1 ton, flag: 1}(_index, description);
    }

    function askForTombstone(uint128 index, string description) public senderIs(_getWalletAddr(index)) {
        _tombstone = true;
        if (_index >= _walletcounter - 1) { return; }
        GoshWallet(_getWalletAddr(_index + 1)).askForTombstone{value : 0.1 ton, flag: 1}(_index, description);
    }
    
    function startProposalForUpgradeDao(
        string newversion,
        string description,
        uint128 num_clients
    ) public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        TvmBuilder proposalBuilder;
        uint256 proposalKind = SET_UPGRADE_PROPOSAL_KIND;
        proposalBuilder.store(proposalKind, newversion, description);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, SET_UPGRADE_PROPOSAL_START_AFTER, SET_UPGRADE_PROPOSAL_DURATION, num_clients);

        getMoney();
    }

    function startProposalForSetTombstoneDao(
        string description,
        uint128 num_clients
    ) public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        TvmBuilder proposalBuilder;
        uint256 proposalKind = SET_TOMBSTONE_PROPOSAL_KIND;
        proposalBuilder.store(proposalKind, description);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, SET_TOMBSTONE_PROPOSAL_START_AFTER, SET_TOMBSTONE_PROPOSAL_DURATION, num_clients);

        getMoney();
    }

    function startProposalForDeployWalletDao(
        address[] pubaddr,
        uint128 num_clients
    ) public onlyOwnerPubkeyOptional(_access) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        _saveMsg();

        TvmBuilder proposalBuilder;
        uint256 proposalKind = DEPLOY_WALLET_DAO_PROPOSAL_KIND;

        proposalBuilder.store(proposalKind, pubaddr);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, DEPLOY_WALLET_DAO_PROPOSAL_START_AFTER, DEPLOY_WALLET_DAO_PROPOSAL_DURATION, num_clients);

        getMoney();
    }

    function startProposalForDeleteWalletDao(
        address[] pubaddr,
        uint128 num_clients
    ) public onlyOwnerPubkeyOptional(_access) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        _saveMsg();

        TvmBuilder proposalBuilder;
        uint256 proposalKind = DELETE_WALLET_DAO_PROPOSAL_KIND;

        proposalBuilder.store(proposalKind, pubaddr);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, DELETE_WALLET_DAO_PROPOSAL_START_AFTER, DELETE_WALLET_DAO_PROPOSAL_DURATION, num_clients);

        getMoney();
    }

    function _setTombstoneDao(string description) private view {
    	GoshDao(_goshdao).setTombstone{value : 0.1 ton, flag : 1}(_pubaddr, _index, description);
    }
    
    function _upgradeDao(string newversion, string description) private view {
    	GoshDao(_goshdao).upgradeDao{value : 0.1 ton, flag : 1}(newversion, description, _pubaddr, _index);
    }

    function _deployWalletDao(address[] pubaddr) private view {
        GoshDao(_goshdao).deployWallet{value: 0.1 ton, flag : 1}(pubaddr, _pubaddr, _index);
    }

    function _deleteWalletDao(address[] pubaddr) private view {
        GoshDao(_goshdao).deleteWallet{value: 0.1 ton, flag : 1}(pubaddr, _pubaddr, _index);
    }

    function deployWallet() public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        if (_walletcounter >= _limit_wallets) { return; }
        if (_index != 0) { return; }
        _walletcounter += 1;
        TvmCell s1 = _composeWalletStateInit(_pubaddr, _walletcounter - 1);
        new GoshWallet {
            stateInit: s1, value: 60 ton, wid: 0
        }(  _rootpubaddr, _pubaddr, _nameDao,
            _code[m_CommitCode],
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _limit_wallets, _access,
            m_lockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, m_tokenRoot);
        getMoney();
    }

    function destroyWallet() public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        if (_walletcounter <= 1) { return; }
        if (_index != 0) { return; }
         GoshWallet(_getWalletAddr(_walletcounter - 1)).askForDestroy{value : 0.2 ton, flag: 1}();
         _walletcounter -= 1;
    }

    function _getWalletAddr(uint128 index) internal view returns(address) {
        TvmCell s1 = _composeWalletStateInit(_pubaddr, index);
        return address.makeAddrStd(0, tvm.hash(s1));
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

    //Money part
    function getMoney() private {
        if (now - timeMoney > 3600) { _flag = false; timeMoney = now; }
        if (_flag == true) { return; }
        if (address(this).balance > 20000 ton) { return; }
        _flag = true;
        SystemContract(_systemcontract).sendMoney{value : 0.2 ton}(_pubaddr, _goshdao, 21000 ton, _index);
    }

    function destroyObject(address obj) public onlyOwnerPubkeyOptional(_access)  accept view {
        require(_tombstone == false, ERR_TOMBSTONE);
        Object(obj).destroy{value : 0.2 ton, flag: 1}(_pubaddr, _index);
    }

    //Repository part
    function deployRepository(string nameRepo, optional(AddrVersion) previous) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(checkName(nameRepo), ERR_WRONG_NAME);
        address[] emptyArr;
        if (previous.hasValue() == false) {
            _deployCommit(nameRepo, "main", "0000000000000000000000000000000000000000", "", emptyArr, address.makeAddrNone(), false);
        }
        TvmCell s1 = _composeRepoStateInit(nameRepo);       
        new Repository {stateInit: s1, value: FEE_DEPLOY_REPO, wid: 0, flag: 1}(
            _pubaddr, nameRepo, _nameDao, _goshdao, _systemcontract, _code[m_CommitCode], _code[m_WalletCode], _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _index, previous);   
        getMoney();
    }

    function _composeRepoStateInit(string name) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            _code[m_RepositoryCode], _systemcontract, _goshdao, version
        );
        return tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: {_name: name}
        });
    }

    //Snapshot part
    function deployNewSnapshot(string branch, string commit, address repo, string name, bytes snapshotdata, optional(string) snapshotipfs) public onlyOwnerPubkeyOptional(_access)  accept saveMsg{
        require(_tombstone == false, ERR_TOMBSTONE);
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], repo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        new Snapshot{stateInit:stateInit, value: FEE_DEPLOY_SNAPSHOT, wid: 0, flag: 1}(_pubaddr, _systemcontract, _goshdao, repo, _code[m_SnapshotCode], _code[m_CommitCode], _code[m_DiffCode], _code[m_WalletCode], _code[m_TreeCode], branch, name, _index, snapshotdata, snapshotipfs, commit);
        getMoney();
    }

    function deleteSnapshot(address snap) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        Snapshot(snap).destroy{
            value: 0.1 ton, bounce: true, flag: 1
        }(_pubaddr, _index);
        getMoney();
    }

    //Diff part
    function deployDiff(
        string repoName,
        string branchName,
        string commitName,
        Diff[] diffs,
        uint128 index1,
        uint128 index2,
        bool last
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        _deployDiff(repoName, branchName, commitName, diffs, index1, index2, last);
    }

    function _deployDiff(
        string repoName,
        string branchName,
        string commitName,
        Diff[] diffs,
        uint128 index1,
        uint128 index2,
        bool last
    ) internal {
        address repo = _buildRepositoryAddr(repoName);
        TvmCell s1 = _composeDiffStateInit(commitName, repo, index1, index2);
        new DiffC {stateInit: s1, value: FEE_DEPLOY_DIFF, bounce: true, flag: 1, wid: 0}(
            _goshdao, _systemcontract, _pubaddr, repoName, branchName, repo, _code[m_WalletCode], _code[m_DiffCode], _code[m_CommitCode], diffs, _index, last);
        getMoney();
    }

    function _composeDiffStateInit(string _commit, address repo, uint128 index1, uint128 index2) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_DiffCode], repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: _commit, _index1: index1, _index2: index2}});
        return stateInit;
    }

    //Commit part
    function deployCommit(
        string repoName,
        string branchName,
        string commitName,
        string fullCommit,
        address[] parents,
        address tree,
        bool upgrade
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(parents.length <= 7, ERR_TOO_MANY_PARENTS);
        _deployCommit(repoName, branchName, commitName, fullCommit, parents, tree, upgrade);
    }

    function _deployCommit(
        string repoName,
        string branchName,
        string commitName,
        string fullCommit,
        address[] parents,
        address tree,
        bool upgrade
    ) internal {
        address repo = _buildRepositoryAddr(repoName);
        TvmCell s1 = _composeCommitStateInit(commitName, repo);
        new Commit {stateInit: s1, value: FEE_DEPLOY_COMMIT, bounce: true, flag: 1, wid: 0}(
            _goshdao, _systemcontract, _pubaddr, repoName, branchName, fullCommit, parents, repo, _code[m_WalletCode], _code[m_CommitCode], _code[m_DiffCode], _code[m_SnapshotCode], tree, _index, upgrade);
        getMoney();
    }

    function setCommit(
        string repoName,
        string branchName,
        string commit,
        uint128 numberChangedFiles,
        uint128 numberCommits
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        address repo = _buildRepositoryAddr(repoName);
        TvmCell s0 = _composeCommitStateInit(commit, repo);
        address addrC = address.makeAddrStd(0, tvm.hash(s0));
        isProposalNeeded(repoName, branchName, addrC, numberChangedFiles, numberCommits);
        tvm.accept();
        _saveMsg();
        getMoney();
    }

    function _composeCommitStateInit(string _commit, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_CommitCode], repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
    }

    //Branch part
    function deployBranch(
        string repoName,
        string newName,
        string fromCommit
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(checkName(newName), ERR_WRONG_NAME);
        address repo = _buildRepositoryAddr(repoName);
        Repository(repo).deployBranch{
            value: FEE_DEPLOY_BRANCH, bounce: true, flag: 1
        }(_pubaddr, newName, fromCommit, _index);
    }

    function deleteBranch(
        string repoName,
        string Name
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = _buildRepositoryAddr(repoName);
        Repository(repo).deleteBranch{
            value: FEE_DESTROY_BRANCH, bounce: true, flag: 1
        }(_pubaddr, Name, _index);
    }

    function setHEAD(
        string repoName,
        string branchName
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = _buildRepositoryAddr(repoName);
        Repository(repo).setHEAD{value: 1 ton, bounce: true, flag: 1}(_pubaddr, branchName, _index);
        getMoney();
    }

    //Tag part
    function deployTag(
        string repoName,
        string nametag,
        string nameCommit,
        string content,
        address commit
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = _buildRepositoryAddr(repoName);
        TvmCell deployCode = GoshLib.buildTagCode(_code[m_TagCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag}});
        new Tag{
            stateInit: s1, value: FEE_DEPLOY_TAG, wid: 0, bounce: true, flag: 1
        }(_pubaddr, nameCommit, commit, content, _systemcontract, _goshdao, _code[m_WalletCode], _index);
        getMoney();
    }

    function deleteTag(string repoName, string nametag) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = _buildRepositoryAddr(repoName);
        TvmCell deployCode = GoshLib.buildTagCode(_code[m_TagCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag}});
        address tagaddr = address.makeAddrStd(0, tvm.hash(s1));
        Tag(tagaddr).destroy{
            value: FEE_DESTROY_TAG, bounce: true
        }(_pubaddr, _index);
        getMoney();
    }

    //Config
    function updateConfig() public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        GoshDao(_goshdao).getConfigInfo{value: 0.15 ton, bounce: true, flag: 1}(_pubaddr, _index);
    }

    function setConfig(uint128 limit_wallets) public senderIs(_goshdao) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        _limit_wallets = limit_wallets;
        getMoney();
    }


    //Tree part
    function deployTree(
        string repoName,
        string shaTree,
        mapping(uint256 => TreeObject) datatree,
        optional(string) ipfs
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        _deployTree(repoName, shaTree, datatree, ipfs);
    }

    function _deployTree(
        string repoName,
        string shaTree,
        mapping(uint256 => TreeObject) datatree,
        optional(string) ipfs
    ) internal {
        address repo = _buildRepositoryAddr(repoName);
        TvmCell s1 = _composeTreeStateInit(shaTree, repo);
        new Tree{
            stateInit: s1, value: FEE_DEPLOY_TREE, wid: 0, bounce: true, flag: 1
        }(_pubaddr, datatree, ipfs, _systemcontract, _goshdao, _code[m_WalletCode], _code[m_DiffCode], _code[m_TreeCode], _code[m_CommitCode], _code[m_SnapshotCode], _index);
        getMoney();
    }

    function _composeTreeStateInit(string shaTree, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildTreeCode(_code[m_TreeCode], version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaTree: shaTree, _repo: repo}});
        return stateInit;
    }


    function isProposalNeeded(
        string repoName,
        string branchName,
        address commit,
        uint128 numberChangedFiles,
        uint128 numberCommits
    ) internal view  {
       Repository(_buildRepositoryAddr(repoName)).isNotProtected{value:1 ton, flag: 1}(_pubaddr, branchName, commit, numberChangedFiles, numberCommits, _index);
    }

    //SMV part
    function _startProposalForOperation(TvmCell dataCell, uint32 startTimeAfter, uint32 durationTime, uint128 num_clients) internal view
    {
        uint256 prop_id = tvm.hash(dataCell);
        uint32 startTime = now + startTimeAfter;
        uint32 finishTime = now + startTimeAfter + durationTime;
        startProposal(prop_id, dataCell, startTime, finishTime, num_clients );
    }

    function startProposalForSetCommit(
        string repoName,
        string branchName,
        string commit,
        uint128 numberChangedFiles,
        uint128 numberCommits,
        uint128 num_clients
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        _saveMsg();

        TvmBuilder proposalBuilder;
        uint256 proposalKind = SETCOMMIT_PROPOSAL_KIND;
        proposalBuilder.store(proposalKind, repoName, branchName, commit, numberChangedFiles, numberCommits);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, SETCOMMIT_PROPOSAL_START_AFTER, SETCOMMIT_PROPOSAL_DURATION, num_clients);

        getMoney();
    }

    function startProposalForAddProtectedBranch(
        string repoName,
        string branchName,
        uint128 num_clients
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        _saveMsg();

        TvmBuilder proposalBuilder;
        uint256 proposalKind = ADD_PROTECTED_BRANCH_PROPOSAL_KIND;
        proposalBuilder.store(proposalKind, repoName, branchName, now);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, ADD_PROTECTED_BRANCH_PROPOSAL_START_AFTER, ADD_PROTECTED_BRANCH_PROPOSAL_DURATION, num_clients);

        getMoney();
    }

    function startProposalForDeleteProtectedBranch(
        string repoName,
        string branchName,
        uint128 num_clients
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        _saveMsg();

        TvmBuilder proposalBuilder;
        uint256 proposalKind = DELETE_PROTECTED_BRANCH_PROPOSAL_KIND;
        proposalBuilder.store(proposalKind, repoName, branchName, now);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, DELETE_PROTECTED_BRANCH_PROPOSAL_START_AFTER, DELETE_PROTECTED_BRANCH_PROPOSAL_DURATION, num_clients);

        getMoney();
    }

    function tryProposalResult(address proposal) public onlyOwnerPubkeyOptional(_access)  accept saveMsg{
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        ISMVProposal(proposal).isCompleted{
            value: SMVConstants.VOTING_COMPLETION_FEE + SMVConstants.EPSILON_FEE
        }();
        getMoney();
    }


    function isCompletedCallback(
        uint256 _platform_id,
        optional(bool) res,
        TvmCell propData
    ) external override check_client(_platform_id) {
        tvm.accept();
        //for tests
        lastVoteResult = res;
        ////////////////////

        if (res.hasValue() && res.get()) {
            TvmSlice s = propData.toSlice();
            uint256 kind = s.decode(uint256);

            if (kind == SETCOMMIT_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (string repoName, string branchName, string commit, uint128 numberChangedFiles, uint128 numberCommits) =
                    s.decode(string, string, string, uint128, uint128);
                TvmCell s0 = _composeCommitStateInit(commit, _buildRepositoryAddr(repoName));
                address addrC = address.makeAddrStd(0, tvm.hash(s0));
                Repository(_buildRepositoryAddr(repoName)).SendDiffSmv{value: 0.71 ton, bounce: true, flag: 1}(_pubaddr, _index, branchName, addrC, numberChangedFiles, numberCommits);
            } else
            if (kind == ADD_PROTECTED_BRANCH_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (string repoName, string branchName) = s.decode(string, string);
                Repository(_buildRepositoryAddr(repoName)).addProtectedBranch{value:0.19 ton, flag: 1}(_pubaddr, branchName, _index);
            } else
            if (kind == DELETE_PROTECTED_BRANCH_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (string repoName, string branchName) = s.decode(string, string);
                Repository(_buildRepositoryAddr(repoName)).deleteProtectedBranch{value:0.19 ton, flag: 1}(_pubaddr, branchName, _index);
            } else
            if (kind == SET_TOMBSTONE_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (string description) = s.decode(string);
                _setTombstoneDao(description);
            } else
            if (kind == DEPLOY_WALLET_DAO_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                //_deployWalletDao(address[] pubaddr)
                (address[] pubaddr) = s.decode(address[]);
                _deployWalletDao(pubaddr);
            } else
            if (kind == DELETE_WALLET_DAO_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (address[] pubaddr) = s.decode(address[]);
                _deleteWalletDao(pubaddr);
            } else
            if (kind == SET_UPGRADE_PROPOSAL_KIND) {
                (string newversion, string description) = s.decode(string, string);
                _upgradeDao(newversion, description);
            }            
        }
    }

    //Fallback/Receive
    receive() external {
        if (msg.sender == _systemcontract) {
            _flag = false;
        }
    }

    //Selfdestruct
    function destroy() public view senderIs(_goshdao) {
        this.destroyWalletAll{value : 0.2 ton, flag: 1}();
    }

    function destroyWalletAll() public senderIs(address(this)) {
        if (_walletcounter <= 1) { selfdestruct(_goshdao); }
        if (_index != 0) { return; }
         GoshWallet(_getWalletAddr(_walletcounter - 1)).askForDestroy{value : 0.2 ton, flag: 1}();
         _walletcounter -= 1;
        this.destroyWalletAll{value : 0.2 ton, flag: 1}();
    }

    function askForDestroy() public senderIs(_getWalletAddr(0)) {
        selfdestruct(_goshdao);
    }

    //Getters
    function getContentCode(string repoName) external view returns(TvmCell) {
        address repo = _buildRepositoryAddr(repoName);
        return GoshLib.buildSignatureCode(_code[m_contentSignature], repo, version);
    }

    function getContentAdress(string repoName,
        string commit,
        string label) external view returns(address) {
        address repo = _buildRepositoryAddr(repoName);
        TvmCell deployCode = GoshLib.buildSignatureCode(_code[m_contentSignature], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: ContentSignature, varInit: {_commit : commit, _label : label, _systemcontract : _systemcontract, _goshdao : _goshdao}});
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getDiffAddr(string reponame, string commitName, uint128 index1, uint128 index2) external view returns(address) {
        address repo = _buildRepositoryAddr(reponame);
        TvmCell s1 = _composeDiffStateInit(commitName, repo, index1, index2);
        return  address(tvm.hash(s1));
    }

    function getAddrSystemContract() external view returns(address) {
        return _systemcontract;
    }

    function getAddrDao() external view returns(address) {
        return _goshdao;
    }

    function getRootAddress() external view returns(address) {
        return _rootpubaddr;
    }

    function getWalletAddress() external view returns(address) {
        return _pubaddr;
    }

    function getSnapshotAddr(string branch, address repo, string name) external view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], repo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }

    function getSnapshotCode(string branch, address repo) external view returns(TvmCell) {
        return GoshLib.buildSnapshotCode(_code[m_SnapshotCode], repo, branch, version);
    }

    function getConfig() external view returns(uint128) {
        return (_limit_wallets);
    }

    function getWalletAddr(uint128 index) external view returns(address) {
        return _getWalletAddr(index);
    }

    function getWalletOwner() external view returns(address) {
        return _pubaddr;
    }

    function getWalletsCount() external view returns(uint128) {
        return _walletcounter;
    }

    function getVersion() external pure returns(string) {
        return version;
    }

    function getDiffResult(bytes state, bytes diff) external pure returns(optional(bytes)) {
        return gosh.applyZipPatchQ(state, diff);
    }

    function getHash(bytes state) external pure returns(uint256) {
        return tvm.hash(state);
    }

    function getAccess() external view returns(optional(uint256)) {
        return _access;
    }

    function getTombstone() external view returns(bool) {
        return _tombstone;
    }

    //
    // Internals
    //
    function _buildRepositoryAddr(string name) private view returns (address) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            _code[m_RepositoryCode], _systemcontract, _goshdao, version
        );
        return address(tvm.hash(tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: { _name: name }
        })));
    }

    function _buildCommitAddr(
        string repoName,
        string commit
    ) private view returns(address) {
        address repo = _buildRepositoryAddr(repoName);
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_CommitCode], repo, version);
        TvmCell state = tvm.buildStateInit({
            code: deployCode,
            contr: Commit,
            varInit: { _nameCommit: commit }
        });
        return address(tvm.hash(state));
    }
}
