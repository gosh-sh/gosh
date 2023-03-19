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

import "./modifiers/modifiers.sol";
import "goshwallet.sol";
import "systemcontract.sol";
import "tree.sol";
import "diff.sol";
import "commit.sol";
import "profiledao.sol";
import "snapshot.sol";
import "daotag.sol";
import "taggosh.sol";
import "task.sol";
import "./libraries/GoshLib.sol";
import "../smv/TokenRootOwner.sol";
import "../smv/SMVProposal.sol";


/* Root contract of gosh */
contract GoshDao is Modifiers, TokenRootOwner {
    string constant version = "3.0.0";

    address _versionController;
    uint128 _limittag = 3;
    uint128 _counttag = 0;
    address[] _volunteersnap;
    address[] _volunteerdiff;
    address[] _volunteertree;
    address[] _volunteercommit;
    address static _systemcontract;
    address _pubaddr;
    address _profiledao;
    string _nameDao;
    optional(address) _previous;
    mapping(uint256 => MemberToken) _wallets;
    mapping(uint8 => TvmCell) _code;
    mapping(uint256 => string) _hashtag;
    mapping(uint256 => string) _versions;
    uint128 _tokenforperson = 20;
    uint128 _limit_wallets;
    //added for SMV
    TvmCell m_TokenLockerCode;
    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode;

    address public _rootTokenRoot;
    address public _lastAccountAddress;
    
    bool _flag = false;
    bool _tombstone = false;
    bool public _allowMint = true;
    bool public _hide_voting_results = false;
    bool public _allow_discussion_on_proposals = true;
    
    uint128 timeMoney = 0;
    optional(MemberToken[]) saveaddr;
    optional(uint128) saveind;
    
    uint128 _reserve = 0;
    uint128 _allbalance = 0;
    uint128 _totalsupply = 0;
    
    bool public _isRepoUpgraded = false;
    bool public _abilityInvite = false;
    bool public _isCheck = false;
    
    constructor(
        address versionController,
        address pubaddr, 
        address profiledao,
        string name, 
        address[] pubmem,
        uint128 limit_wallets,
        TvmCell CommitCode,
        TvmCell RepositoryCode,
        TvmCell WalletCode,
        TvmCell TagCode,
        TvmCell codeSnapshot,
        TvmCell codeTree,
        TvmCell codeDiff,
        TvmCell contentSignature,
        TvmCell codeTask,
        TvmCell codedaotag,
        TvmCell coderepotag,
        TvmCell codetopic,
        /////////////////////
        TvmCell TokenLockerCode,
        TvmCell SMVPlatformCode,
        TvmCell SMVClientCode,
        TvmCell SMVProposalCode,
        TvmCell TokenRootCode,
        TvmCell TokenWalletCode,
        ////////////////////////
        optional(address) previous) public TokenRootOwner (TokenRootCode, TokenWalletCode) senderIs(_systemcontract) {
        tvm.accept();
        _profiledao = profiledao;
        _versionController = versionController;
        _pubaddr = pubaddr;
        _nameDao = name;
        _limit_wallets = limit_wallets;
        _code[m_WalletCode] = WalletCode;
        _code[m_RepositoryCode] = RepositoryCode;
        _code[m_CommitCode] = CommitCode;
        _code[m_TagCode] = TagCode;
        _code[m_SnapshotCode] = codeSnapshot;
        _code[m_TreeCode] = codeTree;
        _code[m_DiffCode] = codeDiff;
        _code[m_TaskCode] = codeTask;
        _code[m_DaoTagCode] = codedaotag;
        _code[m_RepoTagCode] = coderepotag;
        _code[m_TopicCode] = codetopic;
        /////
        m_TokenLockerCode = TokenLockerCode;
        m_SMVPlatformCode = SMVPlatformCode;

        TvmBuilder b;
        b.store(address(this));
        m_SMVProposalCode = tvm.setCodeSalt(SMVProposalCode, b.toCell());
        m_SMVClientCode = tvm.setCodeSalt(SMVClientCode, b.toCell());

        _code[m_contentSignature] = contentSignature;
        getMoney();
        ///////////////////////////////////////
        _rootTokenRoot = _deployRoot (address.makeAddrStd(0,0), 0, 0, false, false, false, address.makeAddrStd(0,0), now);
        if (previous.hasValue()) { 
            _previous = previous; 
            GoshDao(_previous.get()).getPreviousInfo{value: 0.1 ton, flag: 1}(_nameDao); 
        }
        else { this.deployWalletsConst{value: 0.1 ton, flag: 1}(pubmem, 0); }
        ProfileDao(_profiledao).deployedDao{value: 0.1 ton, flag: 1}(_nameDao, version);
    }
    
    function getPreviousInfo(string name) public internalMsg view {
        require(_nameDao == name, ERR_WRONG_DAO);
        tvm.accept();
        TvmCell a = abi.encode(_wallets, _hashtag, _reserve, _allbalance, _totalsupply, _versions);
        GoshDao(msg.sender).getPreviousInfoVersion{value: 0.1 ton, flag: 1}(version, a);
    }
    
    function getPreviousInfoVersion(string ver, TvmCell a) public internalMsg {
        require(_previous.hasValue() == true, ERR_FIRST_DAO);
        require(_previous.get() == msg.sender, ERR_WRONG_DAO);
        tvm.accept();
        if (ver == "2.0.0"){
            mapping(uint256 => MemberToken) wallets;
            mapping(uint256 => string) hashtag;
            (wallets, hashtag, _reserve, , _totalsupply , _versions) = abi.decode(a, (mapping(uint256 => MemberToken), mapping(uint256 => string), uint128, uint128, uint128, mapping(uint256 => string)));
            _versions[tvm.hash(version)] = version;
            uint256 zero;
            this.returnWalletsVersion{value: 0.1 ton}(ver, zero, wallets, hashtag);
        }
    }
    
    function getPreviousInfo1(mapping(uint256 => MemberToken) wallets, uint128 _) public internalMsg {
        _;
        require(_previous.hasValue() == true, ERR_FIRST_DAO);
        require(_previous.get() == msg.sender, ERR_WRONG_DAO);
        tvm.accept();
        uint256 zero;
        _versions[tvm.hash(version)] = version;
        _versions[tvm.hash("1.0.0")] = "1.0.0";
        this.returnWallets{value: 0.1 ton}(zero, wallets);
    }
    
    function returnWalletsVersion(string ver, uint256 key, mapping(uint256 => MemberToken) wallets, mapping(uint256 => string) tags) public internalMsg senderIs(address(this)) accept {
        uint256 zero;
        if (ver == "2.0.0"){
            optional(uint256, MemberToken) res = wallets.next(key);
            if ((key != zero) && (res.hasValue() == false)) { this.smvdeploytagin{value:0.2 ton}(address.makeAddrStd(0, key), tags.values()); }
            if (res.hasValue()) {
            	MemberToken pub;
            	(key, pub) = res.get();
//            	_reserve += pub.count;            	
 		uint128 count = pub.count;
            	pub.count = 0;
                pub.member = address.makeAddrStd(0, key);
            	deployWalletIn(pub);
                this.returnWalletsVersion{value: 0.1 ton, flag: 1}(ver, key, wallets, tags);
                address[] a1;
                a1.push(pub.member);
                bool[] a2;
                a2.push(true);
                uint128[] a3;
                a3.push(count);
                this.changeAllowanceIn{value:0.1 ton}(a1, a2, a3, 0);
            }
        }
        getMoney();
    }
    
    function returnWallets(uint256 key, mapping(uint256 => MemberToken) wallets) public internalMsg senderIs(address(this)) accept {
        optional(uint256, MemberToken) res = wallets.next(key);
        if (res.hasValue()) {
            MemberToken pub;
            (key, pub) = res.get();
            _reserve += pub.count;
            _totalsupply += pub.count;
            pub.member = address.makeAddrStd(0, key);
            deployWalletIn(pub);
            this.returnWallets{value: 0.1 ton, flag: 1}(key, wallets);
        }
        getMoney();
    }
    
    function getMoney() private {
        if (now - timeMoney > 3600) { _flag = false; timeMoney = now; }
        if (_flag == true) { return; }
        if (address(this).balance > 100000 ton) { return; }
        tvm.accept();
        _flag = true;
        SystemContract(_systemcontract).sendMoneyDao{value : 0.2 ton}(_nameDao, 100000 ton);
    }
    
    function changeHideVotingResult (address pub, uint128 index, bool res) public senderIs(getAddrWalletIn(pub, index))  accept {
        _hide_voting_results = res;
        getMoney();
    }
    
    function changeAllowDiscussion (address pub, uint128 index, bool res) public senderIs(getAddrWalletIn(pub, index))  accept {
        _allow_discussion_on_proposals = res;
        getMoney();
    }
    
    function sendMoneyDiff(address repo, string commit, uint128 index1, uint128 index2) public {
        TvmCell s0 = _composeDiffStateInit(commit, repo, index1, index2);
        address addr = address.makeAddrStd(0, tvm.hash(s0));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (address(this).balance < 20) { _volunteerdiff.push(msg.sender); getMoney(); return; }
        addr.transfer(10 ton);
        getMoney();
    }
    
    function sendMoneySnap(string branch, address repo, string name) public senderIs(getSnapshotAddr(branch, repo, name)) {
        tvm.accept();
        if (address(this).balance < 2000) { _volunteersnap.push(msg.sender); getMoney(); return; }
        msg.sender.transfer(1000 ton);
        getMoney();
    }
    
    function asktotalSupply() public view minValue(0.2 ton) accept {
        SMVProposalBase(msg.sender).onContinueAction{value: 0.1 ton}(math.min(_allbalance, _totalsupply - _reserve));
    }
    
    function volunteersnap() public senderIs(address(this)) accept {
        _volunteersnap[0].transfer(1000 ton);
        delete _volunteersnap[0];
        this.volunteersnap();
        getMoney();       
    }
    
    function volunteerdiff() public senderIs(address(this)) accept {
        _volunteerdiff[0].transfer(10 ton);
        delete _volunteerdiff[0];
        this.volunteerdiff();
        getMoney();
    }
        
    function volunteertree() public senderIs(address(this)) accept {
        _volunteertree[0].transfer(100 ton);
        delete _volunteertree[0];
        this.volunteertree();
        getMoney();
    }
        
    function volunteercommit() public senderIs(address(this)) accept {
        _volunteercommit[0].transfer(10 ton);
        delete _volunteercommit[0];
        this.volunteercommit();
        getMoney();
    }
    
    function _composeDiffStateInit(string commit, address repo, uint128 index1, uint128 index2) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_DiffCode], repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: commit, _index1: index1, _index2: index2}});
        return stateInit;
    }
    
    function sendMoneyCommit(address repo, string commit) public {
        TvmCell s0 = _composeCommitStateInit(commit, repo);
        address addr = address.makeAddrStd(0, tvm.hash(s0));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (address(this).balance < 2000) { _volunteercommit.push(msg.sender); getMoney(); return; }
        addr.transfer(1400 ton);
        getMoney();
    }
    
    function _composeCommitStateInit(string _commit, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_CommitCode], repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
    }
    
    function sendMoneyTree(address repo, string shaTree) public {
        TvmCell s1 = _composeTreeStateInit(shaTree, repo);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (address(this).balance < 2000) { _volunteertree.push(msg.sender); getMoney(); return; }
        addr.transfer(100 ton);
        getMoney();
    }
    
    function _composeTreeStateInit(string shaTree, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildTreeCode(_code[m_TreeCode], version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaTree: shaTree, _repo: repo}});
        return stateInit;
    }
    
    function upgradeDao(string newversion, string description, address pub, uint128 index) public senderIs(getAddrWalletIn(pub, index))  accept {
        description;
        getMoney();
        uint256 zero;
        if (_tombstone == false) { this.askForTombstoneIn{value : 0.1 ton, flag: 1}(zero, description); }
        _tombstone = true;
        SystemContract(_systemcontract).upgradeDao1{value : 0.1 ton, flag: 1}(_nameDao, newversion);
    }
    
    function upgradeTag4(string namerepo, string nametag, string namecommit, address commit, string content) public view senderIs(_systemcontract) accept {
        uint256 keyaddr;       
        require(_wallets.next(keyaddr).hasValue() == true, ERR_NO_DATA);
        (,MemberToken worker) = _wallets.next(keyaddr).get();
        GoshWallet(worker.member).deployTagUpgrade{value:3.1 ton}(namerepo, nametag, namecommit, commit, content);
    }

    //Wallet part
    function setRepoUpgraded(address pub, uint128 index, bool res) public senderIs(getAddrWalletIn(pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        _isRepoUpgraded = res;
        getMoney();
    }
    
    function setAbilityInvite(address pub, uint128 index, bool res) public senderIs(getAddrWalletIn(pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        _abilityInvite = res;
        getMoney();
    }
    
    function setTombstone(address pub, uint128 index, string description) public senderIs(getAddrWalletIn(pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        _tombstone = true;
        getMoney();
        uint256 zero;
        this.askForTombstoneIn{value : 0.1 ton, flag: 1}(zero, description);
    }
    
    function proposalForDeployWalletDao(
        address pub, 
        uint128 index, 
        MemberToken[] pubaddr,
        string comment,
        uint128 num_clients , address[] reviewers) public senderIs(getAddrWalletIn(pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        getMoney();
        (int8 _, uint256 keyaddr) = pub.unpack();
        _;
        if ((_abilityInvite == false) && (_wallets.exists(keyaddr) == false)) { return; }
        GoshWallet(getAddrWalletIn(pub, 0)).startProposalForDeployWalletDao2{value : 0.1 ton, flag: 1}(pubaddr, comment, num_clients, reviewers);
    }
    
    function isAlone (uint128 token, MemberToken[] pubaddr, address pub, uint128 index, string[] tag, uint128 typeF) public senderIs(getAddrWalletIn(pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        (int8 _, uint256 keyaddr) = pub.unpack();
        _;
        require(_wallets.prev(keyaddr).hasValue() == false, ERR_NOT_ALONE);
        require(_wallets.next(keyaddr).hasValue() == false, ERR_NOT_ALONE);
        require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
        getMoney();
        if (typeF == ALONE_DEPLOY_WALLET) { deployWalletPrivate(pubaddr); return; }
        if (typeF == ALONE_ADD_VOTE_TOKEN) {
            require(_reserve >= token, ERR_LOW_TOKEN_RESERVE);
            _wallets[keyaddr].count += token; 
            _allbalance += token;
            _reserve -= token;
            GoshWallet(getAddrWalletIn(pub, 0)).addVoteToken{value:0.2 ton}(token);
            return; 
        }
        if (typeF == ALONE_ADD_TOKEN) { 
            require(_reserve >= token, ERR_LOW_TOKEN_RESERVE);
            _reserve -= token;
            GoshWallet(getAddrWalletIn(pub, 0)).addRegularToken{value:0.2 ton}(token);
            return; 
        }
        if (typeF == ALONE_MINT_TOKEN) {
            require(_allowMint == true, ERR_NOT_ALLOW_MINT);
            _reserve += token;
            _totalsupply += token;
            return;
        }
        if (typeF == ALONE_DAOTAG) {   
            require(tag.length + _counttag <= _limittag, ERR_TOO_MANY_TAGS);    
            for (uint8 t = 0; t < tag.length; t++){     
                if (_hashtag.exists(tvm.hash(tag[t]))){ continue; }
                _counttag++;
                _hashtag[tvm.hash(tag[t])] = tag[t];
            	GoshWallet(getAddrWalletIn(pub, 0)).deployDaoTag{value:0.2 ton}(tag[t]);
            	
            }
            return;
        }
        if (typeF == ALONE_ALLOW_MINT) {   
            _allowMint = false;
            return;
        }
    }
    
    function smvnotallowmint (address pub, uint128 index) public senderIs(getAddrWalletIn(pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        _allowMint = false;
    }
    
    function smvdeploytag (address pub, uint128 index, string[] tag) public senderIs(getAddrWalletIn(pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        require(tag.length + _counttag <= _limittag, ERR_TOO_MANY_TAGS);
        for (uint8 t = 0; t < tag.length; t++){     
            if (_hashtag.exists(tvm.hash(tag[t]))) { continue; }
            _counttag++;
            _hashtag[tvm.hash(tag[t])] = tag[t];
            GoshWallet(getAddrWalletIn(pub, 0)).deployDaoTag{value:0.2 ton}(tag[t]);   	
        }
    }
  
    function askAddr (address pub, uint128 index, TvmCell data, uint128 index1) public view senderIs(getAddrWalletIn(pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        SystemContract(_systemcontract).askIndexAddr{value : 0.2 ton}(_nameDao, data, index1, msg.sender);  	
    }
    
    function upgradeVersionCode (address pub, uint128 index, TvmCell UpgradeCode, TvmCell cell) public view senderIs(getAddrWalletIn(pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        SystemContract(_systemcontract).upgradeVersionCode{value : 0.2 ton}(UpgradeCode, cell);
    }
    
    function daoVote (address pub, uint128 index, address wallet, uint256 platform_id, bool choice, uint128 amount, uint128 num_clients_base, string note) public view senderIs(getAddrWalletIn(pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        GoshWallet(wallet).voteForIn{value:0.2 ton}(platform_id, choice, amount, num_clients_base, note);   	
    }
    
    function daoSendToken (address pub, uint128 index, address wallet, optional(address)  pubaddr, uint128 grant) public view senderIs(getAddrWalletIn(pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
    	if (pubaddr.hasValue()) {
    	    GoshWallet(wallet).sendTokenIn{value:0.2 ton}(pubaddr.get(), grant);   
    	} else {
    	    GoshWallet(wallet).sendTokenToDaoReserveIn{value:0.2 ton}(grant);
    	}	
    }
    
    function daoMulti (address pub, uint128 index, address wallet, uint128 number, TvmCell proposals, uint128 num_clients, address[] reviewers) public view senderIs(getAddrWalletIn(pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        GoshWallet(wallet).startMultiProposalIn{value:0.2 ton}(number, proposals, num_clients, reviewers);   	
    }
        
    function doNothing (address pub, uint128 index) public view senderIs(getAddrWalletIn(pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        return;   	
    }
    
    function smvdeploytagin (address pub, string[] tag) public senderIs(address(this))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        require(tag.length + _counttag <= _limittag, ERR_TOO_MANY_TAGS);
        for (uint8 t = 0; t < tag.length; t++){     
            if (_hashtag.exists(tvm.hash(tag[t]))) { continue; }
            _counttag++;
            _hashtag[tvm.hash(tag[t])] = tag[t];
            GoshWallet(getAddrWalletIn(pub, 0)).deployDaoTag{value:0.2 ton}(tag[t]);   	
        }
    }
    
    function smvdestroytag (address pub, uint128 index, string[] tag) public senderIs(getAddrWalletIn(pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        for (uint8 t = 0; t < tag.length; t++){     
            if (_hashtag.exists(tvm.hash(tag[t])) == false) { continue; }
            _counttag--;
            delete _hashtag[tvm.hash(tag[t])];
            GoshWallet(getAddrWalletIn(pub, 0)).destroyDaoTag{value:0.2 ton}(tag[t]);   	
        }
    }
    
    function mintReserve (uint128 token, address pub, uint128 index) public senderIs(getAddrWalletIn(pub, index))  accept {
        require(_allowMint == true, ERR_NOT_ALLOW_MINT);
        _reserve += token;
        _totalsupply += token;
    }
    
    function isAloneDeploy (string nameRepo, string descr, optional(AddrVersion) previous, address pub, uint128 index, uint128 typeF) public senderIs(getAddrWalletIn(pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        (int8 _, uint256 keyaddr) = pub.unpack();
        _;
        require(_wallets.prev(keyaddr).hasValue() == false, ERR_NOT_ALONE);
        require(_wallets.next(keyaddr).hasValue() == false, ERR_NOT_ALONE);
        getMoney();
        if (typeF == ALONE_DEPLOY_REPO) { GoshWallet(msg.sender).deployRepositoryDao{value:0.2 ton}(nameRepo, descr, previous); return; }
    }
    
    function deployWalletPrivate(MemberToken[] pubaddrdeploy) private {
        this.deployWallets{value: 0.1 ton, flag: 1}(pubaddrdeploy, 0);
        getMoney();
    }
    
    function askForTombstoneIn(uint256 key, string description) public senderIs(address(this))  accept {
        optional(uint256, MemberToken) res = _wallets.next(key);
        if (res.hasValue()) {
            MemberToken pubaddr;
            (key, pubaddr) = res.get();
            GoshWallet(pubaddr.member).setTombstoneWallet{value: 0.1 ton, flag: 1}(description);
            this.askForTombstoneIn{value: 0.1 ton, flag: 1}(key, description);
        }
        getMoney();
    }
        
    function deployWallet(MemberToken[] pubaddrdeploy, address pubaddr, uint128 index) public senderIs(getAddrWalletIn(pubaddr, index)) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        this.deployWallets{value: 0.1 ton, flag: 1}(pubaddrdeploy, 0);
        getMoney();
    }

    function requestBurn(address recipient, address pubaddr, uint128 burn_amount, uint128 index) public view senderIs(getAddrWalletIn(pubaddr, index))
    {
        tvm.accept();
        TvmCell empty;
        IBurnableByRootTokenRoot(_rootTokenRoot).burnTokens {value: 2 ton}(
            burn_amount,
            recipient,
            this,
            recipient,
            empty
        );
    }

    function requestMint (address recipient, address pubaddr, uint128 mint_amount, uint128 index) public view senderIs(getAddrWalletIn(pubaddr, index))
    {
        tvm.accept();
        TvmCell empty;
        ITokenRoot(_rootTokenRoot).mint{value: 10 ton}(
            mint_amount,
            recipient,
            0,
            this,
            true,
            empty
        );
    }
    
    function setCheck (address pubaddrs, uint128 index) public senderIs(getAddrWalletIn(pubaddrs, index))  accept
    {
        _isCheck = true;
    }
    
    function changeAllowance (address pubaddrs, uint128 index, address[] pubaddr, bool[] increase, uint128[] grant) public view senderIs(getAddrWalletIn(pubaddrs, index))  accept
    {
        this.changeAllowanceIn2{value:0.1 ton}(pubaddr, increase, grant, 0);
    }
    
    function changeAllowanceIn (address[] pubaddr, bool[] increase, uint128[] grant, uint128 index) public senderIs(address(this))  accept
    {
        if (index >= grant.length) { return; }
        if (increase[index] == true) {
            (int8 _, uint256 keyaddr) = pubaddr[index].unpack();
            _;
            require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
            _wallets[keyaddr].count += grant[index];
            _allbalance += grant[index];
            GoshWallet(getAddrWalletIn(pubaddr[index], 0)).addAllowanceC{value: 0.2 ton}(grant[index]);
        } else {
            (int8 _, uint256 keyaddr) = pubaddr[index].unpack();
            _;
            require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
            require(grant[index] <= _wallets[keyaddr].count, ERR_LOW_TOKEN);
            _wallets[keyaddr].count -= grant[index];
            _allbalance -= grant[index];
            GoshWallet(getAddrWalletIn(pubaddr[index], 0)).addDoubt{value: 0.1 ton}(grant[index]);
        }
        this.changeAllowanceIn{value: 0.2 ton}(pubaddr, increase, grant, index + 1);
    }
    
    function changeAllowanceIn2 (address[] pubaddr, bool[] increase, uint128[] grant, uint128 index) public senderIs(address(this))  accept
    {   
        if (index >= grant.length) { return; }
        if (increase[index] == true) {
            (int8 _, uint256 keyaddr) = pubaddr[index].unpack();
            _;
            require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
            _wallets[keyaddr].count += grant[index];
            _allbalance += grant[index];
            GoshWallet(getAddrWalletIn(pubaddr[index], 0)).addAllowance{value: 0.2 ton}(grant[index]);
        } else {
            (int8 _, uint256 keyaddr) = pubaddr[index].unpack();
            _;
            require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
            require(grant[index] <= _wallets[keyaddr].count, ERR_LOW_TOKEN);
            _wallets[keyaddr].count -= grant[index];
            _allbalance -= grant[index];
            GoshWallet(getAddrWalletIn(pubaddr[index], 0)).addDoubt{value: 0.1 ton}(grant[index]);
        }
        this.changeAllowanceIn2{value: 0.2 ton}(pubaddr, increase, grant, index + 1);
    }
    
    function returnAllowance (uint128 grant, address pubaddr, uint128 index) public senderIs(getAddrWalletIn(pubaddr, index))  accept
    {
        (int8 _, uint256 keyaddr) = pubaddr.unpack();
        _;
         require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
         if (grant > _wallets[keyaddr].count) {
             _allbalance -= _wallets[keyaddr].count;
             _wallets[keyaddr].count = 0;
             return;
         }
        _wallets[keyaddr].count -= grant;
        _allbalance -= grant;
    }
    
    function addVoteTokenTask (address pubaddr, uint128 index, uint128 grant) public senderIs(getAddrWalletIn(pubaddr, index))  accept
    {
        (int8 _, uint256 keyaddr) = pubaddr.unpack();
        _;
        if (_wallets.exists(keyaddr) == false) {
            GoshWallet(getAddrWalletIn(pubaddr, 0)).setLimitedWallet{value: 0.2 ton}(false, _limit_wallets);
            _wallets[keyaddr] = MemberToken(getAddrWalletIn(pubaddr, 0), 0);
        }
        _wallets[keyaddr].count += grant;
        _allbalance += grant;
    }
 
    function addVoteTokenPub (address pub, address pubaddr, uint128 index, uint128 grant) public view senderIs(getAddrWalletIn(pubaddr, index))  accept
    {   
        this.addVoteTokenPub2{value: 0.1 ton}(pub, grant);
    }
    
    function addVoteTokenPub2 (address pub, uint128 grant) public pure senderIs(address(this))  accept  {    
        this.addVoteTokenPub3{value: 0.1 ton}(pub, grant);
    } 
    
    function addVoteTokenPub3 (address pub, uint128 grant) public senderIs(address(this)) accept {   
        (int8 _, uint256 keyaddr) = pub.unpack();
        _;
        address wallet = getAddrWalletIn(pub, 0);
        require(_reserve >= grant, ERR_LOW_TOKEN_RESERVE);
        if (_wallets.exists(keyaddr) == false) { return; }
        GoshWallet(wallet).addVoteToken{value:0.2 ton}(grant);
        _wallets[keyaddr].count += grant;
        _reserve -= grant;
        _allbalance += grant;
    }
    
    function addRegularTokenPub (address pub, address pubaddr, uint128 index, uint128 grant) public senderIs(getAddrWalletIn(pubaddr, index))  accept
    {
        require(_reserve >= grant, ERR_LOW_TOKEN_RESERVE);
        GoshWallet(getAddrWalletIn(pub, 0)).addRegularToken{value:0.2 ton}(grant);
        _reserve -= grant;
    }
    
    function deployWalletsConst(address[] pubmem, uint128 index) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (index >= pubmem.length) { return; }
        deployWalletInConst(pubmem[index]);
        index += 1;
        this.deployWalletsConst{value: 0.1 ton, flag: 1}(pubmem, index);
    }
    
    function deployWalletInConst(address pubaddr) private {
        tvm.accept();
        TvmCell s1 = _composeWalletStateInit(pubaddr, 0);
        _lastAccountAddress = address.makeAddrStd(0, tvm.hash(s1));
        (int8 _, uint256 keyaddr) = pubaddr.unpack();
        _;
        _wallets[keyaddr] = MemberToken(_lastAccountAddress, _tokenforperson);
        new GoshWallet {
            stateInit: s1, value: FEE_DEPLOY_WALLET, wid: 0
        }(  _versionController, _pubaddr, pubaddr, _nameDao, _code[m_CommitCode], 
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _code[m_TaskCode], _code[m_DaoTagCode], _code[m_RepoTagCode], _code[m_TopicCode], _versions, _limit_wallets, null,
            m_TokenLockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, _tokenforperson, _rootTokenRoot);
        GoshWallet(_lastAccountAddress).setLimitedWallet{value: 0.2 ton}(false, _limit_wallets);
        _allbalance += _tokenforperson;
        _totalsupply += _tokenforperson;
        getMoney();
    }

    function deployWallets(MemberToken[] pubmem, uint128 index) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (address(this).balance < 100 ton) { saveaddr = pubmem; saveind = index; return; }
        if (index >= pubmem.length) { return; }
        deployWalletIn(pubmem[index]);
        index += 1;
        this.deployWallets{value: 0.1 ton, flag: 1}(pubmem, index);
    }
    
    function deployWalletIn(MemberToken pubaddr) private {
        tvm.accept();
        require(_reserve >= pubaddr.count, ERR_LOW_TOKEN_RESERVE);
        (int8 _, uint256 keyaddr) = pubaddr.member.unpack();
        require(_wallets.exists(keyaddr) == false, ERR_WALLET_EXIST);
        _reserve -= pubaddr.count;
        _allbalance += pubaddr.count;
        TvmCell s1 = _composeWalletStateInit(pubaddr.member, 0);
        _lastAccountAddress = address.makeAddrStd(0, tvm.hash(s1));
        _;
        _wallets[keyaddr] = MemberToken(_lastAccountAddress, pubaddr.count);
        new GoshWallet {
            stateInit: s1, value: FEE_DEPLOY_WALLET, wid: 0
        }(  _versionController, _pubaddr, pubaddr.member, _nameDao, _code[m_CommitCode], 
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _code[m_TaskCode], _code[m_DaoTagCode], _code[m_RepoTagCode], _code[m_TopicCode], _versions, _limit_wallets, null,
            m_TokenLockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, pubaddr.count, _rootTokenRoot);
        GoshWallet(_lastAccountAddress).setLimitedWallet{value: 0.2 ton}(false, _limit_wallets);
        getMoney();
    }
    
    function deployWalletsOutMember(MemberToken[] pubmem, uint128 index) public accept saveMsg {
        getMoney();
        if (address(this).balance < 100 ton) { saveaddr = pubmem; saveind = index; return; }
        if (index >= pubmem.length) { return; }
        deployWalletOut(pubmem[index].member);
        index += 1;
        this.deployWalletsOutMember{value: 0.1 ton, flag: 1}(pubmem, index);
    }
    
    function deployWalletOut(address pubaddr) private {
        tvm.accept();
        TvmCell s1 = _composeWalletStateInit(pubaddr, 0);
        _lastAccountAddress = address.makeAddrStd(0, tvm.hash(s1));
        new GoshWallet {
            stateInit: s1, value: FEE_DEPLOY_WALLET, wid: 0
        }(  _versionController, _pubaddr, pubaddr, _nameDao, _code[m_CommitCode], 
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _code[m_TaskCode], _code[m_DaoTagCode], _code[m_RepoTagCode], _code[m_TopicCode], _versions, 1, null,
            m_TokenLockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, 0, _rootTokenRoot);
        getMoney();
    }
    
    function deleteWalletIn(address pubaddrdeploy) private {
        (int8 _, uint256 keyaddr) = pubaddrdeploy.unpack();
        _;
        require(_wallets.exists(keyaddr) == true, ERR_WALLET_NOT_EXIST); 
        GoshWallet(_lastAccountAddress).setLimitedWallet{value: 0.2 ton}(true, _limit_wallets);
        _allbalance -= _wallets[keyaddr].count;
        delete _wallets[keyaddr];
        getMoney();
    }
    
    function deleteWallet(address[] pubmem, address pubaddr, uint128 index) public senderIs(getAddrWalletIn(pubaddr, index)) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();       
        this.deleteWallets{value: 0.1 ton, flag: 1}(pubmem, index);
        getMoney();
    }
    
    function deployTask(
        address pubaddr,
        uint128 index,
        string repoName,
        string nametask,
        string[] hashtag,
        ConfigGrant grant
    ) public senderIs(getAddrWalletIn(pubaddr, index)) accept saveMsg {
        uint128 balance = 0; 
        this.calculateBalanceAssign{value:0.1 ton}(repoName, nametask, grant, balance, hashtag, 0, msg.sender);
     }   
     
     function calculateBalanceAssign(string repoName,
        string nametask,
        ConfigGrant grant,
        uint128 balance,
        string[] hashtag,
        uint128 index, address sender) public pure senderIs(address(this)) accept {
        uint128 check = 0;
        for (uint128 i = index; i < grant.assign.length; i++){
            check += 1;
            if (check == 3) { this.calculateBalanceAssign{value:0.1 ton}(repoName, nametask, grant, balance, hashtag, i, sender); return; }
            balance += grant.assign[i].grant;
            if (i != 0) { require(grant.assign[i].lock > grant.assign[i - 1].lock, ERR_WRONG_LOCK); }
            if (i == grant.assign.length) { require(grant.assign[i].grant != 0, ERR_ZERO_GRANT); }
        }       
        this.calculateBalanceReview{value:0.1 ton}(repoName, nametask, grant, balance, hashtag, 0, sender);
     }
     
     function calculateBalanceReview(string repoName,
        string nametask,
        ConfigGrant grant,
        uint128 balance,
        string[] hashtag,
        uint128 index, address sender) public pure senderIs(address(this)) accept {
        uint128 check = 0;
        for (uint128 i = index; i < grant.review.length; i++){
            check += 1;
            if (check == 3) { this.calculateBalanceReview{value:0.1 ton}(repoName, nametask, grant, balance, hashtag, i, sender); return; }
            balance += grant.review[i].grant;
            if (i != 0) { require(grant.review[i].lock > grant.review[i - 1].lock, ERR_WRONG_LOCK); }
            if (i == grant.review.length) { require(grant.review[i].grant != 0, ERR_ZERO_GRANT); }
        }       
        this.calculateBalanceManager{value:0.1 ton}(repoName, nametask, grant, balance, hashtag, 0, sender);
      }
      
      function calculateBalanceManager(string repoName,
        string nametask,
        ConfigGrant grant,
        uint128 balance,
        string[] hashtag,
        uint128 index, address sender) public senderIs(address(this)) accept {
        uint128 check = 0;
        for (uint128 i = index; i < grant.manager.length; i++){
            check += 1;
            if (check == 3) { this.calculateBalanceManager{value:0.1 ton}(repoName, nametask, grant, balance, hashtag, i, sender); return; }
            balance += grant.manager[i].grant;
            if (i != 0) { require(grant.manager[i].lock > grant.manager[i - 1].lock, ERR_WRONG_LOCK); }
            if (i == grant.manager.length) { require(grant.manager[i].grant != 0, ERR_ZERO_GRANT); }
        }
        require(_reserve >= balance, ERR_LOW_TOKEN_RESERVE);
        _reserve -= balance;
        address repo = _buildRepositoryAddr(repoName);
        TvmCell deployCode = GoshLib.buildTaskCode(_code[m_TaskCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Task, varInit: {_nametask: nametask}});
        new Task{
            stateInit: s1, value: FEE_DEPLOY_TASK, wid: 0, bounce: true, flag: 1
        }(repo, _systemcontract, address(this), _code[m_WalletCode], grant, balance, hashtag);
        this.deployTaskTag{value:0.1 ton}(repo, address.makeAddrStd(0, tvm.hash(s1)), hashtag, sender);
        getMoney();
    }
    
    function deployTaskTag (address repo, address task, string[] tag, address sender) public pure senderIs(address(this)) accept {
        for (uint8 t = 0; t < tag.length; t++){ 
            GoshWallet(sender).deployTaskTag{value:0.2 ton}(repo, task, tag[t]);   	
        }
    }
    
    function destroyTaskTag (string nametask, address repo, string[] tag, address sender) public view senderIs(getTaskAddr(nametask, repo))  accept {
        for (uint8 t = 0; t < tag.length; t++){ 
            GoshWallet(sender).destroyTaskTag{value:0.2 ton}(repo, msg.sender, tag[t]);   	
        }
    }
    
    function returnTaskToken(string nametask, address repo, uint128 token) public senderIs(getTaskAddr(nametask, repo)) accept {
        _reserve += token;
    }
    
    function receiveTokentoReserve(
        address pubaddr,
        uint128 index,
        uint128 grant
    ) public senderIs(getAddrWalletIn(pubaddr, index)) accept saveMsg {
        _reserve += grant;
        getMoney();
    }
    
    function getTaskAddr(string nametask, address repo) private view returns(address) {
        TvmCell deployCode = GoshLib.buildTagCode(_code[m_TaskCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Task, varInit: {_nametask: nametask}});
        address taskaddr = address.makeAddrStd(0, tvm.hash(s1));
        return taskaddr;
    }
    
    function deleteWallets(address[] pubmem, uint128 index) public senderIs(address(this)) {
        tvm.accept();
        if (index >= pubmem.length) { return; }
        deleteWalletIn(pubmem[index]);
        index += 1;
        this.deleteWallets{value: 0.1 ton, flag: 1}(pubmem, index);
    }
    
    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_systemcontract : _systemcontract, _goshdao: address(this), _index: index}
        });
        return _contract;
    }
    
    function _buildRepositoryAddr(string name) private view returns (address) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            _code[m_RepositoryCode], _systemcontract, address(this), version
        );
        return address(tvm.hash(tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: { _name: name }
        })));
    }
    
    function _composeRepoStateInit(string name) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            _code[m_RepositoryCode], _systemcontract, address(this), version
        );
        return tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: {_name: name}
        });
    }
    
    //Setters
    
    function getAddrWalletIn(address pubaddr, uint128 index) private view returns(address) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    
    
    function _getdaotagaddr(string daotag) private view returns(address){        
        TvmCell deployCode = GoshLib.buildDaoTagCode(_code[m_DaoTagCode], daotag, _versionController);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: DaoTag, varInit: {_goshdao: address(this)}});
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _systemcontract) {
            _flag = false;
            if (_volunteersnap.length > 0) { this.volunteersnap{value: 0.1 ton, flag: 1}();}
            if (_volunteerdiff.length > 0) { this.volunteerdiff{value: 0.1 ton, flag: 1}(); }
            if (_volunteertree.length > 0) { this.volunteertree{value: 0.1 ton, flag: 1}(); }
            if (_volunteercommit.length > 0) { this.volunteercommit{value: 0.1 ton, flag: 1}(); }
            if ((saveaddr.hasValue() == true) && (saveind.hasValue() == true)) {
                this.deployWallets{value: 0.1 ton, flag: 1}(saveaddr.get(), saveind.get());
                saveaddr = null;
                saveind = null;
            }
        }
    }

    //Getters    
    function getTaskCode(string repoName) external view returns(TvmCell) {
        address repo = _buildRepositoryAddr(repoName);
        return GoshLib.buildTaskCode(_code[m_TaskCode], repo, version);
    }
    
    function getSnapshotAddr(string branch, address repo, string name) private view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], repo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }
         
    function getDaoTagAddr(string daotag) external view returns(address) {
        
        return _getdaotagaddr(daotag);
    }
    
    function getAddrWallet(address pubaddr, uint128 index) external view returns(address) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function getWalletCode() external view returns(TvmCell) {
        return _code[m_WalletCode];
    }

    function getProposalCode() external view returns(TvmCell) {
        return m_SMVProposalCode;
    }

    function getClientCode() external view returns(TvmCell) {
        return m_SMVClientCode;
    }
    
    function getAddrRepository(string name) external view returns(address) {
        TvmCell s1 = _composeRepoStateInit(name);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
       
    function getTombstone() external view returns(bool) {
        return _tombstone;
    }
    
    function getWallets() external view returns(address[]) {
        address[] AllWallets;
        for ((uint256 _key, MemberToken value) : _wallets) {
            _key;
            AllWallets.push(value.member);
        }
        return AllWallets;
    }
    
    function getWalletsToken() external view returns(MemberToken[]) {
        MemberToken[] AllWallets;
        for ((uint256 _key, MemberToken value) : _wallets) {
            _key;
            AllWallets.push(value);
        }
        return AllWallets;
    }
    
    function getWalletsFull() external view returns(mapping(uint256 => MemberToken)) {
        return _wallets;
    }
    
    function getVersions() external view returns(mapping(uint256 => string)) {
        return _versions;
    }
    
    function getTags() external view returns(mapping(uint256 => string)) {
        return _hashtag;
    }
    
    function isMember(address pubaddr) external view returns(bool) {
        (int8 _, uint256 keyaddr) = pubaddr.unpack();
        _;
        return _wallets.exists(keyaddr);
    }

    function getNameDao() external view returns(string) {
        return _nameDao;
    }
    
    function getConfig() external view returns(uint128) {
        return (_limit_wallets);
    }

    function getVersion() external pure returns(string, string) {
        return ("goshdao", version);
    }
        
    function getTokenBalance() external view returns(uint128, uint128, uint128) {
        return (_reserve, _allbalance, _totalsupply);
    }
        
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
    
    function getPreviousDaoAddr() external view returns(optional(address)) {
        return _previous;
    }
    
    function getDetails() external view returns(address pubaddr, bool allowMint, bool hide_voting_results, bool allow_discussion_on_proposals, bool abilityInvite, bool isRepoUpgraded, string nameDao,
    mapping(uint256 => MemberToken) wallets, uint128 reserve, uint128 allbalance, uint128 totalsupply, mapping(uint256 => string) hashtag, bool isCheck) {
    return (_pubaddr, _allowMint, _hide_voting_results, _allow_discussion_on_proposals, _abilityInvite, _isRepoUpgraded, _nameDao, _wallets, _reserve, _allbalance, _totalsupply, _hashtag, _isCheck);
    }
}
