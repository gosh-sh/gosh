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
import "gosh.sol";
import "repository.sol";
import "commit.sol";
import "diff.sol";
import "tag.sol";
import "daocreator.sol";
import "tree.sol";
import "goshwallet.sol";
import "goshdao.sol";
import "./libraries/GoshLib.sol";
import "../smv/SMVAccount.sol";
import "../smv/Libraries/SMVConstants.sol";
import "../smv/LockerPlatform.sol";

abstract contract Object {
    function destroy(uint128 index) external {}
}

contract GoshWallet is Modifiers, SMVAccount, IVotingResultRecipient {
    
    //Modifiers
    modifier check_client(uint256 _platform_id, address _tokenLocker) {
        uint256 expected = calcClientAddress (_platform_id, _tokenLocker);
        require ( msg.sender.value == expected, SMVErrors.error_not_my_client) ;
        _ ;
    }

    string constant version = "0.5.1";
    
    address _creator;
    uint256 static _rootRepoPubkey;
    address static _rootgosh;
    address static _goshdao;
    uint128 static _index;
    bool _flag = false;
    TvmCell m_RepositoryCode;
    TvmCell m_CommitCode;
    TvmCell m_WalletCode;
    TvmCell m_TagCode;
    TvmCell m_SnapshotCode;
    TvmCell m_codeTree;
    TvmCell m_codeDiff;

    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode;
    TvmCell m_lockerCode;
    address _tip3root;

    uint128 counter = 0;
    uint128 _last_time = 0;
    uint128 _limit_wallets;
    uint128 _limit_messages;
    uint128 _limit_time;
    uint128 _walletcounter = 1;
    
    constructor(
        address creator,
        TvmCell commitCode,
        TvmCell repositoryCode,
        TvmCell WalletCode, 
        TvmCell TagCode,
        TvmCell SnapshotCode,
        TvmCell codeTree,
        TvmCell codeDiff,
        uint128 limit_wallets,
        uint128 limit_time,
        uint128 limit_messages,
         //added for SMV
        TvmCell lockerCode,
        TvmCell platformCode,
        TvmCell clientCode,
        TvmCell proposalCode,
        address _tip3Root
    ) public SMVAccount(lockerCode, tvm.hash(platformCode), platformCode.depth(),
                        tvm.hash(clientCode), clientCode.depth(), tvm.hash(proposalCode),
                        proposalCode.depth(), _tip3Root
    ) {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        m_WalletCode = WalletCode;
        if (_index == 0) { require(msg.sender == _goshdao, ERR_SENDER_NO_ALLOWED); }
        if (_index != 0) { require(msg.sender == _getWalletAddr(0), ERR_SENDER_NO_ALLOWED); }
        _creator = creator;
        m_CommitCode = commitCode;
        m_RepositoryCode = repositoryCode;
        m_TagCode = TagCode;
        m_SnapshotCode = SnapshotCode;
        m_codeTree = codeTree;
        m_codeDiff = codeDiff;
        _limit_wallets = limit_wallets;
        _limit_time = limit_time;
        _limit_messages = limit_messages;
        ///////////////////
        m_SMVPlatformCode = platformCode;
        m_SMVClientCode = clientCode;
        m_SMVProposalCode = proposalCode;
        m_lockerCode = lockerCode;
        _tip3root = _tip3Root;
        getMoney();
    }
    
    //Multiwallets part
    function checkDeployWallets() private {
        counter = 0;
        if (now - _last_time > _limit_time) { _last_time = now; return; }
        if (_walletcounter >= _limit_wallets) { return; }
        if (_index != 0) { GoshWallet(_getWalletAddr(0)).askForDeploy{value : 0.2 ton, flag: 1}(_index); _last_time = now; return; }
        _deployWallet();
        _last_time = now;
        getMoney();
    }
    
    function askForDeploy(uint128 index) public senderIs(_getWalletAddr(index)) {
        _deployWallet();
    }
    
    function _deployWallet() private {
        if (_walletcounter >= _limit_wallets) { return; }
        _walletcounter += 1;
        TvmCell s1 = _composeWalletStateInit(tvm.pubkey(), _walletcounter - 1);
        new GoshWallet {
            stateInit: s1, value: 60 ton, wid: 0
        }(_creator, m_CommitCode, 
            m_RepositoryCode,
            m_WalletCode,
            m_TagCode, m_SnapshotCode, m_codeTree, m_codeDiff, _limit_wallets, _limit_time, _limit_messages, 
            m_lockerCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, _tip3root);
        getMoney();
    }
    
    function destroyWallet() public onlyOwner accept saveMsg {
         GoshWallet(_getWalletAddr(_walletcounter - 1)).askForDestroy{value : 0.2 ton, flag: 1}();
         _walletcounter -= 1;
    }
    
    function _getWalletAddr(uint128 index) internal view returns(address) {
        TvmCell s1 = _composeWalletStateInit(tvm.pubkey(), index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function _composeWalletStateInit(uint256 pubkey, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(m_WalletCode, pubkey, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            pubkey: pubkey,
            contr: GoshWallet,
            varInit: {_rootRepoPubkey: _rootRepoPubkey, _rootgosh : _rootgosh, _goshdao: _goshdao, _index: index}
        });
        return _contractflex;
    }
    
    //Money part
    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 20000 ton) { return; }
        _flag = true;
        DaoCreator(_creator).sendMoney{value : 0.2 ton}(_rootRepoPubkey, tvm.pubkey(), _goshdao, 21000 ton, _index);
    }
    
    function sendMoney(address repo, string commit) public {
        TvmCell s0 = _composeCommitStateInit(commit, repo);
        address addr = address.makeAddrStd(0, tvm.hash(s0));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(100 ton);
        getMoney();
    }
    
    function sendMoneyDiff(address repo, string commit, uint128 index1, uint128 index2) public {
        TvmCell s0 = _composeDiffStateInit(commit, repo, index1, index2);
        address addr = address.makeAddrStd(0, tvm.hash(s0));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(50 ton);
        getMoney();
    }
    
    function sendMoneyTree(address repo, string shaTree) public {
        TvmCell s1 = _composeTreeStateInit(shaTree, repo);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(80 ton);
        getMoney();
    }
    
    function destroyObject(address obj) public onlyOwner accept view {
        Object(obj).destroy{value : 0.2 ton, flag: 1}(_index);
    }

    //Repository part
    function deployRepository(string nameRepo) public onlyOwner accept saveMsg {
        require(checkName(nameRepo), ERR_WRONG_NAME);
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        address[] emptyArr;
        _deployCommit(nameRepo, "main", "0000000000000000000000000000000000000000", "", emptyArr, address.makeAddrNone());
        TvmCell s1 = _composeRepoStateInit(nameRepo);
        new Repository {stateInit: s1, value: FEE_DEPLOY_REPO, wid: 0, flag: 1}(
            _rootRepoPubkey, tvm.pubkey(), nameRepo, _goshdao, _rootgosh, m_CommitCode, m_WalletCode, m_TagCode, m_SnapshotCode, _index);
        getMoney();
    }
    
    function _composeRepoStateInit(string name) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            m_RepositoryCode, _rootgosh, _goshdao, version
        );
        return tvm.buildStateInit({
            code: deployCode, 
            contr: Repository,
            varInit: {_name: name}
        });
    }
    
    
    //Snapshot part
    function deployNewSnapshot(string branch, string commit, address repo, string name, bytes snapshotdata, optional(string) snapshotipfs) public onlyOwner accept saveMsg{
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        TvmCell deployCode = GoshLib.buildSnapshotCode(m_SnapshotCode, repo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        new Snapshot{stateInit:stateInit, value: FEE_DEPLOY_SNAPSHOT, wid: 0, flag: 1}(tvm.pubkey(), _rootRepoPubkey, _rootgosh, _goshdao, repo, m_SnapshotCode, m_CommitCode, m_codeDiff, m_WalletCode, m_codeTree, branch, name, _index, snapshotdata, snapshotipfs, commit);
        getMoney();
    }

    function deleteSnapshot(address snap) public onlyOwner accept saveMsg {
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        Snapshot(snap).destroy{
            value: 0.1 ton, bounce: true, flag: 1
        }(tvm.pubkey(), _index);
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
    ) public onlyOwner accept saveMsg {
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
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
            _goshdao, _rootgosh, _rootRepoPubkey, tvm.pubkey(), repoName, branchName, repo, m_WalletCode, m_codeDiff, m_CommitCode, diffs, _index, last);
        getMoney();
    }
    
    function _composeDiffStateInit(string _commit, address repo, uint128 index1, uint128 index2) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeDiff, repo, version);
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
        address tree
    ) public onlyOwner accept saveMsg {
        require(parents.length <= 7, ERR_TOO_MANY_PARENTS);
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        _deployCommit(repoName, branchName, commitName, fullCommit, parents, tree);
    }

    function _deployCommit(
        string repoName,
        string branchName,
        string commitName,
        string fullCommit,
        address[] parents,
        address tree
    ) internal {
        address repo = _buildRepositoryAddr(repoName);
        TvmCell s1 = _composeCommitStateInit(commitName, repo);
        new Commit {stateInit: s1, value: FEE_DEPLOY_COMMIT, bounce: true, flag: 1, wid: 0}(
            _goshdao, _rootgosh, _rootRepoPubkey, tvm.pubkey(), repoName, branchName, fullCommit, parents, repo, m_WalletCode, m_CommitCode, m_codeDiff, m_SnapshotCode, tree, _index);
        getMoney();
    }

    function setCommit(
        string repoName,
        string branchName,
        string commit,
        uint128 numberChangedFiles
    ) public onlyOwner {
        tvm.accept();
        address repo = _buildRepositoryAddr(repoName);
        TvmCell s0 = _composeCommitStateInit(commit, repo);
        address addrC = address.makeAddrStd(0, tvm.hash(s0));
        isProposalNeeded(repoName, branchName, addrC, numberChangedFiles);
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        tvm.accept();
        _saveMsg();
        getMoney();
    }
    
    function _composeCommitStateInit(string _commit, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_CommitCode, repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
    }

    //Branch part
    function deployBranch(
        string repoName,
        string newName,
        string fromCommit
    ) public onlyOwner accept saveMsg {
        require(checkName(newName), ERR_WRONG_NAME);
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        address repo = _buildRepositoryAddr(repoName);
        Repository(repo).deployBranch{
            value: FEE_DEPLOY_BRANCH, bounce: true, flag: 1
        }(tvm.pubkey(), newName, fromCommit, _index);
    }

    function deleteBranch(
        string repoName,
        string Name
    ) public onlyOwner accept saveMsg {
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        address repo = _buildRepositoryAddr(repoName);
        Repository(repo).deleteBranch{
            value: FEE_DESTROY_BRANCH, bounce: true, flag: 1
        }(tvm.pubkey(), Name, _index);
    }
    
    function setHEAD(
        string repoName,
        string branchName
    ) public onlyOwner accept saveMsg {
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        address repo = _buildRepositoryAddr(repoName);
        Repository(repo).setHEAD{value: 1 ton, bounce: true, flag: 1}(tvm.pubkey(), branchName, _index);
        getMoney();
    }

    //Tag part
    function deployTag(
        string repoName,
        string nametag,
        string nameCommit,
        string content,
        address commit
    ) public onlyOwner accept saveMsg {
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        address repo = _buildRepositoryAddr(repoName);
        TvmCell deployCode = GoshLib.buildTagCode(m_TagCode, repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag}});
        new Tag{
            stateInit: s1, value: FEE_DEPLOY_TAG, wid: 0, bounce: true, flag: 1
        }(_rootRepoPubkey, tvm.pubkey(), nameCommit, commit, content, _rootgosh, _goshdao, m_WalletCode, _index);
        getMoney();
    }

    function deleteTag(string repoName, string nametag) public onlyOwner accept saveMsg {
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        address repo = _buildRepositoryAddr(repoName);
        TvmCell deployCode = GoshLib.buildTagCode(m_TagCode, repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag}});
        address tagaddr = address.makeAddrStd(0, tvm.hash(s1));
        Tag(tagaddr).destroy{
            value: FEE_DESTROY_TAG, bounce: true
        }(tvm.pubkey(), _index);
        getMoney();
    }
    
    //Tree part
    function deployTree(
        string repoName,
        string shaTree,
        mapping(uint256 => TreeObject) datatree,
        optional(string) ipfs
    ) public onlyOwner accept saveMsg {
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
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
        }(tvm.pubkey(), datatree, ipfs, _rootgosh, _goshdao, _rootRepoPubkey, m_WalletCode, m_codeDiff, m_codeTree, m_CommitCode, _index);
        getMoney();
    }
    
    
    function setTree(
        string repoName,
        string commitName,
        address tree
    ) public onlyOwner accept saveMsg {
        counter += 1;
        if (counter == _limit_messages) { checkDeployWallets(); }
        address repo = _buildRepositoryAddr(repoName);
        TvmCell s1 = _composeCommitStateInit(commitName, repo);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        Commit(addr).setTree{value: 1 ton, bounce: true}(tvm.pubkey(), tree, _index);
        getMoney();
    }
    
    function _composeTreeStateInit(string shaTree, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildTreeCode(m_codeTree, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaTree: shaTree, _repo: repo}});
        //return tvm.insertPubkey(stateInit, pubkey);
        return stateInit;
    }
    

    function isProposalNeeded(
        string repoName,
        string branchName,
        address commit,
        uint128 numberChangedFiles
    ) internal view  {
       Repository(_buildRepositoryAddr(repoName)).isNotProtected{value:0.31 ton, flag: 1}(tvm.pubkey(), branchName, commit, numberChangedFiles, _index);
    }
    
    //SMV part       
    function _startProposalForOperation(TvmCell dataCell, uint32 startTimeAfter, uint32 durationTime) internal view
    {
        uint256 prop_id = tvm.hash(dataCell); 
        uint32 startTime = now + startTimeAfter;
        uint32 finishTime = now + startTimeAfter + durationTime;
        startProposal(m_SMVPlatformCode, m_SMVProposalCode, prop_id, dataCell, startTime, finishTime);
    }

    function startProposalForSetCommit(
        string repoName,
        string branchName,
        string commit,
        uint128 numberChangedFiles
    ) public onlyOwner {
        tvm.accept();
        _saveMsg();

        TvmBuilder proposalBuilder;
        uint256 proposalKind = SETCOMMIT_PROPOSAL_KIND;
        proposalBuilder.store(proposalKind, repoName, branchName, commit, numberChangedFiles);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, SETCOMMIT_PROPOSAL_START_AFTER, SETCOMMIT_PROPOSAL_DURATION);

        getMoney();
    }
    
    function startProposalForAddProtectedBranch(
        string repoName,
        string branchName
    ) public onlyOwner {
        tvm.accept();
        _saveMsg();

        TvmBuilder proposalBuilder;
        uint256 proposalKind = ADD_PROTECTED_BRANCH_PROPOSAL_KIND;
        proposalBuilder.store(proposalKind, repoName, branchName, now);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, ADD_PROTECTED_BRANCH_PROPOSAL_START_AFTER, ADD_PROTECTED_BRANCH_PROPOSAL_DURATION);

        getMoney();
    }

    function startProposalForDeleteProtectedBranch(
        string repoName,
        string branchName
    ) public onlyOwner {
        tvm.accept();
        _saveMsg();

        TvmBuilder proposalBuilder;
        uint256 proposalKind = DELETE_PROTECTED_BRANCH_PROPOSAL_KIND;
        proposalBuilder.store(proposalKind, repoName, branchName, now);
        TvmCell c = proposalBuilder.toCell();

        _startProposalForOperation(c, DELETE_PROTECTED_BRANCH_PROPOSAL_START_AFTER, DELETE_PROTECTED_BRANCH_PROPOSAL_DURATION);

        getMoney();
    }
    
    function tryProposalResult(address proposal) public onlyOwner accept saveMsg{
        ISMVProposal(proposal).isCompleted{
            value: SMVConstants.VOTING_COMPLETION_FEE + SMVConstants.EPSILON_FEE
        }();
        getMoney();
    }

    function calcClientAddress(uint256 _platform_id, address _tokenLocker) internal view returns(uint256) {
        TvmCell dataCell = tvm.buildDataInit({
            contr: LockerPlatform,
            varInit: {
                tokenLocker: _tokenLocker,
                platform_id: _platform_id
            }
        });
        uint256 dataHash = tvm.hash(dataCell);
        uint16 dataDepth = dataCell.depth();

        uint256 add_std_address = tvm.stateInitHash(
            tvm.hash(m_SMVPlatformCode),
            dataHash,
            m_SMVPlatformCode.depth(),
            dataDepth
        );
        return add_std_address;
    }
    
    function isCompletedCallback(
        uint256 _platform_id,
        address _tokenLocker,
        optional(bool) res,
        TvmCell propData
    ) external override check_client(_platform_id, _tokenLocker) {
        //for tests
        lastVoteResult = res;
        ////////////////////

        if (res.hasValue() && res.get()) {
            TvmSlice s = propData.toSlice();
            uint256 kind = s.decode(uint256);

            if (kind == SETCOMMIT_PROPOSAL_KIND) {
                (string repoName, string branchName, string commit, uint128 numberChangedFiles) =
                    s.decode(string, string, string, uint128);
                TvmCell s0 = _composeCommitStateInit(commit, _buildRepositoryAddr(repoName));
                address addrC = address.makeAddrStd(0, tvm.hash(s0));
                Repository(_buildRepositoryAddr(repoName)).SendDiffSmv{value: 0.71 ton, bounce: true, flag: 1}(tvm.pubkey(), _index, branchName, addrC, numberChangedFiles);
            } else
            if (kind == ADD_PROTECTED_BRANCH_PROPOSAL_KIND) {
                (string repoName, string branchName) = s.decode(string, string);
                Repository(_buildRepositoryAddr(repoName)).addProtectedBranch{value:0.19 ton, flag: 1}(tvm.pubkey(), branchName, _index);
            } else 
            if (kind == DELETE_PROTECTED_BRANCH_PROPOSAL_KIND) {
                (string repoName, string branchName) = s.decode(string, string);
                Repository(_buildRepositoryAddr(repoName)).deleteProtectedBranch{value:0.19 ton, flag: 1}(tvm.pubkey(), branchName, _index);
            }  
        }
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _creator) {
            _flag = false;
        }
    }
    
    //Selfdestruct
    function destroy() public senderIs(_goshdao) {
        selfdestruct(_goshdao);
    }
    
    function askForDestroy() public senderIs(_getWalletAddr(0)) {
        selfdestruct(msg.sender);
    }

    //Getters
    
    function getDiffAddr(string reponame, string commitName, uint128 index1, uint128 index2) external view returns(address) {
        address repo = _buildRepositoryAddr(reponame);
        TvmCell s1 = _composeDiffStateInit(commitName, repo, index1, index2);
        return  address(tvm.hash(s1));
    }

    function getAddrRootGosh() external view returns(address) {
        return _rootgosh;
    }

    function getAddrDao() external view returns(address) {
        return _goshdao;
    }

    function getRootPubkey() external view returns(uint256) {
        return _rootRepoPubkey;
    }

    function getWalletPubkey() external view returns(uint256) {
        return tvm.pubkey();
    }

    function afterSignatureCheck(TvmSlice body, TvmCell message) private inline returns (TvmSlice) {
        // load and drop message timestamp (uint64)
        (, uint32 expireAt) = body.decode(uint64, uint32);
        require(expireAt > now, 57);
        uint256 msgHash = tvm.hash(message);
        require(!m_messages.exists(msgHash), ERR_DOUBLE_MSG);
        m_lastMsg = LastMsg(expireAt, msgHash);
        return body;
    }
    
    function getSnapshotAddr(string branch, address repo, string name) external view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(m_SnapshotCode, repo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }
    
    function getTreeAddr(address repo, string treeName) external view returns(address) {
        TvmCell s1 = _composeTreeStateInit(treeName, repo);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function getSnapshotCode(string branch, address repo) external view returns(TvmCell) {
        return GoshLib.buildSnapshotCode(m_SnapshotCode, repo, branch, version);
    }    
    
    function getWalletAddr(uint128 index) external view returns(address) {
        return _getWalletAddr(index);
    }

    function getWalletsCount() external view returns(uint128) {
        return _walletcounter;
    }
    
    function getVersion() external pure returns(string) {
        return version;
    }
    
    //
    // Internals
    //
    function _buildRepositoryAddr(string name) private view returns (address) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            m_RepositoryCode, _rootgosh, _goshdao, version
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
        TvmCell deployCode = GoshLib.buildCommitCode(m_CommitCode, repo, version);
        TvmCell state = tvm.buildStateInit({
            code: deployCode,
            contr: Commit,
            varInit: { _nameCommit: commit }
        });
        return address(tvm.hash(state));
    }
}
