// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./repository.sol";
import "./commit.sol";
import "./diff.sol";
import "./daotag.sol";
import "./tag.sol";
import "./systemcontract.sol";
import "./task.sol";
import "./bigtask.sol";
import "./tree.sol";
import "./goshwallet.sol";
import "./profile.sol";
import "./taggosh.sol";
import "./grant.sol";
import "./content-signature.sol";
import "./topic.sol";
import "./libraries/GoshLib.sol";
import "./smv/SMVAccount.sol";
import "./smv/Libraries/SMVConstants.sol";
import "./smv/LockerPlatform.sol";
import "./smv/modifiers/SMVconfiguration.sol";

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

    string constant version = "6.2.0";
    address _versionController;
    address static _systemcontract;
    address _rootpubaddr;
    string _nameDao;
    bool _flag = false;
    uint128 _limittag = 4;
    mapping(uint8 => TvmCell) _code;
    uint128 counter = 0;
    uint128 _last_time = 0;
    uint128 _walletcounter = 1;
    uint128 _limit_wallets;
    mapping(uint256 => string) public _versions;
    mapping(uint128 => address) public _indexes;

    bool public _tombstone = false;
    bool public _limited = true;
    optional(uint128) _expiredTime;

    uint128 timeMoney = 0;

    constructor(
        address versionController,
        address rootpubaddr,
        address pubaddr,
        string nameDao,
        TvmCell codeDao,
        TvmCell commitCode,
        TvmCell repositoryCode,
        TvmCell WalletCode,
        TvmCell TagCode,
        TvmCell SnapshotCode,
        TvmCell codeTree,
        TvmCell codeDiff,
        TvmCell contentSignature,
        TvmCell codeTask,
        TvmCell codeBigTask,
        TvmCell codedaotag,
        TvmCell coderepotag,
        TvmCell topiccode,
        TvmCell grantCode,
        mapping(uint256 => string) versions,
        uint128 limit_wallets,
        optional(uint256) access,
        //added for SMV
        TvmCell lockerCode,
        TvmCell tokenWalletCode,
        TvmCell platformCode,
        TvmCell clientCode,
        TvmCell proposalCode,
        uint128 tokenforperson,
        address _tip3Root
    ) SMVAccount(pubaddr, lockerCode, tokenWalletCode, tvm.hash(platformCode), platformCode.depth(),
                        tvm.hash(clientCode), clientCode.depth(), tvm.hash(proposalCode),
                        proposalCode.depth(), tokenforperson, _tip3Root
    ) {
        _versions = versions;
        _versionController = versionController;
        _rootpubaddr = rootpubaddr;
        _nameDao = nameDao;
        _code[m_DaoCode] = codeDao;
        _code[m_WalletCode] = WalletCode;
        if (_index == 0) { require(msg.sender == _goshdao, ERR_SENDER_NO_ALLOWED); }
        if (_index != 0) { require(msg.sender == GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, 0), ERR_SENDER_NO_ALLOWED); }
        _code[m_CommitCode] = commitCode;
        _code[m_RepositoryCode] = repositoryCode;
        _code[m_TagCode] = TagCode;
        _code[m_SnapshotCode] = SnapshotCode;
        _code[m_TreeCode] = codeTree;
        _code[m_DiffCode] = codeDiff;
        _code[m_contentSignature] = contentSignature;
        _code[m_TaskCode] = codeTask;
        _code[m_BigTaskCode] = codeBigTask;
        _code[m_DaoTagCode] = codedaotag;
        _code[m_RepoTagCode] = coderepotag;
        _code[m_TopicCode] = topiccode;
        _code[m_GrantCode] = grantCode;
        _access = access;
        _limit_wallets = limit_wallets;
        ///////////////////
        m_SMVPlatformCode = platformCode;
        m_SMVClientCode = clientCode;
        m_SMVProposalCode = proposalCode;
        m_lockerCode = lockerCode;
        Profile(_pubaddr).deployedWallet{value: 0.4 ton, flag: 1}(_systemcontract, _goshdao, _index, version);
        this.deployWalletIn{value: 0.2 ton, flag: 1}();
        getMoney();
    }
    
    function deployIndex(TvmCell data, uint128 index) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 20 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        SystemContract(_systemcontract).deployIndex{value: 0.1 ton, flag: 1}(_pubaddr, _index, _nameDao, data, index, false);
        return;
    }

    function _deployIndex(TvmCell data, uint128 index) private view {
        require(address(this).balance > 20 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        SystemContract(_systemcontract).deployIndex{value: 0.1 ton, flag: 1}(_pubaddr, _index, _nameDao, data, index, true);
        return;
    }
    
    function updateIndex(TvmCell data, uint128 index) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 20 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);        
        SystemContract(_systemcontract).updateIndex{value: 0.1 ton, flag: 1}(_pubaddr, _index, _nameDao, data, index, false);
        return;
    }

    function _updateIndex(TvmCell data, uint128 index) private view {
        require(address(this).balance > 20 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        SystemContract(_systemcontract).updateIndex{value: 0.1 ton, flag: 1}(_pubaddr, _index, _nameDao, data, index, true);
        return;
    }

    function destroyIndex(TvmCell data, uint128 index) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 20 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        SystemContract(_systemcontract).destroyIndex{value: 0.1 ton, flag: 1}(_pubaddr, _index, _nameDao, data, index, false);
        return;
    }

    function _destroyIndex(TvmCell data, uint128 index) private view {
        require(address(this).balance > 20 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);        
        SystemContract(_systemcontract).destroyIndex{value: 0.1 ton, flag: 1}(_pubaddr, _index, _nameDao, data, index, true);
        return;
    }

    function getCellForIndex(
        TvmCell data, 
        uint128 index, 
        uint128 typetr,
        string comment, 
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind =  INDEX_PROPOSAL_KIND;        
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, data, index, typetr, comment, time.get());
    }

    function deployWallet() public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 20 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        if (_walletcounter >= _limit_wallets) { return; }
        if (_index != 0) { return; }
        _walletcounter += 1;
        TvmCell s1 = GoshLib.composeWalletStateInit(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _walletcounter - 1);
        new GoshWallet {
            stateInit: s1, value: 5 ton, wid: 0, flag: 1
        }(  _versionController, _rootpubaddr, _pubaddr, _nameDao, _code[m_DaoCode],
            _code[m_CommitCode],
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _code[m_TaskCode], _code[m_BigTaskCode], _code[m_DaoTagCode], _code[m_RepoTagCode], _code[m_TopicCode], _code[m_GrantCode], _versions, _limit_wallets, _access,
            m_lockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, DEFAULT_DAO_BALANCE, m_tokenRoot);
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _walletcounter - 1)).askForLimitedBasic{value : 0.1 ton, flag: 1}(_limited, 0);
        getMoney();
    }

    //Profile part
    function turnOnPubkey(
        uint256 pubkey
    ) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        _access = pubkey;
        getMoney();
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index + 1)).turnOnPubkeyIn{value : 0.15 ton, flag: 1}(pubkey);
    }

    function turnOffPubkey(
    ) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        _access = null;
        getMoney();
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index + 1)).turnOffPubkeyIn{value : 0.15 ton, flag: 1}();
    }

    function turnOnPubkeyIn(
        uint256 pubkey
    ) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index - 1)) accept saveMsg {
        _access = pubkey;
        getMoney();
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index + 1)).turnOnPubkeyIn{value : 0.15 ton, flag: 1}(pubkey);
    }

    function turnOffPubkeyIn(
    ) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index - 1)) accept saveMsg {
        _access = null;
        getMoney();
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index + 1)).turnOffPubkeyIn{value : 0.15 ton, flag: 1}();
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
        require(_limited == false, ERR_WALLET_LIMITED);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        TvmCell deployCode = GoshLib.buildSignatureCode(_code[m_contentSignature], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: ContentSignature, varInit: {_commit : commit, _label : label, _systemcontract : _systemcontract, _goshdao : _goshdao}});
        new ContentSignature{
            stateInit: s1, value: 5 ton, wid: 0, flag: 1
        }(_pubaddr, _code[m_WalletCode], content, _index);
        getMoney();
    }

    function setTombstoneWallet(string description) public senderIs(_goshdao)  accept saveMsg {
        _tombstone = true;
        updateHeadIn();
        if (_index >= _walletcounter - 1) { return; }
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index + 1)).askForTombstone{value : 0.1 ton, flag: 1}(_index, description);
    }

    function askForTombstone(uint128 index, string description) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index)) {
        _tombstone = true;
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index + 1)).askForTombstone{value : 0.1 ton, flag: 1}(_index, description);
    }
    
    function setLimitedWallet(bool decision, uint128 limitwallet) public senderIs(_goshdao)  accept saveMsg {
        if (decision == true) {
            _expiredTime = null;
            m_pseudoDAOVoteBalance = 0;
            _totalDoubt = _lockedBalance;
            updateHeadIn();
            unlockVotingIn(_lockedBalance);
        }
        _limited = decision;
        _limit_wallets = limitwallet;
        if (_index >= _walletcounter - 1) { return; }
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index + 1)).askForLimited{value : 0.1 ton, flag: 1}(decision);
    }

    function askForLimited(bool decision) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index - 1)) {
        _limited = decision;
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index + 1)).askForLimited{value : 0.1 ton, flag: 1}(decision);
    }
    
    function askForLimitedBasic(bool decision, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index)) {
        _limited = decision;
    }

    function startCheckPaidMembership() public onlyOwnerPubkeyOptional(_access) accept saveMsg
    {   
        GoshDao(_goshdao).startCheckPaidMembershipWallet{value: 0.2 ton, flag: 1}(_pubaddr, _index);
    }  

    function getCellStartPaidMembership(
        PaidMember newProgram, uint8 Programindex,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind =  START_PAID_MEMBERSHIP_PROPOSAL_KIND;        
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, newProgram, Programindex, comment, time.get());
    }

    function getCellStopPaidMembership(
        uint8 Programindex,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind =  STOP_PAID_MEMBERSHIP_PROPOSAL_KIND;        
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, Programindex, comment, time.get());
    }

    function _startPaidMembership(PaidMember newProgram, uint8 Programindex) private view {
        GoshDao(_goshdao).startPaidMembership{value: 0.2 ton, flag: 1}(_pubaddr, _index, newProgram, Programindex);
    }

    function _stopPaidMembership(uint8 Programindex) private view {
        GoshDao(_goshdao).stopPaidMembership{value: 0.2 ton, flag: 1}(_pubaddr, _index, Programindex);
    }
    
    function getCellDaoTransferTokens(
        address wallet, address newwallet, uint128 grant, string oldversion,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        if (time.hasValue() == false) { time = block.timestamp; }
        uint256 proposalKind = TRANSFER_TO_NEW_VERSION_PROPOSAL_KIND;
        return abi.encode(proposalKind, wallet, newwallet, grant, oldversion, comment, time.get());
    }
    
    function getCellDaoVote(
        address wallet, uint256 platform_id, bool choice, uint128 amount, uint128 num_clients_base, string note,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DAO_VOTE_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, wallet, platform_id, choice, amount, num_clients_base, note, comment, time.get());
    }
    
    function getCellDelay(optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DELAY_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, time.get());
    }
    
    function _daoVote(
        address wallet, uint256 platform_id, bool choice, uint128 amount, uint128 num_clients_base, string note
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        GoshDao(_goshdao).daoVote{value: 0.1 ton, flag: 1}(_pubaddr, _index, wallet, platform_id, choice, amount, num_clients_base, note);
        getMoney();
    }
    
    function getCellSetUpgrade(
        string newversion,
        string description,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = SET_UPGRADE_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, newversion, description, comment, time.get());
    }
    
    function getCellChangeAllowance(
        address[] pubaddr,
        bool[] increase,
        uint128[] grant,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = CHANGE_ALLOWANCE_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, pubaddr, increase, grant, comment, time.get());
    }
    
    function getCellSetTombstoneDao(string description,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = SET_TOMBSTONE_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, description, comment, time.get());
    }
        
    function getCellForDaoReview(address wallet,
        address propaddress,
        bool isAccept,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = REVIEW_CODE_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, wallet, propaddress, isAccept, comment, time.get());
    }
    
    function askReviewerIn (address propAddress, bool isAccept) public onlyOwnerAddress(_pubaddr)
    {
    	require(initialized, SMVErrors.error_not_initialized);
    	require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE + SMVConstants.EPSILON_FEE +
                                    SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    	tvm.accept();
    	_saveMsg();

    	if (isAccept) { ISMVProposal(propAddress).acceptReviewer{value: SMVConstants.ACTION_FEE, flag: 1}(); }
    	else { ISMVProposal(propAddress).rejectReviewer{value: SMVConstants.ACTION_FEE + SMVConstants.EPSILON_FEE, flag: 1}(); }
    }
    
    function getCellSetHideVotingResult(bool res,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = CHANGE_HIDE_VOTING_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, res, comment, time.get());
    }
    
    function getCellSetAllowDiscussion(bool res,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = CHANGE_ALLOW_DISCUSSION_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, res, comment, time.get());
    }
    
    function getCellTagUpgrade(string[] repoName,
        string[] nametag,
        string newversion,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = CHANGE_ALLOW_DISCUSSION_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, nametag, newversion, comment, time.get());
    }
    
    function _tagUpgrade(
        string[] repoName,
        string[] nametag,
        string newversion
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        this._tagUpgrade2{value:0.12 ton, flag: 1}(repoName, nametag, newversion, 0);
        getMoney();
    }
    
    function _tagUpgrade2(
        string[] repoName,
        string[] nametag,
        string newversion,
        uint128 index
    ) public senderIs(address(this))  accept saveMsg {
        if (index >= repoName.length) { return; }
        this._tagUpgrade2{value:0.12 ton, flag: 1}(repoName, nametag, newversion, index + 1);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName[index]);
        TvmCell deployCode = GoshLib.buildTagCode(_code[m_TagCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag[index]}});
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        Tag(addr).upgradeToVersion{value: 2.3 ton, flag: 1}(_pubaddr, _index, newversion); 
        getMoney();
    }

    function setRepoUpgraded(bool res) public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        GoshDao(_goshdao).setRepoUpgraded{value: 0.17 ton, flag: 1}(_pubaddr, _index, res);
    }
    
    function getCellSetAbilityInvite(bool res,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = ABILITY_INVITE_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, res, comment, time.get());
    }
    
    function _setAbilityInvite(bool res) private view accept {
        tvm.accept();
        GoshDao(_goshdao).setAbilityInvite{value: 0.17 ton, flag: 1}(_pubaddr, _index, res);
    }
    
    function AloneNotAllowMint() public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        MemberToken[] pubaddr;
        string[] zero;
        GoshDao(_goshdao).isAlone{value: 0.13 ton, flag: 1}(0, pubaddr, _pubaddr, _index, zero, ALONE_ALLOW_MINT);
    }

    function AloneDeployDaoTag(string[] tag) public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        MemberToken[] pubaddr;
        GoshDao(_goshdao).isAlone{value: 0.13 ton, flag: 1}(0, pubaddr, _pubaddr, _index, tag, ALONE_DAOTAG);
    }

    function AloneDeployWalletDao(MemberToken[] pubaddr) public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        string[] zero;
        GoshDao(_goshdao).isAlone{value: 0.13 ton, flag: 1}(0, pubaddr, _pubaddr, _index, zero, ALONE_DEPLOY_WALLET);
    }
    
    function AloneMintDaoReserve(uint128 token) public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        MemberToken[] pubaddr;
        string[] zero;
        GoshDao(_goshdao).isAlone{value: 0.13 ton, flag: 1}(token, pubaddr, _pubaddr, _index, zero, ALONE_MINT_TOKEN);
    }
    
    function AloneAddVoteTokenDao(uint128 grant) public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        MemberToken[] pubaddr;
        string[] zero;
        GoshDao(_goshdao).isAlone{value: 0.13 ton, flag: 1}(grant, pubaddr, _pubaddr, _index, zero, ALONE_ADD_VOTE_TOKEN);
    }
    
    function AloneAddTokenDao(uint128 grant) public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        MemberToken[] pubaddr;
        string[] zero;
        GoshDao(_goshdao).isAlone{value: 0.13 ton, flag: 1}(grant, pubaddr, _pubaddr, _index, zero, ALONE_ADD_TOKEN);
    }
    
    function AloneDeployRepository(string nameRepo, string descr, optional(AddrVersion) previous) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_limited == false, ERR_WALLET_LIMITED);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(checkNameRepo(nameRepo), ERR_WRONG_NAME);
        GoshDao(_goshdao).isAloneDeploy{value: 0.13 ton, flag: 1}(nameRepo, descr, previous, _pubaddr, _index, ALONE_DEPLOY_REPO);
    }
    
    function getCellMintToken(uint128 token,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = MINT_TOKEN_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, token, comment, time.get());       
    }
    
    function getCellAllowMint(
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = ALLOW_MINT_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, comment, time.get());     
    }
    
    function _mintToken(uint128 grant) private view {
        GoshDao(_goshdao).mintReserve{value:0.1 ton, flag: 1}(grant, _pubaddr, _index);
    }
    
    function getCellAddVoteToken(address pubaddr,
        uint128 token,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = ADD_VOTE_TOKEN_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, pubaddr, token, comment, time.get());       
    }
    
    function getCellAddRegularToken(address pubaddr,
        uint128 token,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = ADD_REGULAR_TOKEN_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, pubaddr, token, comment, time.get());       
    }

    function startProposalForDeployWalletDao(
        MemberToken[] pubaddr,
        optional(string)[] dao,
        string comment,
        uint128 num_clients , address[] reviewers
    ) public onlyOwnerPubkeyOptional(_access) {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(dao.length == pubaddr.length, ERR_WRONG_NUMBER_MEMBER);
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);       
        tvm.accept();
        _saveMsg();
        GoshDao(_goshdao).proposalForDeployWalletDao{value: 1.3 ton, flag: 1}(_pubaddr, _index, pubaddr, dao, comment, num_clients, reviewers);
    }
    
    
     function startProposalForDeployWalletDao2(
        MemberToken[] pubaddr,
        optional(string)[] dao,
        string comment,
        uint128 num_clients , address[] reviewers
    ) public senderIs(_goshdao) accept saveMsg {
        uint256 proposalKind = DEPLOY_WALLET_DAO_PROPOSAL_KIND;
        TvmCell c = abi.encode(proposalKind, pubaddr, dao, comment, block.timestamp);
        _startProposalForOperation(c, PROPOSAL_START_AFTER, PROPOSAL_DURATION, num_clients, reviewers, false);
        getMoney();
    }
    
    function getCellDeployWalletDao(MemberToken[] pubaddr,
        optional(string)[] dao,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DEPLOY_WALLET_DAO_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, pubaddr, dao, comment, time.get());
    }
    
    function getCellDeleteWalletDao(
        address[] pubaddr,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DELETE_WALLET_DAO_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, pubaddr, comment, time.get());
    }

    function _setTombstoneDao(string description) private view {
    	GoshDao(_goshdao).setTombstone{value : 0.1 ton, flag : 1}(_pubaddr, _index, description);
    }

    function _upgradeDao(string newversion, string description) private view {
    	GoshDao(_goshdao).upgradeDao{value : 0.1 ton, flag : 1}(newversion, description, _pubaddr, _index);
    }

    function _deployWalletDao(MemberToken[] pubaddr, optional(string)[] dao) private view {
        GoshDao(_goshdao).deployWallet{value: 0.1 ton, flag : 1}(pubaddr, dao, _pubaddr, _index);
    }

    function _deleteWalletDao(address[] pubaddr) private view {
        GoshDao(_goshdao).deleteWallet{value: 0.1 ton, flag : 1}(pubaddr, _pubaddr, _index);
    }

    function deployWalletIn() public senderIs(address(this))  accept {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        if (_walletcounter >= _limit_wallets) { 
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _index + 1)).askForLimited{value : 0.1 ton, flag: 1}(_limited);
            return; 
        }
        if (_index != 0) { return; }
        _walletcounter += 1;
        TvmCell s1 = GoshLib.composeWalletStateInit(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _walletcounter - 1);
        new GoshWallet {
            stateInit: s1, value: 60 ton, wid: 0, flag: 1
        }(  _versionController,_rootpubaddr, _pubaddr, _nameDao, _code[m_DaoCode],
            _code[m_CommitCode],
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _code[m_TaskCode], _code[m_BigTaskCode],  _code[m_DaoTagCode], _code[m_RepoTagCode],  _code[m_TopicCode], _code[m_GrantCode], _versions, _limit_wallets, _access,
            m_lockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, DEFAULT_DAO_BALANCE, m_tokenRoot);
        this.deployWalletIn{value: 0.1 ton, flag: 1}();
        getMoney();
    }

    function destroyWallet() public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        if (_walletcounter <= 1) { return; }
        if (_index != 0) { return; }
         GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _walletcounter - 1)).askForDestroy{value : 0.2 ton, flag: 1}();
         _walletcounter -= 1;
    }

    function _getWalletTokenConfig() internal view returns(uint128) {
        return DEFAULT_DAO_BALANCE;
    }

    //Money part
    function getMoney() private {
        if (_expiredTime.hasValue()) {
            if (_expiredTime.get() < block.timestamp){
                GoshDao(_goshdao).startCheckPaidMembershipWallet{value: 0.2 ton, flag: 1}(_pubaddr, _index);
            }
        }
        if (_totalDoubt <= m_pseudoDAOVoteBalance) {
            m_pseudoDAOVoteBalance -= _totalDoubt;
            _totalDoubt = 0;
        } else {
            _totalDoubt -= m_pseudoDAOVoteBalance;
            m_pseudoDAOVoteBalance = 0;
        }
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
        if (_flag == true) { return; }
        if (address(this).balance > 20000 ton) { return; }
        _flag = true;
        SystemContract(_systemcontract).sendMoney{value : 0.2 ton, flag: 1}(_pubaddr, _goshdao, 21000 ton, _index);
    }
    
    function deployTopic(string name, string content, address object) public onlyOwnerPubkeyOptional(_access)  accept saveMsg  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        TvmCell s1 = GoshLib.composeTopicStateInit(_code[m_TopicCode], _goshdao, name, content, object);
        new Topic {stateInit: s1, value: FEE_DEPLOY_TOPIC, wid: 0, flag: 1}(
            _pubaddr, _index, _systemcontract, _goshdao, object, _code[m_WalletCode]);
    }

    function deployComment(string name, string content, address object, optional(string) metadata, optional(string) commit, optional(string) nameoffile) public onlyOwnerPubkeyOptional(_access)  accept saveMsg  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        TvmCell s1 = GoshLib.composeCommentStateInit(_code[m_TopicCode], _goshdao, name, content, object, metadata, commit, nameoffile);
        new Topic {stateInit: s1, value: FEE_DEPLOY_TOPIC, wid: 0, flag: 1}(
            _pubaddr, _index, _systemcontract, _goshdao, object, _code[m_WalletCode]);
    }
    
    function deployMessage(address topic, optional(uint256) answer, string message) public onlyOwnerPubkeyOptional(_access)  accept saveMsg  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        Topic(topic).acceptMessage{value:0.1 ton, flag: 1}(_pubaddr, _index, answer, message);
    }    

    function setResolveTopic (address topic, bool status) public onlyOwnerPubkeyOptional(_access)  accept saveMsg  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        Topic(topic).resolveTopic{value:0.1 ton, flag: 1}(_pubaddr, _index, status);
    } 

    function destroyTopic (address topic) public onlyOwnerPubkeyOptional(_access)  accept saveMsg  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        Topic(topic).destroyTopic{value:0.1 ton, flag: 1}(_index);
    }         
    
    function setCheckDao() public onlyOwnerPubkeyOptional(_access)  accept saveMsg  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        GoshDao(_goshdao).setCheck{value:0.1 ton, flag: 1}(_pubaddr, _index);
    }       

    function destroyDiff(address repo, string commit, uint128 index1, uint128 index2) public onlyOwnerPubkeyOptional(_access)  accept view {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        DiffC(GoshLib.calculateDiffAddress(_code[m_DiffCode], repo, commit, index1, index2)).destroy{value : 0.2 ton, flag: 1}(_pubaddr, _index);
    }

/*
    function destroyObject(address obj) public onlyOwnerPubkeyOptional(_access)  accept view {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        Object(obj).destroy{value : 0.2 ton, flag: 1}(_pubaddr, _index);
    }
*/

    //Repository part
    function deployRepositoryDao(string nameRepo, string descr, optional(AddrVersion) previous) public senderIs(_goshdao) accept {
        _deployRepository(nameRepo, descr, previous);
        getMoney();
    }
    
    function getCellForDestroyRepository(
        string nameRepo,
        string comment,
        optional(uint32) time
    ) external pure returns(TvmCell) {
        uint256 proposalKind = DESTROY_REPOSITORY_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, nameRepo, comment, time.get());
    }

    function _destroyRepository(string nameRepo) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);        
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, nameRepo);
        Repository(repo).destroyRepo{value: 0.1 ton, flag: 1}(_pubaddr, _index);
        getMoney();
    }
    
    
    function _deployRepository(string nameRepo, string descr, optional(AddrVersion) previous) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        AddrVersion[] emptyArr;
        uint256 emptySha;
        if (previous.hasValue() == false) {
            _deployCommit(nameRepo, "0000000000000000000000000000000000000000", "", emptyArr, emptySha, false);
        }
        TvmCell s1 = GoshLib.composeRepositoryStateInit(_code[m_RepositoryCode], _systemcontract, _goshdao, nameRepo);
        new Repository {stateInit: s1, value: FEE_DEPLOY_REPO, wid: 0, flag: 1}(
            _pubaddr, nameRepo, _nameDao, _goshdao, _systemcontract, descr, _code[m_CommitCode], _code[m_WalletCode], _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _versions, _index, previous);
        getMoney();
    }

    function getCellForTaskUpgrade(string nametask,
        string reponame,
        string oldversion,
        address oldtask,
        string[] hashtag,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = TASK_UPGRADE_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, nametask, reponame, oldversion, oldtask, hashtag, comment, time.get());      
    }
   
    function getCellTaskConfirm(
        string taskName,
        string repoName,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = BIGTASK_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, taskName, comment, time.get());
    }

    function _confirmTask(
        string repoName,
        string nametask
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address taskaddr = GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], _goshdao, repo, nametask);
        BigTask(taskaddr).approveReady{value:1 ton}(_pubaddr, _index);
        getMoney();
    }

    function getCellForBigTaskUpgrade(string nametask,
        string reponame,
        string oldversion,
        address oldtask,
        string[] hashtag,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = BIGTASK_UPGRADE_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, nametask, reponame, oldversion, oldtask, hashtag, comment, time.get());      
    }

    function getCellForSendDaoToken(address wallet,
        optional(address) pubaddr,
        uint128 grant,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = SEND_TOKEN_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, wallet, pubaddr, grant, comment, time.get());      
    }
    
    function _daoSendToken(
        address wallet,
        optional(address) pubaddr,
        uint128 grant
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        GoshDao(_goshdao).daoSendToken{value: 0.1 ton, flag: 1}(_pubaddr, _index, wallet, pubaddr, grant);
        getMoney();
    }
    
    function startProposalForUpgradeVersionController(
        TvmCell UpgradeCode,
        TvmCell cell,
        string comment,
        uint128 num_clients , address[] reviewers
    ) public onlyOwnerPubkeyOptional(_access) accept {
        require(_nameDao == "gosh", ERR_WRONG_NAME);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        _saveMsg();

        uint256 proposalKind = UPGRADE_CODE_PROPOSAL_KIND;
        TvmCell c = abi.encode(proposalKind, UpgradeCode, cell, comment, block.timestamp);
        _startProposalForOperation(c, PROPOSAL_START_AFTER, PROPOSAL_DURATION, num_clients, reviewers, false);

        getMoney();
    }

    function getCellDeployRepo(string nameRepo, 
        string descr,
        optional(AddrVersion) previous,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DEPLOY_REPO_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, nameRepo, descr, previous, comment, time.get());       
    }

    //Snapshot part
    function deployNewSnapshot(string commitsha, address repo, string name, bytes snapshotdata, optional(string) snapshotipfs, bool isPin) public onlyOwnerPubkeyOptional(_access)  accept saveMsg{
        require(_tombstone == false, ERR_TOMBSTONE);
        if (isPin == true) {
            new Snapshot{stateInit:GoshLib.composeSnapshotStateInit(_code[m_SnapshotCode], repo, "//PINTAG//" + commitsha, name), value: FEE_DEPLOY_SNAPSHOT, wid: 0, flag: 1}(_pubaddr, _systemcontract, _goshdao, repo, _code[m_SnapshotCode], _code[m_CommitCode], _code[m_DiffCode], _code[m_WalletCode], _code[m_TreeCode], _index, snapshotdata, isPin, commitsha, snapshotipfs);
        }
        else {
            new Snapshot{stateInit:GoshLib.composeSnapshotStateInit(_code[m_SnapshotCode], repo, commitsha, name), value: FEE_DEPLOY_SNAPSHOT, wid: 0, flag: 1}(_pubaddr, _systemcontract, _goshdao, repo, _code[m_SnapshotCode], _code[m_CommitCode], _code[m_DiffCode], _code[m_WalletCode], _code[m_TreeCode], _index, snapshotdata, isPin, commitsha, snapshotipfs);
        }
        getMoney();
    }

    function deleteSnapshot(address snap) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        Snapshot(snap).destroy{
            value: 0.4 ton, bounce: true, flag: 1
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
        require(diffs.length <= 1, ERR_TOO_MANY_DIFFS);
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
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        TvmCell s1 = GoshLib.composeDiffStateInit(_code[m_DiffCode], commitName, repo, index1, index2);
        new DiffC {stateInit: s1, value: FEE_DEPLOY_DIFF, bounce: true, flag: 1, wid: 0}(
            _goshdao, _systemcontract, _pubaddr, repoName, branchName, repo, _code[m_WalletCode], _code[m_DiffCode], _code[m_CommitCode], _code[m_TreeCode], diffs, _index, last);
        getMoney();
    }

    //Commit part
    function setPinnedCommit(
        string repoName,
        string commitName
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        Commit(GoshLib.calculateCommitAddress(_code[m_CommitCode],  GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName), commitName)).setPinned{value:0.75 ton, flag: 1}(_pubaddr, _index);
    }

    function deployCommit(
        string repoName,
        string commitName,
        string fullCommit,
        AddrVersion[] parents,
        uint256 shainnertree,
        bool upgrade
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(parents.length <= 60, ERR_TOO_MANY_PARENTS);
        _deployCommit(repoName, commitName, fullCommit, parents, shainnertree, upgrade);
    }

    function _deployCommit(
        string repoName,
        string commitName,
        string fullCommit,
        AddrVersion[] parents,
        uint256 shainnertree,
        bool upgrade
    ) internal {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address tree = GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, repo);
        TvmCell s1 = GoshLib.composeCommitStateInit(_code[m_CommitCode], commitName, repo);
        new Commit {stateInit: s1, value: FEE_DEPLOY_COMMIT, bounce: true, flag: 1, wid: 0}(
            _goshdao, _systemcontract, _pubaddr, repoName, fullCommit, parents, repo, _code[m_WalletCode], _code[m_CommitCode], _code[m_DiffCode], _code[m_SnapshotCode], tree, _index, upgrade);
        getMoney();
    }

    function setCommit(
        string repoName,
        string branchName,
        string commit,
        bool isUpgrade,
        uint128 numberChangedFiles,
        uint128 numberCommits
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        optional(ConfigCommit) task;
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address addrC = GoshLib.calculateCommitAddress(_code[m_CommitCode], repo, commit);
        isProposalNeeded(repoName, branchName, addrC, numberChangedFiles, numberCommits, task, isUpgrade);
        tvm.accept();
        _saveMsg();
        getMoney();
    }

    //Branch part
    function deployBranch(
        string repoName,
        string newName,
        string fromCommit
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        require(checkNameBranch(newName), ERR_WRONG_NAME);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
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
        require(_limited == false, ERR_WALLET_LIMITED);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        Repository(repo).deleteBranch{
            value: FEE_DESTROY_BRANCH, bounce: true, flag: 1
        }(_pubaddr, Name, _index);
    }
    
    function getCellChangeDescription(string repoName,
        string descr,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
    	uint256 proposalKind = CHANGE_DESCRIPTION_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, descr, comment, time.get());
    }
    
    function _changeDescription(
        string repoName,
        string descr
    ) private view {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        Repository(repo).changeDescription{
            value: 0.17 ton, bounce: true, flag: 1
        }(_pubaddr, descr, _index);
    }

    function setHEAD(
        string repoName,
        string branchName
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
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
        require(_limited == false, ERR_WALLET_LIMITED);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        TvmCell deployCode = GoshLib.buildTagCode(_code[m_TagCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag}});
        new Tag{
            stateInit: s1, value: FEE_DEPLOY_TAG, wid: 0, bounce: true, flag: 1
        }(_pubaddr, nameCommit, commit, content, _systemcontract, _goshdao, repoName, _nameDao, _code[m_WalletCode], _index);
        getMoney();
    }
    
    function deployTagUpgrade(
        string repoName,
        string nametag,
        string nameCommit,
        address commit,
        string content
    ) public senderIs(_goshdao)  accept saveMsg {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        TvmCell deployCode = GoshLib.buildTagCode(_code[m_TagCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag}});
        new Tag{
            stateInit: s1, value: FEE_DEPLOY_TAG, wid: 0, bounce: true, flag: 1
        }(_pubaddr, nameCommit, commit, content, _systemcontract, _goshdao, repoName, _nameDao, _code[m_WalletCode], _index);
        getMoney();
    }

    function deleteTag(string repoName, string nametag) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        TvmCell deployCode = GoshLib.buildTagCode(_code[m_TagCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag}});
        address tagaddr = address.makeAddrStd(0, tvm.hash(s1));
        Tag(tagaddr).destroy{
            value: FEE_DESTROY_TAG, bounce: true, flag: 1
        }(_pubaddr, _index);
        getMoney();
    }
    
    function deployDaoTag(
        string daotag
    ) public senderIs(_goshdao) accept saveMsg {
        _deployDaoTag(daotag);
        getMoney();
    }
    
    function _deployDaoTag(
        string daotag
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        TvmCell deployCode = GoshLib.buildDaoTagCode(_code[m_DaoTagCode], daotag, _versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: DaoTag, varInit: {_goshdao: _goshdao}});
        new DaoTag{
            stateInit: s1, value: FEE_DEPLOY_DAO_TAG, wid: 0, bounce: true, flag: 1
        }(_pubaddr, _systemcontract, daotag, _code[m_WalletCode], _index);
        getMoney();
    }
    
    function deployRepoTag(
        string repoName,
        string repotag
    ) public senderIs(GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName)) accept saveMsg {
        _deployRepoTag(msg.sender, repotag);
        getMoney();
    }
    
    function _deployRepoTag(
        address repo,
        string repotag
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        TvmCell deployCode = GoshLib.buildRepoTagGoshCode(_code[m_RepoTagCode], repotag, _versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: _goshdao, _repo: repo}});
        new RepoTagGosh {
            stateInit: s1, value: FEE_DEPLOY_REPO_TAG, wid: 0, bounce: true, flag: 1
        }(_pubaddr, _systemcontract, repotag, _code[m_WalletCode], _index);
        deployCode = GoshLib.buildRepoTagDaoCode(_code[m_RepoTagCode], repotag, _goshdao, _versionController);
        s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: _goshdao, _repo: repo}});
        new RepoTagGosh {
            stateInit: s1, value: FEE_DEPLOY_REPO_TAG, wid: 0, bounce: true, flag: 1
        }(_pubaddr, _systemcontract, repotag, _code[m_WalletCode], _index);
        getMoney();
    }
    
    function destroyDaoTag(
        string daotag
    ) public senderIs(_goshdao) accept saveMsg {
        _destroyDaoTag(daotag);
        getMoney();
    }
    
    function _destroyDaoTag(
        string daotag
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        DaoTag(GoshLib.calculateDaoTagAddress(_code[m_DaoTagCode], _versionController, _goshdao, daotag)).destroy { value: 0.1 ton, flag: 1}(_pubaddr, _index);
        getMoney();
    }
    
    function destroyRepoTag(
        string repoName,
        string daotag
    ) public senderIs(GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName)) accept saveMsg {
        _destroyRepoTag(msg.sender, daotag);
        getMoney();
    }
    
    function _destroyRepoTag(
        address _repo,
        string daotag
    ) private {
        _repo;
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        RepoTagGosh(GoshLib.calculateRepoTagGoshAddress(_code[m_RepoTagCode], _versionController, _goshdao, _repo, daotag)).destroy { value: 0.1 ton, flag: 1}(_pubaddr, _index);
        RepoTagGosh(GoshLib.calculateRepoTagDaoAddress(_code[m_RepoTagCode], _versionController, _goshdao, _repo, daotag)).destroy { value: 0.1 ton, flag: 1}(_pubaddr, _index);
        getMoney();
    }

    //Task part
    function approveSmallTask(
        string namebigtask,
        string repoName,
        uint128 taskindex,
        ConfigCommitBase commit
    ) public onlyOwnerPubkeyOptional(_access) accept {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        BigTask(getBigTaskAddr(namebigtask, GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName))).approveSmallTask{value: 1 ton, flag: 1}(_pubaddr, _index, taskindex, commit);
        getMoney();
    }


    function deployTaskFromBigTask(
        string namebigtask,
        string repoName,
        string nametask,
        string[] hashtag,
        ConfigGrant grant,
        uint128 value,
        optional(ConfigCommitBase) workers
    ) public senderIs(getBigTaskAddr(namebigtask, GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName))) accept {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        GoshDao(_goshdao).deployTask{value: 1 ton, flag: 1}(_pubaddr, _index, repoName, nametask, hashtag, grant, value, namebigtask, workers);
        getMoney();
    }

    function deploySubTask(
        string namebigtask, 
        string repoName,
        string nametask,
        string[] hashtag,
        ConfigGrant grant,
        uint128 value,
        optional(ConfigCommitBase) workers
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg  {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        BigTask(getBigTaskAddr(namebigtask, GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName))).deploySubTask{value: 1 ton, flag: 1}(_pubaddr, _index, repoName, nametask, hashtag, grant, value, workers);
        getMoney();
    }

    function destroySubTask(
        string namebigtask, 
        string repoName,
        uint128 index
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg  {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        BigTask(getBigTaskAddr(namebigtask, GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName))).destroySubTask{value: 1 ton, flag: 1}(_pubaddr, _index, index);
        getMoney();
    }

    function _deployTask(
        string repoName,
        string nametask,
        string[] hashtag,
        ConfigGrant grant,
        optional(ConfigCommitBase) workers
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        GoshDao(_goshdao).deployTask{value: 0.3 ton, flag: 1}(_pubaddr, _index, repoName, nametask, hashtag, grant, 0, null, workers);
        getMoney();
    }

    function _deployBigTask(
        string repoName,
        string nametask,
        string[] hashtag,
        ConfigGrant grant,
        ConfigCommit commit,
        uint128 freebalance
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        GoshDao(_goshdao).deployBigTask{value: 0.3 ton, flag: 1}(_pubaddr, _index, repoName, nametask, hashtag, grant, commit, freebalance);
        getMoney();
    }
    
    function deployTaskTag(
        address repo,
        address task,
        string tag
    ) public senderIs(_goshdao) accept saveMsg {
        _deployTaskTag(repo, task, tag);
        getMoney();
    }
    
    function _deployTaskTag(
        address repo,
        address task,
        string tag
    ) private {
        require(_tombstone == false, ERR_TOMBSTONE);
        TvmCell deployCode = GoshLib.buildTaskTagGoshCode(_code[m_RepoTagCode], tag, _versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: _goshdao, _repo: repo, _task: task}});
        new RepoTagGosh {
            stateInit: s1, value: FEE_DEPLOY_TASK_TAG, wid: 0, bounce: true, flag: 1
        }(_pubaddr, _systemcontract, tag, _code[m_WalletCode], _index);
        deployCode = GoshLib.buildTaskTagDaoCode(_code[m_RepoTagCode], tag, _goshdao, _versionController);
        s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: _goshdao, _repo: repo, _task: task}});
        new RepoTagGosh {
            stateInit: s1, value: FEE_DEPLOY_TASK_TAG, wid: 0, bounce: true, flag: 1
        }(_pubaddr, _systemcontract, tag, _code[m_WalletCode], _index);
        deployCode = GoshLib.buildTaskTagRepoCode(_code[m_RepoTagCode], tag, _goshdao, repo, _versionController);
        s1 = tvm.buildStateInit({code: deployCode, contr: RepoTagGosh, varInit: {_goshdao: _goshdao, _repo: repo, _task: task}});
        new RepoTagGosh {
            stateInit: s1, value: FEE_DEPLOY_TASK_TAG, wid: 0, bounce: true, flag: 1
        }(_pubaddr, _systemcontract, tag, _code[m_WalletCode], _index);
        getMoney();
    }
    
    function destroyTaskTag(
        address repo,
        address task,
        string tag
    ) public senderIs(_goshdao) accept saveMsg {
        _destroyTaskTag(repo, task, tag);
        getMoney();
    }
    
    function _destroyTaskTag (
        address repo,
        address task,
        string tag) private {       
        RepoTagGosh(GoshLib.calculateTaskTagGoshAddress(_code[m_RepoTagCode], _versionController, _goshdao, repo, task, tag)).destroy { value: 0.1 ton, flag: 1}(_pubaddr, _index);
        RepoTagGosh(GoshLib.calculateTaskTagDaoAddress(_code[m_RepoTagCode], _versionController, _goshdao, repo, task, tag)).destroy { value: 0.1 ton, flag: 1}(_pubaddr, _index);
        RepoTagGosh(GoshLib.calculateTaskTagRepoAddress(_code[m_RepoTagCode], _versionController, _goshdao, repo, task, tag)).destroy { value: 0.1 ton, flag: 1}(_pubaddr, _index);
        getMoney();
    }

    function _destroyTask(
        string repoName,
        string nametask
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address taskaddr = GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, repo, nametask);
        Task(taskaddr).destroy{value:0.4 ton, flag: 1}(_pubaddr, _index);
        getMoney();
    }

    function _destroyBigTask(
        string repoName,
        string nametask
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address taskaddr = GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], _goshdao, repo, nametask);
        BigTask(taskaddr).destroy{value:0.4 ton, flag: 1}(_pubaddr, _index);
        getMoney();
    }

    function askGrantToken(
        string repoName,
        string nametask,
        uint128 typegrant
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address taskaddr = GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, repo, nametask);
        Task(taskaddr).getGrant{value:0.3 ton, flag: 1}(_pubaddr, typegrant, _index);
        getMoney();
    }
    
    function askGrantTokenFull(
        string repoName,
        string nametask
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address taskaddr = GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, repo, nametask);
        Task(taskaddr).getGrant{value:0.3 ton, flag: 1}(_pubaddr, 1, _index);
        Task(taskaddr).getGrant{value:0.3 ton, flag: 1}(_pubaddr, 2, _index);
        Task(taskaddr).getGrant{value:0.3 ton, flag: 1}(_pubaddr, 3, _index);
        getMoney();
    }

    function askGrantBigToken(
        string repoName,
        string nametask,
        uint128 typegrant
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address taskaddr = GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], _goshdao, repo, nametask);
        BigTask(taskaddr).getGrant{value:2 ton, flag: 1}(_pubaddr, typegrant, _index);
        getMoney();
    }
    
    function askGrantBigTokenFull(
        string repoName,
        string nametask
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address taskaddr = GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], _goshdao, repo, nametask);
        BigTask(taskaddr).getGrant{value:1 ton, flag: 1}(_pubaddr, 1, _index);
        BigTask(taskaddr).getGrant{value:1 ton, flag: 1}(_pubaddr, 2, _index);
        BigTask(taskaddr).getGrant{value:1 ton, flag: 1}(_pubaddr, 3, _index);
        getMoney();
    }
    
    function askGrantTokenFullIn(
        string repoName,
        string nametask
    ) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        address taskaddr = GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, repo, nametask);
        Task(taskaddr).getGrant{value:0.3 ton, flag: 1}(_pubaddr, 1, _index);
        Task(taskaddr).getGrant{value:0.3 ton, flag: 1}(_pubaddr, 2, _index);
        Task(taskaddr).getGrant{value:0.3 ton, flag: 1}(_pubaddr, 3, _index);
        getMoney();
    }

    function grantToken(
        string nametask,
        address repo,
        uint128 grant
    ) public senderIs(getTaskAddr(nametask, repo)) accept saveMsg {
        m_pseudoDAOBalance += grant;
        getMoney();
    }

    function grantTokenBig(
        string nametask,
        address repo,
        uint128 grant
    ) public senderIs(GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], _goshdao, repo, nametask)) accept saveMsg {
        m_pseudoDAOBalance += grant;
        getMoney();
    }
    
    function addVoteToken(
        uint128 grant
    ) public senderIs(_goshdao) accept saveMsg {
        GoshDao(_goshdao).requestMint {value: SMVConstants.ACTION_FEE, flag: 1} (tip3VotingLocker, _pubaddr, grant, _index);
        _lockedBalance += grant;
        getMoney();
    }

    function addVoteTokenSub(
        uint128 grant,
        uint128 time
    ) public senderIs(_goshdao) accept saveMsg {
        GoshDao(_goshdao).requestMint {value: SMVConstants.ACTION_FEE, flag: 1} (tip3VotingLocker, _pubaddr, grant, _index);
        _lockedBalance += grant;
        _expiredTime = time;
        getMoney();
    }
    
    function addDoubt(
        uint128 grant
    ) public senderIs(_goshdao) accept saveMsg {
        _totalDoubt += grant;
        if (_totalDoubt > m_pseudoDAOVoteBalance) { updateHeadIn(); unlockVotingIn(math.min(_lockedBalance, _totalDoubt - m_pseudoDAOVoteBalance)); }
        getMoney();
    }
    
    function addAllowance(
        uint128 grant
    ) public senderIs(_goshdao) accept saveMsg {
        getMoney();
        uint128 diff = math.min(grant, m_pseudoDAOBalance - m_pseudoDAOVoteBalance);
        m_pseudoDAOVoteBalance += diff;
        if (diff != grant) {
            GoshDao(_goshdao).returnAllowance{value: 0.2 ton, flag: 1}(grant - diff, _pubaddr, _index);
        }
    }
    
     function addAllowanceC(
        uint128 grant
    ) public senderIs(_goshdao) accept saveMsg {
        m_pseudoDAOVoteBalance += grant;
        getMoney();
    }
    
    function addRegularToken(
        uint128 grant
    ) public senderIs(_goshdao) accept saveMsg {
        m_pseudoDAOBalance += grant;
        getMoney();
    }

    function sendTokenToDaoWrapper(
        uint128 grant,
        uint256 pubkey
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(grant <= m_pseudoDAOBalance, ERR_TOO_LOW_BALANCE);
        m_pseudoDAOBalance -= grant;
        GoshDao(_goshdao).receiveTokentoWrapper{value: 0.1 ton, flag: 1}(_pubaddr, _index, grant, pubkey);
        getMoney();
    }
    
    function sendTokenToDaoReserve(
        uint128 grant
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(grant <= m_pseudoDAOBalance, ERR_TOO_LOW_BALANCE);
        m_pseudoDAOBalance -= grant;
        GoshDao(_goshdao).receiveTokentoReserve{value: 0.1 ton, flag: 1}(_pubaddr, _index, grant);
        getMoney();
    }
    
    function sendTokenToDaoReserveIn(
        uint128 grant
    ) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(grant <= m_pseudoDAOBalance, ERR_TOO_LOW_BALANCE);
        m_pseudoDAOBalance -= grant;
        GoshDao(_goshdao).receiveTokentoReserve{value: 0.1 ton, flag: 1}(_pubaddr, _index, grant);
        getMoney();
    }
    function sendToken(
        address pubaddr,
        uint128 grant
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(grant <= m_pseudoDAOBalance, ERR_TOO_LOW_BALANCE);
        m_pseudoDAOBalance -= grant;
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, 0)).receiveToken{value: 0.1 ton, flag: 1}(_pubaddr, _index, grant);
        getMoney();
    }
    
    function sendTokenIn(
        address pubaddr,
        uint128 grant
    ) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(grant <= m_pseudoDAOBalance, ERR_TOO_LOW_BALANCE);
        m_pseudoDAOBalance -= grant;
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, 0)).receiveToken{value: 0.1 ton, flag: 1}(_pubaddr, _index, grant);
        getMoney();
    }
    
    function deployCustomContract(TvmCell data) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        SystemContract(_systemcontract).deployCustomData{value : 0.2 ton, flag: 1}(data, _pubaddr, _nameDao, _index);
        getMoney();
    }
    
    function sendTokenToNewVersion(uint128 grant, string newversion) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(grant <= m_pseudoDAOBalance, ERR_TOO_LOW_BALANCE);
        m_pseudoDAOBalance -= grant;        
        optional(address) newwallet;
        SystemContract(_systemcontract).sendTokenToNewVersion2{value : 0.2 ton, flag: 1}(_pubaddr, _nameDao, _index, newwallet, grant, newversion);
        getMoney();
    }

    function sendTokenToNewVersionAuto() public onlyOwnerPubkeyOptional(_access)  accept saveMsg { 
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        this.sendTokenToNewVersionAutoTree{value: 0.2 ton, flag: 1}(0);
        getMoney();
    }

    function daoSendTokenToNewVersionAuto(address wallet) public onlyOwnerPubkeyOptional(_access)  accept saveMsg { 
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        GoshDao(_goshdao).daoSendTokenToNewVersionAuto1{value: 0.2 ton, flag: 1}(_pubaddr, _index, wallet);
        getMoney();
    }

    function daoSendTokenToNewVersionAuto2(string namedao) public onlyOwnerAddress(_pubaddr) accept saveMsg { 
        this.daoSendTokenToNewVersionAutoTree{value: 0.2 ton, flag: 1}(namedao, 0);
        getMoney();
    }

    function daoSendTokenToNewVersionAutoTree(string namedao, uint256 key) public senderIs(address(this))  accept saveMsg { 
        string ver;
        optional(uint256, string) res = _versions.next(key);
        if (res.hasValue() == false) { return; }
        (key, ver) = res.get();
        this.daoSendTokenToNewVersionAutoTree{value: 0.2 ton, flag: 1}(namedao, key);
        if ((ver == version) || (ver == "1.0.0") || (ver == "2.0.0") || (ver == "3.0.0")) { return; }
        SystemContract(_systemcontract).daoSendTokenToNewVersionAuto2{value : 0.2 ton, flag: 1}(version, ver, namedao, _pubaddr, _nameDao, _index);
        getMoney();
    }

    function sendTokenToNewVersionAutoTree(uint256 key) public senderIs(address(this))  accept saveMsg { 
        string ver;
        optional(uint256, string) res = _versions.next(key);
        if (res.hasValue() == false) { return; }
        (key, ver) = res.get();
        this.sendTokenToNewVersionAutoTree{value: 0.2 ton, flag: 1}(key);
        if ((ver == version) || (ver == "1.0.0") || (ver == "2.0.0") || (ver == "3.0.0")) { return; }
        SystemContract(_systemcontract).sendTokenToNewVersionAuto2{value : 0.2 ton, flag: 1}(version, ver, _pubaddr, _nameDao, _index);
        getMoney();
    }

    function returnTokenToDao(uint128 value) public senderIs(_systemcontract) accept {
        m_pseudoDAOBalance += value;
        getMoney();
    }

    function daoSendTokenToNewVersionAuto5(address pubaddr, string newversion) public senderIs(_systemcontract) accept {
        optional(address) newwallet;
        if (_lockedBalance != 0) {
            unlockVotingIn(0); 
        }
        if (m_pseudoDAOBalance == 0) { return; }
        SystemContract(_systemcontract).daoSendTokenToNewVersion2{value : 0.2 ton, flag: 1}(_pubaddr, pubaddr, _nameDao, _index, newwallet, m_pseudoDAOBalance, newversion);
        m_pseudoDAOBalance = 0;     
        getMoney();
    }

    function sendTokenToNewVersionAuto5(string newversion) public senderIs(_systemcontract) accept {
        optional(address) newwallet;
        if (_lockedBalance != 0) {
            unlockVotingIn(0); 
        }
        if (m_pseudoDAOBalance == 0) { return; }
        SystemContract(_systemcontract).sendTokenToNewVersion2{value : 0.2 ton, flag: 1}(_pubaddr, _nameDao, _index, newwallet, m_pseudoDAOBalance, newversion);
        m_pseudoDAOBalance = 0;     
        getMoney();
    }
    
    function sendTokenToNewVersionIn(optional(address) newwallet, uint128 grant, string newversion) public onlyOwnerAddress(_pubaddr)  accept saveMsg {
        require(grant <= m_pseudoDAOBalance, ERR_TOO_LOW_BALANCE);
        m_pseudoDAOBalance -= grant;        
        SystemContract(_systemcontract).sendTokenToNewVersion2{value : 0.2 ton, flag: 1}(_pubaddr, _nameDao, _index, newwallet, grant, newversion);
        getMoney();
    }
    
    function sendTokenToNewVersion5(uint128 grant) public senderIs(_systemcontract)  accept saveMsg {
        m_pseudoDAOBalance += grant;        
        getMoney();
    }

    function sendDaoTokenToNewVersion(address wallet, address newwallet, uint128 grant, string newversion) public senderIs(_systemcontract) accept saveMsg {
        require(_limited == false, ERR_WALLET_LIMITED);
        optional(address) neww = newwallet;
        GoshDao(_goshdao).daoSendTokenToNewVersion{value : 0.2 ton, flag: 1}(_pubaddr, _index, wallet, neww, grant, newversion);
        getMoney();
    }
    
    function receiveToken(
        address pubaddr,
        uint128 index,
        uint128 grant
    ) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept saveMsg {
        m_pseudoDAOBalance += grant;
        getMoney();
    }

    function _addToken(
        address pubaddr,
        uint128 token
    ) private view {
        GoshDao(_goshdao).addVoteTokenPub{value: 0.1 ton, flag: 1}(pubaddr, _pubaddr, _index, token);
    }
    
    function _addTokenRegular(
        address pubaddr,
        uint128 token
    ) private view {
        GoshDao(_goshdao).addRegularTokenPub{value: 0.1 ton, flag: 1}(pubaddr, _pubaddr, _index, token);
    }
    
    function getTaskAddr(string nametask, address repo) private view returns(address) {
        address taskaddr = GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, repo, nametask);
        return taskaddr;
    }

    function getBigTaskAddr(string nametask, address repo) private view returns(address) {
        address taskaddr = GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], _goshdao, repo, nametask);
        return taskaddr;
    }
/*
    function setTaskConfig(
        string repoName,
        string nametask,
        ConfigGrant grant
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        TvmCell deployCode = GoshLib.buildTaskCode(_code[m_TaskCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Task, varInit: {_nametask: nametask}});
        address taskaddr = address.makeAddrStd(0, tvm.hash(s1));
        Task(taskaddr).setConfig{value:0.3 ton}(grant, _index);
        getMoney();
    }
*/
    //Tree part
    function deployTree(
        string repoName,
        string shaTree,
        uint256 shainnerTree,
        mapping(uint256 => TreeObject) datatree,
        uint128 number
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        _deployTree(repoName, shaTree, shainnerTree, datatree, number);
    }

    function destroyTree(
        string repoName,
        uint256 shainnerTree
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnerTree, GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName))).destroy{value: 0.2 ton, flag: 1}(_pubaddr, _index);
    }

    function deployAddTree(
        string repoName,
        uint256 shainnerTree,
        mapping(uint256 => TreeObject) datatree
    ) public onlyOwnerPubkeyOptional(_access)  accept saveMsg {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        Tree(GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnerTree, GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName))).addTree{value: 0.2 ton, flag: 1}(_pubaddr, _index, datatree);
    }

    function _deployTree(
        string repoName,
        string shaTree,
        uint256 shainnerTree,
        mapping(uint256 => TreeObject) datatree,
        uint128  number
    ) internal {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        TvmCell s1 = GoshLib.composeTreeStateInit(_code[m_TreeCode], shainnerTree, repo);
        new Tree{
            stateInit: s1, value: FEE_DEPLOY_TREE, wid: 0, bounce: true, flag: 1
        }(_pubaddr, datatree, _systemcontract, _goshdao, _code[m_WalletCode], _code[m_DiffCode], _code[m_TreeCode], _code[m_CommitCode], _code[m_SnapshotCode], shaTree, number, _index);
        getMoney();
    }

    function isProposalNeeded(
        string repoName,
        string branchName,
        address commit,
        uint128 numberChangedFiles,
        uint128 numberCommits,
        optional(ConfigCommit) task,
        bool isUpgrade
    ) internal view  {
       require(_limited == false, ERR_WALLET_LIMITED);
       uint128 value = numberChangedFiles * 1 ton;
       if (value > 1000 ton) { value = 1000 ton; }
       Repository(GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName)).isNotProtected{value:value + 1 ton, flag: 1}(_pubaddr, branchName, commit, numberChangedFiles, numberCommits, task, isUpgrade, _index);
    }

    //SMV part
    
    function updateHead() public onlyOwnerPubkey(_access.get())
    {
        getMoney();
        require(initialized, SMVErrors.error_not_initialized);
        require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE+
                                    5*SMVConstants.VOTING_COMPLETION_FEE +
                                    6*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);

        tvm.accept();
        _saveMsg();

        ISMVTokenLocker(tip3VotingLocker).updateHead {value: 5*SMVConstants.VOTING_COMPLETION_FEE +
                                                         5*SMVConstants.ACTION_FEE, flag: 1} ();
    }

    function updateHeadIn() private
    {
        getMoney();
        require(initialized, SMVErrors.error_not_initialized);
        require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE+
                                    5*SMVConstants.VOTING_COMPLETION_FEE +
                                    6*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);

        tvm.accept();
        _saveMsg();

        ISMVTokenLocker(tip3VotingLocker).updateHead {value: 5*SMVConstants.VOTING_COMPLETION_FEE +
                                                         5*SMVConstants.ACTION_FEE, flag: 1} ();
    } 

    function unlockVotingIn (uint128 amount) private 
    {
        require(initialized, SMVErrors.error_not_initialized);
        require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                        4*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
        tvm.accept();
        _saveMsg();
        ISMVTokenLocker(tip3VotingLocker).unlockVoting {value: 3*SMVConstants.ACTION_FEE, flag: 1}
                                                       (amount);
    }
    
    function lockVotingInDao (uint128 amount) public /* onlyOwnerPubkey(_access.get()) */
    {
        getMoney();
    	if (msg.value == 0) {
    	    require(msg.sender == _pubaddr, ERR_NOT_OWNER);
    	    require(initialized, SMVErrors.error_not_initialized);
    	    require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
    	                                2*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    	    tvm.accept();
    	    _saveMsg();
    	}
    	else{
    	    if (!initialized) return;
    	    if (!(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
    	                                  2*SMVConstants.ACTION_FEE)) return;
    	    tvm.accept();
    	}
	
    	if (amount == 0) {
    	    amount = math.min(m_pseudoDAOBalance, m_pseudoDAOVoteBalance);
    	}
	
    	if ((amount > 0) && (amount <= m_pseudoDAOBalance) && (amount <= m_pseudoDAOVoteBalance))
    	{
    	    /* TvmCell empty; */
    	    /* ITokenWallet(m_tokenWallet).transfer {value: 2*SMVConstants.ACTION_FEE, flag: 1}
    	                                         (amount, tip3VotingLocker, 0, address(this), true, empty) ; */
    	    //ISMVTokenLocker(tip3VotingLocker).lockVoting{value: 2*SMVConstants.ACTION_FEE, flag: 1} (amount);
    	    GoshDao(_goshdao).requestMint {value: SMVConstants.ACTION_FEE, flag: 1} (tip3VotingLocker, _pubaddr, amount, _index);
    	    m_pseudoDAOBalance = m_pseudoDAOBalance - amount;
    	    m_pseudoDAOVoteBalance -= amount;
    	    _lockedBalance += amount;
    	}
    }
    
    function unlockVotingInDao (uint128 amount) external onlyOwnerAddress(_pubaddr)
    {
    	require(initialized, SMVErrors.error_not_initialized);
    	require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    4*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low);
    	tvm.accept();
    	_saveMsg();
    	getMoney();

    	ISMVTokenLocker(tip3VotingLocker).unlockVoting {value: 3*SMVConstants.ACTION_FEE, flag: 1}
                                                   (amount);
        updateHeadIn();
    }

    function _startProposalForOperation(TvmCell dataCell, uint32 startTimeAfter, uint32 durationTime, uint128 num_clients, address[] reviewers, bool isTag) internal view
    {
        uint256 prop_id = tvm.hash(dataCell);
        /* uint32 startTime = block.timestamp + startTimeAfter;
        uint32 finishTime = block.timestamp + startTimeAfter + durationTime; */        
        mapping (address => bool) revs;
        //clean the dublicates
        for (address a: reviewers) revs[a] = true;
        
        TvmBuilder b;
        b.storeRef(dataCell);
        TvmBuilder br;
        br.store(revs);
        b.storeRef(br.toCell());
        TvmCell newDataCell = b.toCell();
        startProposal(prop_id, newDataCell, startTimeAfter, durationTime, num_clients, isTag);
    }

    function startProposalForSetCommit(
        string repoName,
        string branchName,
        string commit,
        uint128 numberChangedFiles,
        uint128 numberCommits,
        string comment,
        uint128 num_clients,
        optional(ConfigCommit) task,
        address[] reviewers
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE); 
//        if (_limited == true) {
//           require(_lockedBalance + m_pseudoDAOBalance > 0, ERR_LOW_TOKEN);
//        }
        tvm.accept();
        _saveMsg();

        uint256 proposalKind = SETCOMMIT_PROPOSAL_KIND;
        TvmCell c = abi.encode(proposalKind, repoName, branchName, commit, numberChangedFiles, numberCommits, task, comment, block.timestamp);

        _startProposalForOperation(c, PROPOSAL_START_AFTER, PROPOSAL_DURATION, num_clients, reviewers, false);

        getMoney();
    }
    
    function getCellSetCommit(string repoName,
        string branchName,
        string commit,
        uint128 numberChangedFiles,
        uint128 numberCommits,
        string comment,
        optional(ConfigCommit) task,
        optional(uint32) time) external pure returns(TvmCell) {
    	uint256 proposalKind = SETCOMMIT_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, branchName, commit, numberChangedFiles, numberCommits, task, comment, time.get());
    }
    
    function getCellForDaoAskGrant(address wallet, string repoName, string taskName,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = ASK_TASK_GRANT_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, wallet, repoName, taskName, comment, time.get());  
    }
    
    function daoAskUnlockAfterTombstone(address wallet) public onlyOwnerPubkeyOptional(_access) accept saveMsg {
        require(_limited == false, ERR_WALLET_LIMITED);
        GoshDao(_goshdao).daoAskLockTomb{value: 0.1 ton, flag: 1}(_pubaddr, _index, wallet);
    }
    
    function getCellForDaoLockVote(
        address wallet,
        bool isLock,
        uint128 grant,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DAO_LOCK_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, wallet, isLock, grant, comment, time.get());
    }
    
    function getCellAddRepoTag(string[] tag, string repo,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = REPOTAG_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, tag, repo, comment, time.get());      
    }
    
    function getCellDestroyRepoTag(string[] tag, string repo,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = REPOTAG_DESTROY_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, tag, repo, comment, time.get());      
    }
    
    function getCellAddDaoTag(string[] tag,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DAOTAG_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, tag, comment, time.get());      
    }
    
    function getCellDestroyDaoTag(string[] tag,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DAOTAG_DESTROY_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, tag, comment, time.get());      
    }
        
    function getCellAddProtectedBranch(string repoName,
        string branchName,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = ADD_PROTECTED_BRANCH_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, branchName, comment, time.get());
        
    }

    function getCellDeployGrants(
        string name,
        uint128[] grants,
        address tip3wallet,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DEPLOY_GRANT_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, name, grants, tip3wallet, comment, time.get());
    }

    function _deployGrants(string name, uint128[] grants, address tip3wallet) private {
        TvmCell s1 = GoshLib.composeGrantStateInit(_code[m_GrantCode], _goshdao, name);
        new Grant {
            stateInit: s1, value: 70 ton, wid: 0, flag: 1
        }(_pubaddr, _systemcontract, grants, tip3wallet, _code[m_WalletCode], _index);
        getMoney();
    }

    function getCellDestroyGrants(
        string name,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DESTROY_GRANT_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, name, comment, time.get());
    }

    function _destroyGrants(string name) private {
        address addr = GoshLib.calculateGrantAddress(_code[m_GrantCode], _goshdao, name);
        Grant(addr).destroy{value: 0.1 ton, flag: 1}(_pubaddr, _index);
        getMoney();
    }

    function getCellSetGrantPubkey(
        string name,
        uint256[] pubkeys,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = SET_GRANT_PUBKEYS_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, name, pubkeys, comment, time.get());
    }

    function _setGrantPubkeys(string name, uint256[] pubkeys) private {
        address addr = GoshLib.calculateGrantAddress(_code[m_GrantCode], _goshdao, name);
        Grant(addr).setResult{value: 0.1 ton, flag: 1}(_pubaddr, _index, pubkeys);
        getMoney();
    }

    function getCellCreateTagForDaoMembers(
        string[] tags,
        uint128[] multiples,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = CREATE_TAG_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, tags, multiples, comment, time.get());
    }

    function _setTags(
        string[] tags,
        uint128[] multiples
    ) private view {
        if (tags.length != multiples.length) { return; }
        GoshDao(_goshdao).setNewTags{value: 0.1 ton, flag: 1}(_pubaddr, _index, tags, multiples);
    }

    function getCellDestroyTagForDaoMembers(
        string[] tags,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DESTROY_TAG_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, tags, comment, time.get());
    }

    function _destroyTags(
        string[] tags
    ) private view {
        GoshDao(_goshdao).destroyTags{value: 0.1 ton, flag: 1}(_pubaddr, _index, tags);
    }

    function getCellDeployTagForDaoMembers(
        address[] pubaddr,
        string[] tags,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = SET_TAG_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, pubaddr, tags, comment, time.get());
    }

    function _setMembersTags(
        address[] pubaddr,
        string[] tags
    ) private view {
        if (tags.length != pubaddr.length) { return; }
        GoshDao(_goshdao).setNewMembersTags{value: 0.1 ton, flag: 1}(_pubaddr, _index, pubaddr, tags);
    }

    function getCelldeleteTagForDaoMembers(
        address[] pubaddr,
        string comment, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = DELETE_TAG_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, pubaddr, comment, time.get());
    }

    function _deleteTagsForMembers(
        address[] pubaddr
    ) private view {
        GoshDao(_goshdao).destroyTagsForMembers{value: 0.1 ton, flag: 1}(_pubaddr, _index, pubaddr);
    }
    
    function getCellTaskDestroy(
        string taskName,
        string repoName,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = TASK_DESTROY_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, taskName, comment, time.get());
    }
    
    function startMultiProposal(
        uint128 number,
        TvmCell proposals,
        uint128 num_clients, 
        address[] reviewers
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        require(number <= 50, ERR_TOO_MANY_PROPOSALS);
        require(number > 1, ERR_TOO_FEW_PROPOSALS);
        tvm.accept();
        _saveMsg();

        uint256 proposalKind = MULTI_PROPOSAL_KIND;
        TvmCell c = abi.encode(proposalKind, number, proposals, block.timestamp);
        _startProposalForOperation(c, PROPOSAL_START_AFTER, PROPOSAL_DURATION, num_clients, reviewers, false);
        getMoney();
    }

    function startOneProposal(
        TvmCell proposal,
        uint128 num_clients, 
        address[] reviewers
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        _saveMsg();
        _startProposalForOperation(proposal, PROPOSAL_START_AFTER, PROPOSAL_DURATION, num_clients, reviewers, false);
        getMoney();
    }

    function startOneProposalTag(
        TvmCell proposal,
        uint128 num_clients, 
        address[] reviewers
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        tvm.accept();
        _saveMsg();
        _startProposalForOperation(proposal, PROPOSAL_START_AFTER, PROPOSAL_DURATION, num_clients, reviewers, true);
        getMoney();
    }
    
    function startMultiProposalIn(
        uint128 number,
        TvmCell proposals,
        uint128 num_clients, 
        address[] reviewers
    ) public onlyOwnerAddress(_pubaddr)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        require(number <= 50, ERR_TOO_MANY_PROPOSALS);
        require(number > 1, ERR_TOO_FEW_PROPOSALS);
        tvm.accept();
        _saveMsg();

        uint256 proposalKind = MULTI_PROPOSAL_KIND;
        TvmCell c = abi.encode(proposalKind, number, proposals, block.timestamp);
        _startProposalForOperation(c, PROPOSAL_START_AFTER, PROPOSAL_DURATION, num_clients, reviewers, false);
        getMoney();
    }
    
     function _daoMulti(
        address wallet,
        uint128 number,
        TvmCell proposals,
        uint128 num_clients, 
        address[] reviewers
    ) private {
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        require(_tombstone == false, ERR_TOMBSTONE);
        GoshDao(_goshdao).daoMulti{value: 0.1 ton, flag: 1}(_pubaddr, _index, wallet, number, proposals, num_clients, reviewers);
        getMoney();
    }
    
    function startMultiProposalAsDao(
        address wallet,
        uint128 number,
        TvmCell proposals,
        uint128 num_clients_base, 
        address[] reviewers_base,
        uint128 num_clients,
        address[] reviewers
    ) public onlyOwnerPubkeyOptional(_access)  {
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        require(number <= 50, ERR_TOO_MANY_PROPOSALS);
        require(number > 1, ERR_TOO_FEW_PROPOSALS);
        tvm.accept();
        _saveMsg();
        uint256 proposalKind = MULTI_AS_DAO_PROPOSAL_KIND;
        TvmCell c = abi.encode(proposalKind, wallet, number, proposals, num_clients_base, reviewers_base, block.timestamp);
        _startProposalForOperation(c, PROPOSAL_START_AFTER, PROPOSAL_DURATION, num_clients, reviewers, false);
        getMoney();
    }
    
    
    function getCellTaskMultiAsDao(
        address wallet,
        uint128 number,
        TvmCell proposals,
        uint128 num_clients_base, 
        address[] reviewers_base,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = MULTI_AS_DAO_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, wallet, number, proposals, num_clients_base, reviewers_base, time.get());
    }
    
    function getCellBigTaskDestroy(
        string taskName,
        string repoName,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = BIGTASK_DESTROY_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, taskName, comment, time.get());
    }
    
    function getCellBigTaskDeploy(
        string taskName,
        string repoName,
        string[] tag,
        ConfigGrant grant,
        ConfigCommit assignersdata,
        uint128 freebalance,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = BIGTASK_DEPLOY_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, taskName, tag, grant, assignersdata, freebalance, comment, time.get());
    }
    
    function getCellTaskDeploy(
        string taskName,
        string repoName,
        string[] tag,
        ConfigGrant grant,
        optional(ConfigCommitBase) workers,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = TASK_DEPLOY_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, taskName, tag, grant, workers, comment, time.get());
    }
    
    function getCellDeleteProtectedBranch(string repoName,
        string branchName,
        string comment,
        optional(uint32) time) external pure returns(TvmCell) {
    	uint256 proposalKind = DELETE_PROTECTED_BRANCH_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, repoName, branchName, comment, time.get());
    }

    function tryProposalResult(address proposal) public onlyOwnerPubkeyOptional(_access)  accept saveMsg{
        require(address(this).balance > 200 ton, ERR_TOO_LOW_BALANCE);
        ISMVProposal(proposal).isCompleted{
            value: SMVConstants.VOTING_COMPLETION_FEE + SMVConstants.EPSILON_FEE
        }();
        getMoney();
    }
    
    function isCompletedCallbackIn(
        uint128 num,
        TvmCell propData,
        TvmCell Data
    ) external senderIs(address(this)) accept {
        tvm.accept();
        if (num == 0) { return; }
        if (num > 2) {
            (TvmCell data1, TvmCell data2) = abi.decode(Data,(TvmCell, TvmCell));
            this.isCompletedCallbackIn{value : 0.1 ton, flag: 1}(num - 1, data1, data2);
        }
        if (num == 2) {       
            this.isCompletedCallbackIn{value : 0.1 ton, flag: 1}(num - 1, Data, Data);
        }
        if (true) {
            TvmSlice s = propData.toSlice();
            uint256 kind = s.load(uint256);
            if (kind == SETCOMMIT_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (, string repoName, string branchName, string commit, uint128 numberChangedFiles, uint128 numberCommits, optional(ConfigCommit) task, , ) =
                    abi.decode(propData,(uint256, string, string, string, uint128, uint128, optional(ConfigCommit), string, uint32));
                address addrC = GoshLib.calculateCommitAddress(_code[m_CommitCode], GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName), commit);
                uint128 value = numberChangedFiles * 1 ton;
                if (value > 1000 ton) { value = 1000 ton; }
                Repository(GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName)).SendDiffSmv{value: value + 1 ton, bounce: true, flag: 1}(_pubaddr, _index, branchName, addrC, numberChangedFiles, numberCommits, task);
            } else
            if (kind == UPGRADE_CODE_PROPOSAL_KIND) {
                (, TvmCell UpgradeCode, TvmCell cell,,) = abi.decode(propData, (uint256, TvmCell, TvmCell, string, uint32));
                GoshDao(_goshdao).upgradeVersionCode{value: 0.1 ton, flag: 1}(_pubaddr, _index, UpgradeCode, cell);
            } else
            if (kind == ADD_PROTECTED_BRANCH_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (, string repoName, string branchName,) = abi.decode(propData,(uint256, string, string, uint32));
                Repository(GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName)).addProtectedBranch{value:0.19 ton, flag: 1}(_pubaddr, branchName, _index);
            } else
            if (kind == DELETE_PROTECTED_BRANCH_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (, string repoName, string branchName,) = abi.decode(propData,(uint256, string, string, uint32));
                Repository(GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName)).deleteProtectedBranch{value:0.19 ton, flag: 1}(_pubaddr, branchName, _index);
            } else
            if (kind == SET_TOMBSTONE_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (, string description,) = abi.decode(propData,(uint256, string, uint32));
                _setTombstoneDao(description);
            } else
            if (kind == DEPLOY_WALLET_DAO_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                //_deployWalletDao(address[] pubaddr)
                (, MemberToken[] pubaddr, optional(string)[] dao,,) = abi.decode(propData,(uint256, MemberToken[], optional(string)[], string, uint32));
                _deployWalletDao(pubaddr, dao);
            } else
            if (kind == DELETE_WALLET_DAO_PROPOSAL_KIND) {
                require(_tombstone == false, ERR_TOMBSTONE);
                (, address[] pubaddr,) = abi.decode(propData,(uint256, address[], uint32));
                _deleteWalletDao(pubaddr);
            } else
            if (kind == SET_UPGRADE_PROPOSAL_KIND) {
                (, string newversion, string description,) = abi.decode(propData,(uint256, string, string, uint32));
                _upgradeDao(newversion, description);
            } else
//            if (kind == TASK_PROPOSAL_KIND) {
//                (, string taskName, string repoName, uint128 index,) = abi.decode(propData,(uint256, string, string, uint128, uint32));
//                _confirmTask(taskName, repoName, index);
//            }  else
            if (kind == TASK_DESTROY_PROPOSAL_KIND) {
                (, string taskName, string repoName,) = abi.decode(propData,(uint256, string, string, uint32));
                _destroyTask(taskName, repoName);
            }  else
            if (kind == TASK_DEPLOY_PROPOSAL_KIND) {
                (, string taskName, string repoName, string[] tag, ConfigGrant grant, optional(ConfigCommitBase) workers,,) = abi.decode(propData,(uint256, string, string, string[], ConfigGrant, optional(ConfigCommitBase), string, uint32));
                _deployTask(taskName, repoName, tag, grant, workers);
            }  else

            if (kind == DEPLOY_REPO_PROPOSAL_KIND) {
                (, string repoName, string descr, optional(AddrVersion) previous, ) = abi.decode(propData,(uint256, string, string, optional(AddrVersion), uint32));
                _deployRepository(repoName, descr, previous);
            }  else
            if (kind == ADD_VOTE_TOKEN_PROPOSAL_KIND) {
                (, address pubaddr, uint128 grant,) = abi.decode(propData,(uint256, address, uint128, uint32));
                _addToken(pubaddr, grant);
            }  else
            if (kind == ADD_REGULAR_TOKEN_PROPOSAL_KIND) {
                (, address pubaddr, uint128 grant,) = abi.decode(propData,(uint256, address, uint128, uint32));
                _addTokenRegular(pubaddr, grant);
            }  else
            if (kind == MINT_TOKEN_PROPOSAL_KIND) {
                (, uint128 grant,) = abi.decode(propData,(uint256, uint128, uint32));
                _mintToken(grant);
            }  else
            if (kind == DAOTAG_PROPOSAL_KIND) {
                (, string[] tag,) = abi.decode(propData,(uint256, string[], uint32));
                GoshDao(_goshdao).smvdeploytag{value: 0.13 ton, flag: 1}(_pubaddr, _index, tag);
            }  else
            if (kind == DAOTAG_DESTROY_PROPOSAL_KIND) {
                (, string[] tag,) = abi.decode(propData,(uint256, string[], uint32));
                GoshDao(_goshdao).smvdestroytag{value: 0.13 ton, flag: 1}(_pubaddr, _index, tag);
            }  else
            if (kind == ALLOW_MINT_PROPOSAL_KIND) {
               GoshDao(_goshdao).smvnotallowmint{value: 0.13 ton, flag: 1}(_pubaddr, _index);
            }  else
            if (kind == CHANGE_ALLOWANCE_PROPOSAL_KIND) {
               (, address[] pubaddr, bool[] increase, uint128[] grant, , ) = abi.decode(propData,(uint256, address[], bool[], uint128[], string, uint32));
               GoshDao(_goshdao).changeAllowance{value: 0.13 ton, flag: 1}(_pubaddr, _index, pubaddr, increase, grant);
            }  else
            if (kind == REPOTAG_PROPOSAL_KIND) {
                (, string[] tag, string repo, ) = abi.decode(propData,(uint256, string[], string, uint32));
                Repository(GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repo)).smvdeployrepotag{value: 0.13 ton, flag: 1}(_pubaddr, _index, tag);
            }  else
            if (kind == REPOTAG_DESTROY_PROPOSAL_KIND) {
                (, string[] tag, string repo, ) = abi.decode(propData,(uint256, string[], string, uint32));
                Repository(GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repo)).smvdestroyrepotag{value: 0.13 ton, flag: 1}(_pubaddr, _index, tag);
            }  else
            if (kind == CHANGE_DESCRIPTION_PROPOSAL_KIND) {
                (, string repo, string descr, ,) = abi.decode(propData,(uint256, string, string, string, uint32));
                _changeDescription(repo, descr);
            } else
            if (kind == CHANGE_HIDE_VOTING_PROPOSAL_KIND) {
                (, bool result, ,) = abi.decode(propData,(uint256, bool, string, uint32));               
               GoshDao(_goshdao).changeHideVotingResult{value: 0.133 ton, flag: 1}(_pubaddr, _index, result);
            } else
            if (kind == CHANGE_ALLOW_DISCUSSION_PROPOSAL_KIND) {
               (, bool result, ,) = abi.decode(propData,(uint256, bool, string, uint32));
               GoshDao(_goshdao).changeAllowDiscussion{value: 0.133 ton, flag: 1}(_pubaddr, _index, result);
            } else
            if (kind == TAG_UPGRADE_PROPOSAL_KIND) {
               (, string[] repoName, string[] nametag, string newversion, ,) = abi.decode(propData, (uint256, string[], string[], string, string, uint32));
               _tagUpgrade (repoName, nametag, newversion);
            } else
            if (kind == ABILITY_INVITE_PROPOSAL_KIND) {
                (, bool result, ,) = abi.decode(propData,(uint256, bool, string, uint32));               
               _setAbilityInvite(result);
            } else
            if (kind == DAO_VOTE_PROPOSAL_KIND) {
               (, address wallet, uint256 platform_id, bool choice, uint128 amount, uint128 num_clients_base, string note,,) = abi.decode(propData, (uint256, address, uint256, bool, uint128, uint128, string, string, uint32));
               _daoVote(wallet, platform_id, choice, amount, num_clients_base, note);          
            } else
            if (kind == MULTI_AS_DAO_PROPOSAL_KIND) {
               (, address wallet, uint128 number, TvmCell proposals, uint128 num_clients_base, address[] reviewers_base,) = abi.decode(propData, (uint256, address, uint128, TvmCell, uint128, address[], uint32));
               _daoMulti(wallet, number, proposals, num_clients_base, reviewers_base);          
            } else
            if (kind == DELAY_PROPOSAL_KIND) {
               (, uint32 _time) = abi.decode(propData, (uint256, uint32));
               _time;
               GoshDao(_goshdao).doNothing{value: 0.1 ton, flag: 1}(_pubaddr, _index);          
            } else
            if (kind == SEND_TOKEN_PROPOSAL_KIND) {
                (, address wallet, optional(address) pubaddr, uint128 grant,,) = abi.decode(propData, (uint256, address, optional(address), uint128, string, uint32));
                _daoSendToken(wallet, pubaddr, grant);
            } else
            if (kind == REVIEW_CODE_PROPOSAL_KIND) {
                (, address wallet, address propaddr, bool isAccept,,) = abi.decode(propData, (uint256, address, address, bool, string, uint32));
                GoshDao(_goshdao).daoSendReview{value: 0.1 ton, flag: 1}(_pubaddr, _index, wallet, propaddr, isAccept);   
            } else
            if (kind == ASK_TASK_GRANT_PROPOSAL_KIND) {
                (, address wallet, string repoName, string taskName,,) = abi.decode(propData, (uint256, address, string, string, string, uint32));
                GoshDao(_goshdao).daoAskGrantFull{value: 0.1 ton, flag: 1}(_pubaddr, _index, wallet, repoName, taskName);   
            } else
            if (kind == DAO_LOCK_PROPOSAL_KIND) {
                (, address wallet, bool isLock, uint128 grant,,) = abi.decode(propData, (uint256, address, bool, uint128, string, uint32));
                GoshDao(_goshdao).daoAskLock{value: 0.1 ton, flag: 1}(_pubaddr, _index, wallet, isLock, grant);   
            } else 
            if (kind == TASK_REDEPLOY_PROPOSAL_KIND) {
                (, string repoName, string nameTask, string[] hashtag, TvmCell data,) = abi.decode(propData, (uint256, string, string, string[], TvmCell, uint32));
                GoshDao(_goshdao).redeployTask{value: 0.2 ton, flag: 1}(_pubaddr, _index, repoName, nameTask, hashtag, data);   
            } else 
            if (kind == TASK_REDEPLOYED_PROPOSAL_KIND) {
                GoshDao(_goshdao).redeployedTask{value: 0.2 ton, flag: 1}(_pubaddr, _index);  
            } else
            if (kind == TASK_UPGRADE_PROPOSAL_KIND) {
                (, string taskname, string reponame, string oldversion, address oldtask, string[] hashtag,,) = abi.decode(propData, (uint256, string, string, string, address, string[], string, uint32));
                GoshDao(_goshdao).upgradeTask{value: 0.1 ton, flag: 1}(_pubaddr, _index, taskname, reponame, oldversion, oldtask, hashtag);   
            }  else
            if (kind == TRANSFER_TO_NEW_VERSION_PROPOSAL_KIND) {
                (, address wallet, address newwallet, uint128 grant, string oldversion,,) = abi.decode(propData,(uint256, address, address, uint128, string, string, uint32));
                SystemContract(_systemcontract).DaoTransferToken2{value: 0.2 ton, flag: 1}(_pubaddr, _index, _nameDao, wallet, newwallet, grant, oldversion, version);
            } else 
            if (kind == START_PAID_MEMBERSHIP_PROPOSAL_KIND) {
                (, PaidMember newProgram, uint8 Programindex,,) = abi.decode(propData, (uint256, PaidMember, uint8, string, uint32));                
                _startPaidMembership(newProgram, Programindex);
            } else 
            if (kind == STOP_PAID_MEMBERSHIP_PROPOSAL_KIND) {            
                (, uint8 Programindex,,) = abi.decode(propData, (uint256, uint8, string, uint32));               
                _stopPaidMembership(Programindex);
            } else
            if (kind == BIGTASK_UPGRADE_PROPOSAL_KIND) {
                (, string taskname, string reponame, string oldversion, address oldtask, string[] hashtag,,) = abi.decode(propData, (uint256, string, string, string, address, string[], string, uint32));
                GoshDao(_goshdao).upgradeBigTask{value: 0.1 ton, flag: 1}(_pubaddr, _index, taskname, reponame, oldversion, oldtask, hashtag);   
            } else
            if (kind == BIGTASK_PROPOSAL_KIND) {
                (, string taskName, string repoName,) = abi.decode(propData,(uint256, string, string, uint32));
                _confirmTask(taskName, repoName);
            } else 
            if (kind == BIGTASK_DEPLOY_PROPOSAL_KIND) {
                (, string repoName, string taskName, string[] tag, ConfigGrant grant, ConfigCommit commit, uint128 freebalance, ,) = abi.decode(propData,(uint256, string, string, string[], ConfigGrant, ConfigCommit, uint128, string, uint32));
                _deployBigTask(repoName, taskName, tag, grant, commit, freebalance);
            } else
            if (kind == BIGTASK_DESTROY_PROPOSAL_KIND) {
                (, string taskName, string repoName,) = abi.decode(propData,(uint256, string, string, uint32));
                _destroyBigTask(taskName, repoName);
            } else
            if (kind == INDEX_PROPOSAL_KIND) {
                (, TvmCell data, uint128 index, uint128 typetr,,) = abi.decode(propData,(uint256, TvmCell, uint128, uint128, string, uint32));
                if (typetr == 0) { _deployIndex(data, index); }
                if (typetr == 1) { _updateIndex(data, index); }
                if (typetr == 2) { _destroyIndex(data, index); }
            } else 
            if (kind == DESTROY_REPOSITORY_PROPOSAL_KIND) {
                (,string repoName,,) = abi.decode(propData,(uint256, string, string, uint32));
                _destroyRepository(repoName);
            } else 
            if (kind == CREATE_TAG_KIND) {
                (,string[] tags, uint128[] multiples,,) = abi.decode(propData,(uint256, string[], uint128[], string, uint32));
                _setTags(tags, multiples);
            } else 
            if (kind == DESTROY_TAG_KIND) {
                (,string[] tags,,) = abi.decode(propData,(uint256, string[], string, uint32));
                _destroyTags(tags);
            } else 
            if (kind == SET_TAG_KIND) {
                (,address[] pubaddr, string[] tags,,) = abi.decode(propData,(uint256, address[], string[], string, uint32));
                _setMembersTags(pubaddr, tags);
            } else 
            if (kind == DELETE_TAG_KIND) {
                (,address[] pubaddr,,) = abi.decode(propData,(uint256, address[], string, uint32));
                _deleteTagsForMembers(pubaddr);
            } else 
            if (kind == DEPLOY_GRANT_KIND) {
                (,string name, uint128[] grants, address tip3,,) = abi.decode(propData,(uint256, string, uint128[], address, string, uint32));
                _deployGrants(name, grants, tip3);
            } else 
            if (kind == DESTROY_GRANT_KIND) {
                (,string name,,) = abi.decode(propData,(uint256, string, string, uint32));
                _destroyGrants(name);
            } else 
            if (kind == SET_GRANT_PUBKEYS_KIND) {
                (,string name,uint256[] pubkeys,,) = abi.decode(propData,(uint256, string, uint256[], string, uint32));
                _setGrantPubkeys(name, pubkeys);
            }
        }
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
        updateHeadIn();
        if (res.hasValue() && res.get()) {
            TvmSlice s = propData.toSlice();
            uint256 kind = s.load(uint256);
            if (kind == MULTI_PROPOSAL_KIND) { 
                (, uint128 num, TvmCell allpr,) = abi.decode(propData,(uint256, uint128, TvmCell, uint32));
                (TvmCell data1, TvmCell data2) = abi.decode(allpr,(TvmCell, TvmCell));
                this.isCompletedCallbackIn{value : 0.1 ton, flag: 1}(num, data1, data2);
                return;                
            }
            TvmCell data3;
            this.isCompletedCallbackIn{value : 0.1 ton, flag: 1}(1, propData, data3);
        }
    }
    
    function setRedeployedTask() public onlyOwnerPubkeyOptional(_access)  accept saveMsg{
        require(_tombstone == false, ERR_TOMBSTONE);
        require(_limited == false, ERR_WALLET_LIMITED);
        GoshDao(_goshdao).redeployedTask{value: 0.2 ton, flag: 1}(_pubaddr, _index);  
    }
    
    function voteFor (/* TvmCell platformCode, TvmCell clientCode, */ uint256 platform_id, bool choice, uint128 amount, uint128 num_clients, string note, bool isTag) external  onlyOwnerPubkey(_access.get())
    {
        require(initialized, SMVErrors.error_not_initialized);
        require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    2*SMVConstants.VOTING_FEE + num_clients*SMVConstants.CLIENT_LIST_FEE +
                                    SMVConstants.CLIENT_INIT_VALUE +
                                    SMVConstants.PROP_INITIALIZE_FEE +
                                    9*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low+2000);
        tvm.accept();
        _saveMsg();
        note;
        TvmBuilder staticBuilder;
        uint8 platformType = 0;
        staticBuilder.store(platformType, tip3VotingLocker, platform_id, platformCodeHash, platformCodeDepth);

        TvmBuilder inputBuilder;
        inputBuilder.store(choice);

        ISMVTokenLocker(tip3VotingLocker).startPlatform
                    {value:  2*SMVConstants.VOTING_FEE  + num_clients*SMVConstants.CLIENT_LIST_FEE +
                             SMVConstants.CLIENT_INIT_VALUE +
                             SMVConstants.PROP_INITIALIZE_FEE +
                             8*SMVConstants.ACTION_FEE, flag: 1 }
                    (m_SMVPlatformCode, m_SMVClientCode, amount, staticBuilder.toCell(), inputBuilder.toCell(),
                                    SMVConstants.CLIENT_INIT_VALUE +
                                    SMVConstants.PROP_INITIALIZE_FEE + 5*SMVConstants.ACTION_FEE, _goshdao, isTag, _pubaddr);
    }

    function voteForIn (/* TvmCell platformCode, TvmCell clientCode, */ uint256 platform_id, bool choice, uint128 amount, uint128 num_clients, string note, bool isTag) external  onlyOwnerAddress(_pubaddr)
    {
        require(initialized, SMVErrors.error_not_initialized);
        require(address(this).balance > SMVConstants.ACCOUNT_MIN_BALANCE +
                                    2*SMVConstants.VOTING_FEE + num_clients*SMVConstants.CLIENT_LIST_FEE +
                                    SMVConstants.CLIENT_INIT_VALUE +
                                    SMVConstants.PROP_INITIALIZE_FEE +
                                    9*SMVConstants.ACTION_FEE, SMVErrors.error_balance_too_low+2000);

        tvm.accept();
        _saveMsg();
        note;
        TvmBuilder staticBuilder;
        uint8 platformType = 0;
        staticBuilder.store(platformType, tip3VotingLocker, platform_id, platformCodeHash, platformCodeDepth);

        TvmBuilder inputBuilder;
        inputBuilder.store(choice);

        ISMVTokenLocker(tip3VotingLocker).startPlatform
                        {value:  2*SMVConstants.VOTING_FEE  + num_clients*SMVConstants.CLIENT_LIST_FEE +
                                 SMVConstants.CLIENT_INIT_VALUE +
                                 SMVConstants.PROP_INITIALIZE_FEE +
                                 8*SMVConstants.ACTION_FEE, flag: 1 }
                        (m_SMVPlatformCode, m_SMVClientCode, amount, staticBuilder.toCell(), inputBuilder.toCell(),
                                        SMVConstants.CLIENT_INIT_VALUE +
                                        SMVConstants.PROP_INITIALIZE_FEE + 5*SMVConstants.ACTION_FEE, _goshdao, isTag, _pubaddr);
    }

    //Fallback/Receive
    receive() external {
        if (msg.sender == _systemcontract) {
            _flag = false;
        }
        if (msg.sender == tip3VotingLocker) {        
            if (_totalDoubt != 0) {   
                unlockVotingIn(_totalDoubt);
            }
        }
    }

    //Selfdestruct
    function destroy() public view senderIs(_goshdao) { 
        this.destroyWalletAll{value : 0.2 ton, flag: 1}();
    }

    function destroyWalletAll() public senderIs(address(this)) {
        if (_walletcounter <= 1) {
            GoshDao(_goshdao).requestBurn {value: SMVConstants.ACTION_FEE, flag: 1} (tip3VotingLocker, _pubaddr, DEFAULT_DAO_BALANCE - m_pseudoDAOBalance, _index);
            selfdestruct(_systemcontract);
        }
        if (_index != 0) { return; }
         GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, _walletcounter - 1)).askForDestroy{value : 0.2 ton, flag: 1}();
         _walletcounter -= 1;
        this.destroyWalletAll{value : 0.2 ton, flag: 1}();
    }

    function askForDestroy() public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, 0)) {
        if (_index == 0) {
            Profile(_pubaddr).destroyedWallet{value: 0.1 ton, flag: 1}(_systemcontract, _goshdao, _index, version);
        }
        selfdestruct(_systemcontract);
    }

    //Getters
        
    function getContentCode(string repoName) external view returns(TvmCell) {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        return GoshLib.buildSignatureCode(_code[m_contentSignature], repo, version);
    }

    function getContentAddress(string repoName,
        string commit,
        string label) external view returns(address) {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, repoName);
        return GoshLib.calculateContentAddress(_code[m_contentSignature], _systemcontract, _goshdao, repo, commit, label);
    }

    function getDiffAddr(string reponame, string commitName, uint128 index1, uint128 index2) external view returns(address) {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, reponame);
        return  GoshLib.calculateDiffAddress(_code[m_DiffCode], repo, commitName, index1, index2);
    }

    function getAddrSystemContract() external view returns(address) {
        return _systemcontract;
    }

    function getTaskAddr(string nametask, string reponame) external view returns(address) {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, reponame);
        return GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, repo, nametask);
    }

    function getBigTaskAddr(string nametask, string reponame) external view returns(address) {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, reponame);
        return GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], _goshdao, repo, nametask);
    }

    function getSnapshotAddr(string commitSha, address repo, string name) external view returns(address) {
        return GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], repo, commitSha, name);
    }

    function getSnapshotCode(address repo) external view returns(TvmCell) {
        return GoshLib.buildSnapshotCode(_code[m_SnapshotCode], repo, version);
    }

    function getWalletAddr(uint128 index) external view returns(address) {
        return GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, _pubaddr, index);
    }

    function getGrantAddr(string name) external view returns(address) {
        return GoshLib.calculateGrantAddress(_code[m_GrantCode], _goshdao, name);
    }

    function getWalletsCount() external view returns(uint128) {
        return _walletcounter;
    }

    function getVersion() external pure returns(string, string) {
        return ("goshwallet", version);
    }

    function getDiffResult(bytes state, bytes diff) external pure returns(optional(bytes)) {
        return gosh.applyZipPatchQ(state, diff);
    }

    function getHash(bytes state) external pure returns(uint256) {
        return tvm.hash(state);
    }
    
    function getDetails() external view  returns(uint128, uint128, uint128, address, address, uint128, address, uint128, optional(uint256), bool, optional(uint128)) {
        return (_lockedBalance, m_pseudoDAOBalance, m_pseudoDAOVoteBalance, _goshdao, _rootpubaddr, _limit_wallets, _pubaddr, _walletcounter, _access, _tombstone, _expiredTime);
    }
    
    function getWalletIn() public view minValue(0.5 ton) {
        IObject(msg.sender).returnWallet{value: 0.1 ton, flag: 1}(_lockedBalance, m_pseudoDAOBalance, m_pseudoDAOVoteBalance, _goshdao, _rootpubaddr, _limit_wallets, _pubaddr, _walletcounter, _access, _tombstone, _expiredTime);
    }

    function AddCell(TvmCell data1, TvmCell data2) external pure returns(TvmCell) {
        return abi.encode(data1, data2);
    }
    
    function getCellForTask(string nametask, 
    	string repoName,
    	bool ready,
    	ConfigCommitBase[] candidates,   
    	ConfigGrant grant,
    	string[] hashtag,
    	uint128 indexFinal,
    	uint128 locktime,
    	uint128 fullAssign,
    	uint128 fullReview,
    	uint128 fullManager,
    	mapping(address => uint128) assigners,
    	mapping(address => uint128) reviewers,
    	mapping(address => uint128) managers,
    	uint128 assignfull,
    	uint128 reviewfull,
    	uint128 managerfull,
    	uint128 assigncomplete,
    	uint128 reviewcomplete,
    	uint128 managercomplete,
    	bool allassign,
    	bool allreview,
    	bool allmanager,
    	uint128 lastassign,
    	uint128 lastreview,
    	uint128 lastmanager,
    	uint128 balance) external view returns(TvmCell) {
        return abi.encode(nametask, repoName, ready, _systemcontract, _goshdao, candidates, grant, hashtag, indexFinal, locktime, fullAssign, fullReview, fullManager, assigners, reviewers, managers, assignfull, reviewfull, managerfull, assigncomplete, reviewcomplete, managercomplete, allassign, allreview, allmanager, lastassign, lastreview, lastmanager, balance);
    }
    
    function getCellForRedeployTask(string reponame, string nametask,  string[] hashtag, TvmCell data, optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = TASK_REDEPLOY_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, reponame, nametask, hashtag, data, time.get());
    }
    
    function getCellForRedeployedTask(optional(uint32) time) external pure returns(TvmCell) {
        uint256 proposalKind = TASK_REDEPLOYED_PROPOSAL_KIND;
        if (time.hasValue() == false) { time = block.timestamp; }
        return abi.encode(proposalKind, time.get());
    }

    function calculateInnerTreeHash(
        mapping(uint256 => TreeObject) _tree
    ) external pure returns(uint256) {
        return calculateInnerTreeHashPrivate(_tree, 0, 0);
    }

    function calculateInnerTreeHashPrivate(
        mapping(uint256 => TreeObject) _tree,
        uint256 key,
        uint256 finalhash
    ) private pure returns(uint256) {
        optional(uint256, TreeObject) res = _tree.next(key);
        while (res.hasValue()) {
            uint256 newkey;
            TreeObject data;
            (newkey, data) = res.get();
            res = _tree.next(newkey);
            finalhash = tvm.hash(abi.encode(finalhash, data));
        }
        return finalhash;
    }
}