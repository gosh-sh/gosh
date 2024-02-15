// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./smv/modifiers/modifiers.sol";
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
import "bigtask.sol";
import "tagsupply.sol";
import "grant.sol";
import "./libraries/GoshLib.sol";
import "../smv/TokenRootOwner.sol";
import "../smv/SMVProposal.sol";
import "./smv/modifiers/SMVconfiguration.sol";


/* Root contract of gosh */
contract GoshDao is Modifiers, TokenRootOwner, SMVConfiguration {
    string constant version = "6.3.0";

    string _previousversion;
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
    mapping(uint256 => string) _daoMembers;
    mapping(uint256 => mapping(uint256 => bool)) _daoMembersTag;
    mapping(uint256 => Multiples) _daoTagData;
    mapping(uint8 => TvmCell) _code;
    mapping(uint256 => string) _hashtag;
    mapping(uint256 => string) _versions;
    mapping(uint256 => address) _my_wallets;
    mapping(uint256 => bool) _approved_proposal_with_tags;
    uint128 _tokenforperson = 20;
    uint128 _limit_wallets;
    //added for SMV
    TvmCell m_TokenLockerCode;
    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode;

    address public _rootTokenRoot;
    address public _lastAccountAddress;
    
    bool public _isTaskRedeployed = false;
    
    bool _flag = false;
    bool _tombstone = false;
    bool public _allowMint = true;
    bool public _hide_voting_results = false;
    bool public _allow_discussion_on_proposals = true;
    
    uint128 timeMoney = 0;
    optional(MemberToken[]) saveaddr;
    optional(optional(string)[]) savedao;
    optional(uint128) saveind;
    
    uint128 _reserve = 0;
    uint128 _allbalance = 0;
    uint128 _totalsupply = 0;
    
    bool public _isRepoUpgraded = false;
    bool public _abilityInvite = false;
    bool public _isCheck = false;
    bool public _isUpgraded = false;

    address _wrapper;

    mapping(uint8 => PaidMember) _paidMembership;
    
    constructor(
        address versionController,
        address pubaddr, 
        address profiledao,
        string name, 
        address[] pubmem,
        uint128 limit_wallets,
        TvmCell DaoCode,
        TvmCell CommitCode,
        TvmCell RepositoryCode,
        TvmCell WalletCode,
        TvmCell TagCode,
        TvmCell codeSnapshot,
        TvmCell codeTree,
        TvmCell codeDiff,
        TvmCell contentSignature,
        TvmCell codeTask,
        TvmCell codeBigTask,
        TvmCell codedaotag,
        TvmCell coderepotag,
        TvmCell codetopic,
        TvmCell codegrant,
        TvmCell codewrapper,
        TvmCell codetagsupply,
        /////////////////////
        TvmCell TokenLockerCode,
        TvmCell SMVPlatformCode,
        TvmCell SMVClientCode,
        TvmCell SMVProposalCode,
        TvmCell TokenRootCode,
        TvmCell TokenWalletCode,
        ////////////////////////
        optional(address) previous) TokenRootOwner (TokenRootCode, TokenWalletCode) senderIs(_systemcontract) {
        tvm.accept();
        _profiledao = profiledao;
        _versionController = versionController;
        _pubaddr = pubaddr;
        _nameDao = name; 
        _versions[tvm.hash(version)] = version;
        _limit_wallets = limit_wallets;
        _code[m_DaoCode] = DaoCode;
        _code[m_WalletCode] = WalletCode;
        _code[m_RepositoryCode] = RepositoryCode;
        _code[m_CommitCode] = CommitCode;
        _code[m_TagCode] = TagCode;
        _code[m_SnapshotCode] = codeSnapshot;
        _code[m_TreeCode] = codeTree;
        _code[m_DiffCode] = codeDiff;
        _code[m_TaskCode] = codeTask;
        _code[m_BigTaskCode] = codeBigTask;
        _code[m_DaoTagCode] = codedaotag;
        _code[m_RepoTagCode] = coderepotag;
        _code[m_TopicCode] = codetopic;
        _code[m_GrantCode] = codegrant;
        _code[m_WrapperCode] = codewrapper;
        _code[m_TagSupplyCode] = codetagsupply;
        /////
        m_TokenLockerCode = TokenLockerCode;
        m_SMVPlatformCode = SMVPlatformCode;

        TvmBuilder b;
        b.store(address(this));
        m_SMVProposalCode = tvm.setCodeSalt(SMVProposalCode, b.toCell());
        m_SMVClientCode = tvm.setCodeSalt(SMVClientCode, b.toCell());

        _code[m_contentSignature] = contentSignature;
        _approved_proposal_with_tags[SETCOMMIT_PROPOSAL_KIND] = true;
        _approved_proposal_with_tags[ADD_PROTECTED_BRANCH_PROPOSAL_KIND] = true;
        _approved_proposal_with_tags[DELETE_PROTECTED_BRANCH_PROPOSAL_KIND] = true;
        _approved_proposal_with_tags[DEPLOY_REPO_PROPOSAL_KIND] = true;
        _approved_proposal_with_tags[DESTROY_REPOSITORY_PROPOSAL_KIND] = true;
        _approved_proposal_with_tags[DEPLOY_BRANCH_KIND] = true;
        getMoney();
        ///////////////////////////////////////
        _rootTokenRoot = _deployRoot (address.makeAddrStd(0,0), 0, 0, false, false, false, address.makeAddrStd(0,0), block.timestamp);
        if (previous.hasValue()) { 
            _previous = previous; 
            GoshDao(_previous.get()).getPreviousInfo{value: 0.1 ton, flag: 1}(_nameDao); 
        }
        else { 
            _isUpgraded = true;
            _isTaskRedeployed = true;
            this.deployWalletsConst{value: 0.1 ton, flag: 1}(pubmem, 0); 
        }
        ProfileDao(_profiledao).deployedDao{value: 0.1 ton, flag: 1}(_nameDao, version);
//        TvmCell _dataflex;
//        TvmCell _contract = tvm.buildStateInit(_code[m_WrapperCode], _dataflex);
//        TvmCell payload = tvm.encodeBody(Wrapper); 
//		_wrapper = address.makeAddrStd(0, tvm.hash(_contract));
//		_wrapper.transfer({stateInit: _contract, body: payload, value: FEE_DEPLOY_WRAPPER});
    }

    function askWallets() public view minValue(0.2 ton) {
        Grant(msg.sender).setWallets{value: 0.1 ton, flag: 1}(_wallets, _daoMembersTag, _daoTagData);
    }
    
    function deployedWallet(address systemcontract, address goshdao, uint128 index, string ver) public   {
        systemcontract; goshdao; index; ver;
        if (index == 0) {
            (, uint256 keyaddr) = goshdao.unpack();
            if (msg.sender != GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, goshdao, address(this), index)) { return; }
            tvm.accept();
            _my_wallets[keyaddr] = msg.sender;
        }
    }
    
    function destroyedWallet(address systemcontract, address goshdao, uint128 index, string ver) public {
        systemcontract; goshdao; index; ver;
        if (index == 0) {
            (, uint256 keyaddr) = goshdao.unpack();
            if (msg.sender != GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, goshdao, address(this), index)) { return; }
            tvm.accept();
            delete _my_wallets[keyaddr];
        }
    }
    
    function getPreviousInfo(string name) public internalMsg view {
        require(_nameDao == name, ERR_WRONG_DAO);
        tvm.accept();
        TvmCell a = abi.encode(_allowMint, _hide_voting_results, _allow_discussion_on_proposals, _abilityInvite, _wallets, _hashtag, _my_wallets, _daoMembers, _reserve, _allbalance, _totalsupply, _versions, _paidMembership, _daoMembersTag, _daoTagData, _approved_proposal_with_tags);
        GoshDao(msg.sender).getPreviousInfoVersion{value: 0.1 ton, flag: 1}(version, a);
    }
    
    function getPreviousInfoVersion(string ver, TvmCell a) public internalMsg {
        require(_previous.hasValue() == true, ERR_FIRST_DAO);
        require(_previous.get() == msg.sender, ERR_WRONG_DAO);
        tvm.accept();
        _previousversion = ver;
        if (ver == "2.0.0"){
            mapping(uint256 => MemberTokenv4) wallets;
            mapping(uint256 => string) hashtag;
            (wallets, hashtag, _reserve, , _totalsupply , _versions) = abi.decode(a, (mapping(uint256 => MemberTokenv4), mapping(uint256 => string), uint128, uint128, uint128, mapping(uint256 => string)));
            _versions[tvm.hash(version)] = version;
            uint256 zero;
            this.returnWalletsVersionv4{value: 0.1 ton, flag: 1}(ver, zero, wallets, hashtag);
        }        
        if (ver == "3.0.0"){
            mapping(uint256 => MemberTokenv4) wallets;
            mapping(uint256 => string) hashtag;
            (wallets, hashtag, _my_wallets, _daoMembers, _reserve, , _totalsupply , _versions) = abi.decode(a, (mapping(uint256 => MemberTokenv4), mapping(uint256 => string), mapping(uint256 => address), mapping(uint256 => string), uint128, uint128, uint128, mapping(uint256 => string)));
            _versions[tvm.hash(version)] = version;
            uint256 zero;
            this.returnWalletsVersionv4{value: 0.1 ton, flag: 1}(ver, zero, wallets, hashtag);
            GoshDao(_previous.get()).getDaoIn{value: 0.3 ton, flag: 1}();
        }
        if (ver == "4.0.0") {
            mapping(uint256 => MemberTokenv4) wallets;
            mapping(uint256 => string) hashtag;
            ( _allowMint, _hide_voting_results, _allow_discussion_on_proposals, _abilityInvite, wallets, hashtag, _my_wallets, _daoMembers, _reserve, , _totalsupply , _versions) = abi.decode(a, (bool, bool, bool, bool, mapping(uint256 => MemberTokenv4), mapping(uint256 => string), mapping(uint256 => address), mapping(uint256 => string), uint128, uint128, uint128, mapping(uint256 => string)));
            _versions[tvm.hash(version)] = version;
            uint256 zero;
            this.returnWalletsVersionv4{value: 0.1 ton, flag: 1}(ver, zero, wallets, hashtag);
        }
        if ((ver == "5.0.0") || (ver == "5.1.0") || (ver == "6.0.0") || (ver == "6.1.0")) {
            mapping(uint256 => MemberToken) wallets;
            mapping(uint256 => string) hashtag;
            ( _allowMint, _hide_voting_results, _allow_discussion_on_proposals, _abilityInvite, wallets, hashtag, _my_wallets, _daoMembers, _reserve, , _totalsupply , _versions, _paidMembership) = abi.decode(a, (bool, bool, bool, bool, mapping(uint256 => MemberToken), mapping(uint256 => string), mapping(uint256 => address), mapping(uint256 => string), uint128, uint128, uint128, mapping(uint256 => string), mapping(uint8 => PaidMember)));
            _versions[tvm.hash(version)] = version;
            uint256 zero;
            this.returnWalletsVersion{value: 0.1 ton, flag: 1}(ver, zero, wallets, hashtag);
        } 
        if ((ver == "6.2.0") || (ver == "6.3.0")) {
            mapping(uint256 => MemberToken) wallets;
            mapping(uint256 => string) hashtag;
            ( _allowMint, _hide_voting_results, _allow_discussion_on_proposals, _abilityInvite, wallets, hashtag, _my_wallets, _daoMembers, _reserve, , _totalsupply , _versions, _paidMembership, _daoMembersTag, _daoTagData, _approved_proposal_with_tags) = abi.decode(a, (bool, bool, bool, bool, mapping(uint256 => MemberToken), mapping(uint256 => string), mapping(uint256 => address), mapping(uint256 => string), uint128, uint128, uint128, mapping(uint256 => string), mapping(uint8 => PaidMember), mapping(uint256 => mapping(uint256 => bool)), mapping(uint256 => Multiples), mapping(uint256 => bool)));
            _versions[tvm.hash(version)] = version;
            uint256 zero;
            this.returnWalletsVersion{value: 0.1 ton, flag: 1}(ver, zero, wallets, hashtag);
        } 
    }

    function returnDao(address, bool allowMint, bool hide_voting_results, bool allow_discussion_on_proposals, bool abilityInvite, bool, string, mapping(uint256 => MemberToken), uint128, uint128, uint128, mapping(uint256 => string), mapping(uint256 => address), mapping(uint256 => string), bool) public senderIs(_previous.get()) accept {
        _allowMint = allowMint;
        _hide_voting_results = hide_voting_results;
        _allow_discussion_on_proposals = allow_discussion_on_proposals; 
        _abilityInvite = abilityInvite;
    }

    
    function getPreviousInfo1(mapping(uint256 => MemberTokenv4) wallets, uint128 trash) public internalMsg {
        trash;
        require(_previous.hasValue() == true, ERR_FIRST_DAO);
        require(_previous.get() == msg.sender, ERR_WRONG_DAO);
        tvm.accept();
        uint256 zero;
        _versions[tvm.hash(version)] = version;
        _versions[tvm.hash("1.0.0")] = "1.0.0";
        this.returnWallets{value: 0.1 ton, flag: 1}(zero, wallets);
    }

    function returnWalletsVersionv4(string ver, uint256 key, mapping(uint256 => MemberTokenv4) wallets, mapping(uint256 => string) tags) public internalMsg senderIs(address(this)) accept {
        uint256 zero;
        if (ver == "2.0.0"){
            optional(uint256, MemberTokenv4) res = wallets.next(key);
            if ((key != zero) && (res.hasValue() == false)) { _isUpgraded = true; this.smvdeploytagin{value:0.2 ton, flag: 1}(address.makeAddrStd(0, key), tags.values()); }
            if (res.hasValue()) {
            	MemberTokenv4 pub;
            	(key, pub) = res.get();
//            	_reserve += pub.count;            	
 		        uint128 count = pub.count;
            	pub.count = 0;
                pub.member = address.makeAddrStd(0, key);
                MemberToken pubnew = MemberToken(pub.member, pub.count, 0);
            	deployWalletIn(pubnew);
                this.returnWalletsVersionv4{value: 0.1 ton, flag: 1}(ver, key, wallets, tags);
                address[] a1;
                a1.push(pub.member);
                bool[] a2;
                a2.push(true);
                uint128[] a3;
                a3.push(count);
                this.changeAllowanceIn{value:0.1 ton, flag: 1}(a1, a2, a3, 0);
            }
        }
        if ((ver == "3.0.0") || (ver == "4.0.0")){
            optional(uint256, MemberTokenv4) res = wallets.next(key);
            if ((key != zero) && (res.hasValue() == false)) { _isUpgraded = true; this.smvdeploytagin{value:0.2 ton, flag: 1}(address.makeAddrStd(0, key), tags.values()); }
            if (res.hasValue()) {
            	MemberTokenv4 pub;
            	(key, pub) = res.get();
//            	_reserve += pub.count;            	
 		        uint128 count = pub.count;
            	pub.count = 0;

                pub.member = address.makeAddrStd(0, key);
                MemberToken pubnew = MemberToken(pub.member, pub.count, 0);
            	deployWalletIn(pubnew);
            	if (_daoMembers[key] != "") { 
                    pub.member = GoshLib.calculateDaoAddress(_code[m_DaoCode], _systemcontract, _daoMembers[key]);
                    (, uint256 addrkey) = pub.member.unpack(); 
                    _daoMembers[addrkey] = _daoMembers[key];
                }
                this.returnWalletsVersionv4{value: 0.1 ton, flag: 1}(ver, key, wallets, tags);
                address[] a1;
                a1.push(pub.member);
                bool[] a2;
                a2.push(true);
                uint128[] a3;
                a3.push(count);
                this.changeAllowanceIn{value:0.1 ton, flag: 1}(a1, a2, a3, 0);
            }
        }
        getMoney();
    }

    function setApprovedProposal(mapping(uint256 => bool) approved_proposal_with_tags, address pubaddr, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index)) accept {
        _approved_proposal_with_tags = approved_proposal_with_tags;
    }

    function isItApprovedProposal(
        uint256 kind,
        TvmCell proposal,
        uint128 num_clients, 
        address[] reviewers,
        string[] data,
        address pubaddr, 
        uint128 index) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index)) accept {
        if (_approved_proposal_with_tags[kind] == true) {
            GoshWallet(msg.sender).startOneProposalWithTags{value: 0.1 ton, flag: 1}(proposal, num_clients, reviewers, data);
        }

    }
    
    function returnWalletsVersion(string ver, uint256 key, mapping(uint256 => MemberToken) wallets, mapping(uint256 => string) tags) public internalMsg senderIs(address(this)) accept {
        uint256 zero;
        if ((ver == "5.0.0") || (ver == "5.1.0") || (ver == "6.0.0") || (ver == "6.1.0") || (ver == "6.2.0") || (ver == "6.3.0")) {
            optional(uint256, MemberToken) res = wallets.next(key);
            if ((key != zero) && (res.hasValue() == false)) { _isUpgraded = true; this.smvdeploytagin{value:0.2 ton, flag: 1}(address.makeAddrStd(0, key), tags.values()); }
            if (res.hasValue()) {
            	MemberToken pub;
            	(key, pub) = res.get();
//            	_reserve += pub.count;            	
 		        uint128 count = pub.count;
            	pub.count = 0;

                pub.member = address.makeAddrStd(0, key);
            	deployWalletIn(pub);
            	if (_daoMembers[key] != "") { 
                    pub.member = GoshLib.calculateDaoAddress(_code[m_DaoCode], _systemcontract, _daoMembers[key]);
                    (, uint256 addrkey) = pub.member.unpack(); 
                    _daoMembers[addrkey] = _daoMembers[key];
                }
                this.returnWalletsVersion{value: 0.1 ton, flag: 1}(ver, key, wallets, tags);
                address[] a1;
                a1.push(pub.member);
                bool[] a2;
                a2.push(true);
                uint128[] a3;
                a3.push(count);
                this.changeAllowanceIn{value:0.1 ton, flag: 1}(a1, a2, a3, 0);
            }
        }
        getMoney();
    }
    
    function returnWallets(uint256 key, mapping(uint256 => MemberTokenv4) wallets) public internalMsg senderIs(address(this)) accept {
        optional(uint256, MemberTokenv4) res = wallets.next(key);
        if (res.hasValue()) {
            MemberTokenv4 pub;
            (key, pub) = res.get();
            _reserve += pub.count;
            _totalsupply += pub.count;
            pub.member = address.makeAddrStd(0, key);
            MemberToken pub1 = MemberToken(pub.member, pub.count, 0);
            deployWalletIn(pub1);
            this.returnWallets{value: 0.1 ton, flag: 1}(key, wallets);
        } else {
            _isUpgraded = true;
        }
        getMoney();
    }
    
    function getMoney() private {
        if (block.timestamp - timeMoney > 3600) { _flag = false; timeMoney = block.timestamp; }
        if (_flag == true) { return; }
        if (address(this).balance > 100000 ton) { return; }
        tvm.accept();
        _flag = true;
        SystemContract(_systemcontract).sendMoneyDao{value : 0.2 ton, flag: 1}(_nameDao, 100000 ton);
    }
    
    function changeHideVotingResult (address pub, uint128 index, bool res) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
        _hide_voting_results = res;
        getMoney();
    }
    
    function changeAllowDiscussion (address pub, uint128 index, bool res) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
        _allow_discussion_on_proposals = res;
        getMoney();
    }
    
    function sendMoneyDiff(address repo, string commit, uint128 index1, uint128 index2) public {
        address addr = GoshLib.calculateDiffAddress(_code[m_DiffCode], repo, commit, index1, index2);
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (address(this).balance < 20 ton) { _volunteerdiff.push(msg.sender); getMoney(); return; }
        addr.transfer(13 ton);
        getMoney();
    }
    
    function sendMoneySnap(string commitSha, address repo, string name) public senderIs(GoshLib.calculateSnapshotAddress(_code[m_SnapshotCode], repo, commitSha, name)) {
        tvm.accept();
        if (address(this).balance < 2000 ton) { _volunteersnap.push(msg.sender); getMoney(); return; }
        msg.sender.transfer(103 ton);
        getMoney();
    }
    
    function asktotalSupply() public view minValue(0.2 ton) accept {
        SMVProposalBase(msg.sender).onContinueAction{value: 0.1 ton, flag: 1}(math.min(_allbalance, _totalsupply - _reserve), _daoMembersTag, _daoTagData);
    }

    function calculateTagSupply(string[] tag) public view minValue(0.2 ton) accept {
        address tagaddr = GoshLib.calculateTagSupplyAddress(_code[m_TagSupplyCode], this, tvm.hash(tag[0]));
        TagSupply(tagaddr).getSupply{value: 0.25 ton, flag: 1}(msg.sender, tag, uint128(0), _allbalance);
    }

    function continueCalculateTagSupply(address proposal, string[] tag, uint128 index, uint128 sum) public view minValue(0.12 ton) accept {
        index += 1;
        if (index == tag.length) {
            SMVProposalBase(proposal).onContinueActionAgain{value: 0.1 ton, flag: 1}(sum, _daoMembersTag, _daoTagData);
            return;
        }
        address tagaddr = GoshLib.calculateTagSupplyAddress(_code[m_TagSupplyCode], this, tvm.hash(tag[index]));
        TagSupply(tagaddr).getSupply{value: 0.1 ton, flag: 1}(proposal, tag, index, sum);
    }
    
    function volunteersnap(address[] volunteer, uint128 index) public senderIs(address(this)) accept {
        address zero;
        if (address(this).balance < 2000 ton) { _volunteersnap.push(volunteer[index]); getMoney(); return; }
        else {
            if (volunteer[index] != zero) { volunteer[index].transfer(103 ton); }
        }
        this.volunteersnap(volunteer, index + 1);
        getMoney();       
    }
    
    function volunteerdiff(address[] volunteer, uint128 index) public senderIs(address(this)) accept {
        address zero;
        if (address(this).balance < 2000 ton) { _volunteerdiff.push(volunteer[index]); getMoney(); return; }
        else {
            if (volunteer[index] != zero) { volunteer[index].transfer(13 ton); }
        }
        this.volunteerdiff(volunteer, index + 1);
        getMoney();
    }
        
    function volunteertree(address[] volunteer, uint128 index) public senderIs(address(this)) accept {
        address zero;
        if (address(this).balance < 2000 ton) { _volunteertree.push(volunteer[index]); getMoney(); return; }
        else {
            if (volunteer[index] != zero) { volunteer[index].transfer(300 ton); }
        }
        this.volunteertree(volunteer, index + 1);
        getMoney();
    }
        
    function volunteercommit(address[] volunteer, uint128 index) public senderIs(address(this)) accept {
        address zero;
        if (address(this).balance < 2000 ton) { _volunteercommit.push(volunteer[index]); getMoney(); return; }
        else {
            if (volunteer[index] != zero) { volunteer[index].transfer(1400 ton); }
        }
        this.volunteercommit(volunteer, index + 1);
        getMoney();
    }
    
    function sendMoneyCommit(address repo, string commit) public {
        address addr = GoshLib.calculateCommitAddress(_code[m_CommitCode], repo, commit);
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (address(this).balance < 2000 ton) { _volunteercommit.push(msg.sender); getMoney(); return; }
        addr.transfer(1400 ton);
        getMoney();
    }
    
    function sendMoneyTree(address repo, uint256 shainnertree) public {
        address addr = GoshLib.calculateTreeAddress(_code[m_TreeCode], shainnertree, repo);
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        if (address(this).balance < 2000 ton) { _volunteertree.push(msg.sender); getMoney(); return; }
        addr.transfer(300 ton);
        getMoney();
    }
    
    function upgradeDao(string newversion, string description, address pub, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
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
        GoshWallet(worker.member).deployTagUpgrade{value:3.1 ton, flag: 1}(namerepo, nametag, namecommit, commit, content);
    }

    //Wallet part
    function setRepoUpgraded(address pub, uint128 index, bool res) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        _isRepoUpgraded = res;
        getMoney();
    }
    
    function setAbilityInvite(address pub, uint128 index, bool res) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        _abilityInvite = res;
        getMoney();
    }
    
    function setTombstone(address pub, uint128 index, string description) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
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
        optional(string)[] dao,
        string comment,
        uint128 num_clients , address[] reviewers) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        getMoney();
        (, uint256 keyaddr) = pub.unpack();
        if ((_abilityInvite == false) && (_wallets.exists(keyaddr) == false)) { return; }
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0)).startProposalForDeployWalletDao2{value : 0.1 ton, flag: 1}(pubaddr, dao, comment, num_clients, reviewers);
    }

    function changeTag(uint256 mem, uint128 token, bool increase, uint256 key) public view senderIs(this) accept {
        for (uint i = 0; i < BATCH_SIZE_TAG; i++){
            if (_daoMembersTag[mem].next(key).hasValue() == false) { return; }
            (uint256 newkey,bool worker) = _daoMembersTag[mem].next(key).get();
            worker;
            address tag = GoshLib.calculateTagSupplyAddress(_code[m_TagSupplyCode], this, newkey);
            TagSupply(tag).changeMemberToken{value: 0.1 ton, flag: 1}(token, increase);
            key = newkey;
        }
        this.changeTag{value: 0.1 ton, flag: 1}(mem, token, increase, key);
    }
    
    function isAlone (uint128 token, MemberToken[] pubaddr, address pub, uint128 index, string[] tag, uint128 typeF) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        (, uint256 keyaddr) = pub.unpack();
        require(_wallets.prev(keyaddr).hasValue() == false, ERR_NOT_ALONE);
        require(_wallets.next(keyaddr).hasValue() == false, ERR_NOT_ALONE);
        require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
        getMoney();
        if (typeF == ALONE_DEPLOY_WALLET) { deployWalletPrivate(pubaddr); return; }
        if (typeF == ALONE_ADD_VOTE_TOKEN) {
            require(_reserve >= token, ERR_LOW_TOKEN_RESERVE);
            _wallets[keyaddr].count += token; 
            _allbalance += token;
            if (_daoMembersTag.exists(keyaddr)) {
                this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, token, true, uint256(0));
            }
            _reserve -= token;
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0)).addVoteToken{value:0.2 ton, flag: 1}(token);
            return; 
        }
        if (typeF == ALONE_ADD_TOKEN) { 
            require(_reserve >= token, ERR_LOW_TOKEN_RESERVE);
            _reserve -= token;
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0)).addRegularToken{value:0.2 ton, flag: 1}(token);
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
            	GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0)).deployDaoTag{value:0.2 ton, flag: 1}(tag[t]);
            	
            }
            return;
        }
        if (typeF == ALONE_ALLOW_MINT) {   
            _allowMint = false;
            return;
        }
    }
    
    function smvnotallowmint (address pub, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        _allowMint = false;
    }
    
    function smvdeploytag (address pub, uint128 index, string[] tag) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        require(tag.length + _counttag <= _limittag, ERR_TOO_MANY_TAGS);
        for (uint8 t = 0; t < tag.length; t++){     
            if (_hashtag.exists(tvm.hash(tag[t]))) { continue; }
            _counttag++;
            _hashtag[tvm.hash(tag[t])] = tag[t];
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0)).deployDaoTag{value:0.2 ton, flag: 1}(tag[t]);   	
        }
    }
    
    function upgradeVersionCode (address pub, uint128 index, TvmCell UpgradeCode, TvmCell cell) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        SystemContract(_systemcontract).upgradeVersionCode{value : 0.2 ton, flag: 1}(UpgradeCode, cell);
    }
    
    function daoVote (address pub, uint128 index, address wallet, uint256 platform_id, bool choice, uint128 amount, uint128 num_clients_base, string note) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        GoshWallet(wallet).voteForIn{value:0.2 ton, flag: 1}(platform_id, choice, amount, num_clients_base, note);   	
    }
    
    function daoSendToken (address pub, uint128 index, address wallet, optional(address)  pubaddr, uint128 grant) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
    	if (pubaddr.hasValue()) {
    	    GoshWallet(wallet).sendTokenIn{value:0.2 ton, flag: 1}(pubaddr.get(), grant);   
    	} else {
    	    GoshWallet(wallet).sendTokenToDaoReserveIn{value:0.2 ton, flag: 1}(grant);
    	}	
    }

    function daoSendTokenToNewVersionAuto1 (address pub, uint128 index, address wallet) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
    	GoshWallet(wallet).daoSendTokenToNewVersionAuto2{value:0.2 ton, flag: 1}(_nameDao);   	
    }
    
    function daoMulti (address pub, uint128 index, address wallet, uint128 number, TvmCell proposals, uint128 num_clients, address[] reviewers) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        GoshWallet(wallet).startMultiProposalIn{value:0.2 ton, flag: 1}(number, proposals, num_clients, reviewers);   
    	getMoney();	
    }
    
     function daoSendTokenToNewVersion (address pub, uint128 index, address wallet, optional(address) newwallet, uint128 grant, string newversion) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == true, ERR_TOMBSTONE);
        GoshWallet(wallet).sendTokenToNewVersionIn{value:0.2 ton, flag: 1}(newwallet, grant, newversion);   
    	getMoney();	
    }
    
    function daoAskLockTomb (address pub, uint128 index, address wallet) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == true, ERR_TOMBSTONE);
    	GoshWallet(wallet).unlockVotingInDao{value:0.2 ton, flag: 1}(uint128(0));
    	getMoney();
    }
    
    function daoAskLock (address pub, uint128 index, address wallet, bool isLock, uint128 grant) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
    	if (isLock) {  GoshWallet(wallet).lockVotingInDao{value:0.2 ton, flag: 1}(grant); }
    	else { GoshWallet(wallet).unlockVotingInDao{value:0.2 ton, flag: 1}(grant); }
    	getMoney();
    }
    
    function daoAskGrantFull (address pub, uint128 index, address wallet, string repoName, string nameTask) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        GoshWallet(wallet).askGrantTokenFullIn{value:0.2 ton, flag: 1}(repoName, nameTask);   	
    	getMoney();
    }
    
    function daoSendReview (address pub, uint128 index, address wallet, address propAddr, bool isAccept) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        GoshWallet(wallet).askReviewerIn{value:0.2 ton, flag: 1}(propAddr, isAccept);  
    	getMoney(); 	
    }
        
    function doNothing (address pub, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
    	getMoney();
        return;   	
    }
    
    function redeployTask (address pub, uint128 index, string repoName, string nametask, string[] hashtag, TvmCell Data) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
    	require(_isTaskRedeployed == false, ERR_WRONG_DATA);
        require(_previousversion == "2.0.0", ERR_WRONG_DATA);
    	address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repoName);
        TvmCell deployCode = GoshLib.buildTaskCode(_code[m_TaskCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Task, varInit: {_nametask: nametask, _goshdao: address(this)}});
        optional(TvmCell) data1;
    	mapping(uint8 => TvmCell) code;
    	code[m_WalletCode] = _code[m_WalletCode];
    	code[m_DaoCode] = _code[m_DaoCode];
    	code[m_RepositoryCode] = _code[m_RepositoryCode];
        code[m_BigTaskCode] = _code[m_BigTaskCode];
    	optional(TvmCell) data2 = abi.encode(code, Data);
        new Task{
            stateInit: s1, value: FEE_DEPLOY_TASK, wid: 0, bounce: true, flag: 1
        }(data1, data2, data1);
        this.deployTaskTag{value:0.1 ton, flag: 1}(repo, address.makeAddrStd(0, tvm.hash(s1)), hashtag, msg.sender);  
    	getMoney();	
    }
    
    function upgradeTask (address pub, uint128 index, string nametask, string repoName, string oldversion, address oldtask, string[] hashtag) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
    	address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repoName);
        TvmCell deployCode = GoshLib.buildTaskCode(_code[m_TaskCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Task, varInit: {_nametask: nametask, _goshdao: address(this)}});
        optional(TvmCell) data = abi.encode(repoName, _systemcontract, _code[m_WalletCode], _code[m_DaoCode], _code[m_RepositoryCode], _code[m_BigTaskCode], hashtag, oldversion, oldtask);
        optional(TvmCell) data1;
        new Task{
            stateInit: s1, value: FEE_DEPLOY_TASK, wid: 0, bounce: true, flag: 1
        }(data1, data1, data);
        this.deployTaskTag{value:0.1 ton, flag: 1}(repo, address.makeAddrStd(0, tvm.hash(s1)), hashtag, msg.sender);  
    	getMoney();	
    }

    function upgradeBigTask (address pub, uint128 index, string nametask, string repoName, string oldversion, address oldtask, string[] hashtag) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
    	address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repoName);
        TvmCell deployCode = GoshLib.buildTaskCode(_code[m_BigTaskCode], repo, version);
        TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Task, varInit: {_nametask: nametask, _goshdao: address(this)}});
        optional(TvmCell) data = abi.encode(repoName, _systemcontract, _code[m_WalletCode], _code[m_DaoCode], _code[m_RepositoryCode], _code[m_TaskCode], hashtag, oldversion, oldtask);
        optional(TvmCell) data1;
        new BigTask{
            stateInit: s1, value: FEE_DEPLOY_BIGTASK, wid: 0, bounce: true, flag: 1
        }(data1, data);
        this.deployTaskTag{value:0.1 ton, flag: 1}(repo, address.makeAddrStd(0, tvm.hash(s1)), hashtag, msg.sender);  
    	getMoney();	
    }
    
    function redeployedTask (address pub, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
    	_isTaskRedeployed = true;
    	getMoney();	
    }
    
    function smvdeploytagin (address pub, string[] tag) public senderIs(address(this))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        require(tag.length + _counttag <= _limittag, ERR_TOO_MANY_TAGS);
        for (uint8 t = 0; t < tag.length; t++){     
            if (_hashtag.exists(tvm.hash(tag[t]))) { continue; }
            _counttag++;
            _hashtag[tvm.hash(tag[t])] = tag[t];
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0)).deployDaoTag{value:0.2 ton, flag: 1}(tag[t]);   	
        }
    }
    
    function smvdestroytag (address pub, uint128 index, string[] tag) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
    	require(_tombstone == false, ERR_TOMBSTONE);
        for (uint8 t = 0; t < tag.length; t++){     
            if (_hashtag.exists(tvm.hash(tag[t])) == false) { continue; }
            _counttag--;
            delete _hashtag[tvm.hash(tag[t])];
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0)).destroyDaoTag{value:0.2 ton, flag: 1}(tag[t]);   	
        }
    }
    
    function mintReserve (uint128 token, address pub, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
        require(_allowMint == true, ERR_NOT_ALLOW_MINT);
        _reserve += token;
        _totalsupply += token;
    }
    
    function isAloneDeploy (string nameRepo, string descr, optional(AddrVersion) previous, address pub, uint128 index, uint128 typeF) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        (, uint256 keyaddr) = pub.unpack();
        require(_wallets.prev(keyaddr).hasValue() == false, ERR_NOT_ALONE);
        require(_wallets.next(keyaddr).hasValue() == false, ERR_NOT_ALONE);
        getMoney();
        if (typeF == ALONE_DEPLOY_REPO) { GoshWallet(msg.sender).deployRepositoryDao{value:0.2 ton, flag: 1}(nameRepo, descr, previous); return; }
    }
    
    function deployWalletPrivate(MemberToken[] pubaddrdeploy) private {
        optional(string)[] zero;
        zero.push(null);
        this.deployWallets{value: 0.1 ton, flag: 1}(pubaddrdeploy, zero, 0);
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
        
    function deployWallet(MemberToken[] pubaddrdeploy, optional(string)[] dao, address pubaddr, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index)) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        this.deployWallets{value: 0.1 ton, flag: 1}(pubaddrdeploy, dao, 0);
        getMoney();
    }

    function requestBurn(address recipient, address pubaddr, uint128 burn_amount, uint128 index) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index))
    {
        tvm.accept();
        TvmCell empty;
        IBurnableByRootTokenRoot(_rootTokenRoot).burnTokens {value: 2 ton, flag: 1}(
            burn_amount,
            recipient,
            this,
            recipient,
            empty
        );
    }

    function requestMint (address recipient, address pubaddr, uint128 mint_amount, uint128 index) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index))
    {
        tvm.accept();
        TvmCell empty;
        ITokenRoot(_rootTokenRoot).mint{value: 10 ton, flag: 1}(
            mint_amount,
            recipient,
            0,
            this,
            true,
            empty
        );
    }
    
    function setCheck (address pubaddrs, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddrs, index))  accept
    {
        _isCheck = true;
    }

    function setNewTags (address pubaddrs, uint128 index, string[] tags, uint128[] multiples) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddrs, index))  accept
    {
        this.setNewTagsIn{value:0.1 ton, flag: 1}(tags, multiples, 0);
    }

    function setNewTagsIn (string[] tags, uint128[] multiples, uint128 index) public senderIs(address(this))  accept
    {
        if (index >= tags.length) { return; }
        if (multiples[index] < 100) {
            this.setNewTagsIn{value: 0.2 ton, flag: 1}(tags, multiples, index + 1);
            return;
        }
        if (_daoTagData.exists(tvm.hash(tags[index]))) {        
            address tag = GoshLib.calculateTagSupplyAddress(_code[m_TagSupplyCode], this, tvm.hash(tags[index]));
            TagSupply(tag).changeMultiples{value: 0.1 ton, flag: 1}(multiples[index]);
        }
        else {
            TvmCell s1 = GoshLib.composeTagSupplyStateInit(_code[m_TagSupplyCode], address(this), tvm.hash(tags[index]));
            new TagSupply {stateInit: s1, value: FEE_DEPLOY_TAG_SUPPLY, wid: 0, flag: 1}(multiples[index]);
        }
        _daoTagData[tvm.hash(tags[index])] = Multiples(multiples[index], tags[index]);
        this.setNewTagsIn{value: 0.2 ton, flag: 1}(tags, multiples, index + 1);
    }

    function setNewMembersTags (address pubaddrs, uint128 index, address[] pubaddr, string[] tags) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddrs, index))  accept
    {
        this.setNewMembersTagsIn{value:0.1 ton, flag: 1}(pubaddr, tags, 0);
    }

    function setNewMembersTagsIn (address[] pubaddr, string[] tags, uint128 index) public senderIs(address(this))  accept
    {
        if (index >= tags.length) { return; }
        (, uint256 keyaddr) = pubaddr[index].unpack();
        if (_wallets.exists(keyaddr)) {
            if (_daoMembersTag[keyaddr][tvm.hash(tags[index])] != true) {
                address tag = GoshLib.calculateTagSupplyAddress(_code[m_TagSupplyCode], this, tvm.hash(tags[index]));
                TagSupply(tag).addMember{value: 0.1 ton, flag: 1}(_wallets[keyaddr].count);
            }
            _daoMembersTag[keyaddr][tvm.hash(tags[index])] = true;
        }
        this.setNewMembersTagsIn{value: 0.2 ton, flag: 1}(pubaddr, tags, index + 1);
    }

    function destroyTagsForMembers (address pubaddrs, uint128 index, address[] pubaddr, string tag) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddrs, index))  accept
    {
        this.destroyTagsForMembersIn{value:0.1 ton, flag: 1}(pubaddr, tag, 0);
    }

    function destroyTagsForMembersIn (address[] pubaddr, string tag, uint128 index) public senderIs(address(this))  accept
    {
        if (index >= pubaddr.length) { return; }
        (, uint256 keyaddr) = pubaddr[index].unpack();
        if (_wallets.exists(keyaddr)) {
            if (_daoMembersTag.exists(keyaddr)) {
                address tagaddr = GoshLib.calculateTagSupplyAddress(_code[m_TagSupplyCode], this, tvm.hash(tag));
                TagSupply(tagaddr).deleteMember{value: 0.1 ton, flag: 1}(_wallets[keyaddr].count);
                delete _daoMembersTag[keyaddr][tvm.hash(tag)];
            }
        }
        this.destroyTagsForMembersIn{value: 0.2 ton, flag: 1}(pubaddr, tag, index + 1);
    }

    function destroyTags (address pubaddrs, uint128 index, string[] tags) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddrs, index))  accept
    {
        this.destroyTagsIn{value:0.1 ton, flag: 1}(tags, uint128(0));
    }

    function destroyTagsIn (string[] tags, uint128 index) public senderIs(address(this))  accept
    {
        if (index == tags.length) { 
            this.clearTags{value: 0.1 ton, flag: 1}(tags, 0);
            return; 
        }
        delete _daoTagData[tvm.hash(tags[index])];
        address tag = GoshLib.calculateTagSupplyAddress(_code[m_TagSupplyCode], this, tvm.hash(tags[index]));
        TagSupply(tag).destroy{value: 0.1 ton, flag: 1}();
        this.destroyTagsIn{value: 0.2 ton, flag: 1}(tags, index + 1);
    }

    function clearTags(string[] tags, uint256 key) public senderIs(address(this)) {
        tvm.accept();      
        if (_wallets.next(key).hasValue() == false) { return; }
        (uint256 newkey,MemberToken worker) = _wallets.next(key).get();
        worker;
        for (uint32 i = 0; i < tags.length; i++) {
            delete _daoMembersTag[newkey][tvm.hash(tags[i])];
        }
        this.clearTags{value: 0.1 ton, flag: 1}(tags, newkey);
    }
    
    function changeAllowance (address pubaddrs, uint128 index, address[] pubaddr, bool[] increase, uint128[] grant) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddrs, index))  accept
    {
        this.changeAllowanceIn2{value:0.1 ton, flag: 1}(pubaddr, increase, grant, 0);
    }
    
    function changeAllowanceIn (address[] pubaddr, bool[] increase, uint128[] grant, uint128 index) public senderIs(address(this))  accept
    {
        if (index >= grant.length) { return; }
        if (increase[index] == true) {
            (, uint256 keyaddr) = pubaddr[index].unpack();
            require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
            _wallets[keyaddr].count += grant[index];
            _allbalance += grant[index];
            if (_daoMembersTag.exists(keyaddr)) {
                this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, grant[index], true, uint256(0));
            }
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr[index], 0)).addAllowanceC{value: 0.2 ton, flag: 1}(grant[index]);
        } else {
            (, uint256 keyaddr) = pubaddr[index].unpack();
            require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
            require(grant[index] <= _wallets[keyaddr].count, ERR_LOW_TOKEN);
            _wallets[keyaddr].count -= grant[index];
            _allbalance -= grant[index];
            if (_daoMembersTag.exists(keyaddr)) {
                this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, grant[index], false, uint256(0));
            }
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr[index], 0)).addDoubt{value: 0.1 ton, flag: 1}(grant[index]);
        }
        this.changeAllowanceIn{value: 0.2 ton, flag: 1}(pubaddr, increase, grant, index + 1);
    }
    
    function changeAllowanceIn2 (address[] pubaddr, bool[] increase, uint128[] grant, uint128 index) public senderIs(address(this))  accept
    {   
        if (index >= grant.length) { return; }
        if (increase[index] == true) {
            (, uint256 keyaddr) = pubaddr[index].unpack();
            require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
            _wallets[keyaddr].count += grant[index];
            _allbalance += grant[index];
            if (_daoMembersTag.exists(keyaddr)) {
                this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, grant[index], true, uint256(0));
            }
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr[index], 0)).addAllowance{value: 0.2 ton, flag: 1}(grant[index]);
        } else {
            (, uint256 keyaddr) = pubaddr[index].unpack();
            require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
            require(grant[index] <= _wallets[keyaddr].count, ERR_LOW_TOKEN);
            _wallets[keyaddr].count -= grant[index];
            _allbalance -= grant[index];
            if (_daoMembersTag.exists(keyaddr)) {
                this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, grant[index], false, uint256(0));
            }
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr[index], 0)).addDoubt{value: 0.1 ton, flag: 1}(grant[index]);
        }
        this.changeAllowanceIn2{value: 0.2 ton, flag: 1}(pubaddr, increase, grant, index + 1);
    }
    
    function returnAllowance (uint128 grant, address pubaddr, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index))  accept
    {
        (, uint256 keyaddr) = pubaddr.unpack();
         require(_wallets.exists(keyaddr), ERR_WALLET_NOT_EXIST);
         if (grant > _wallets[keyaddr].count) {
             _allbalance -= _wallets[keyaddr].count;
            if (_daoMembersTag.exists(keyaddr)) {
                this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, _wallets[keyaddr].count, false, uint256(0));
            }
            _wallets[keyaddr].count = 0;
            return;
         }
        _wallets[keyaddr].count -= grant;
        _allbalance -= grant;
        if (_daoMembersTag.exists(keyaddr)) {
            this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, grant, false, uint256(0));
        }
    }
    
    function addVoteTokenTask (address pubaddr, uint128 index, uint128 grant) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index))  accept
    {
        (, uint256 keyaddr) = pubaddr.unpack();
        if (_wallets.exists(keyaddr) == false) {
            GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, 0)).setLimitedWallet{value: 0.2 ton, flag: 1}(false, _limit_wallets);
            _wallets[keyaddr] = MemberToken(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, 0), 0, 0);
        }
        _wallets[keyaddr].count += grant;
        _allbalance += grant;
        if (_daoMembersTag.exists(keyaddr)) {
            this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, grant, true, uint256(0));
        }
    }

    function startCheckPaidMembershipWallet(address pubaddr, uint128 index) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index))  accept
    {   
        this.checkExpiredTime{value: 0.1 ton, flag: 1}(0);
    }  

    function startCheckPaidMembershipService(uint8 ProgramIndex) public onlyOwnerPubkeyOptional(_paidMembership[ProgramIndex].accessKey)  accept saveMsg
    {   
        this.checkExpiredTime{value: 0.1 ton, flag: 1}(0);
    }      

    function checkExpiredTime(uint256 key) public senderIs(address(this)) {
        tvm.accept();      
        if (_wallets.next(key).hasValue() == false) { return; }
        (uint256 newkey,MemberToken worker) = _wallets.next(key).get();
        if ((worker.expired < block.timestamp) && (worker.expired != 0)) {
            deleteWalletSub(newkey);
        }
        this.checkExpiredTime{value: 0.1 ton, flag: 1}(newkey);
    }

    function deleteWalletSub(uint256 key) private {
        require(_wallets.exists(key) == true, ERR_WALLET_NOT_EXIST); 
        GoshWallet(_wallets[key].member).setLimitedWallet{value: 0.2 ton, flag: 1}(true, _limit_wallets);
        _allbalance -= _wallets[key].count;
        if (_daoMembersTag.exists(key)) {
            this.changeTag{value: 0.1 ton, flag: 1}(key, _wallets[key].count, false, uint256(0));
        }
        delete _wallets[key];
        getMoney();
    }

    function stopPaidMembership(address pubaddr, uint128 index, uint8 Programindex) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index))  accept
    {   
        require(_paidMembership.exists(Programindex) == true, ERR_PROGRAM_NOT_EXIST);
        _reserve += _paidMembership[Programindex].paidMembershipValue;
        delete _paidMembership[Programindex];
    }

    function startPaidMembership(address pubaddr, uint128 index, PaidMember newProgram, uint8 Programindex) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index))  accept
    {   
        require(_reserve >= newProgram.paidMembershipValue, ERR_LOW_TOKEN_RESERVE);
//        require(_paidMembership.exists(Programindex) == false, ERR_PROGRAM_EXIST);
        _reserve -= newProgram.paidMembershipValue;
        _paidMembership[Programindex].paidMembershipValue += newProgram.paidMembershipValue;
        _paidMembership[Programindex].accessKey = newProgram.accessKey;
        _paidMembership[Programindex].valuePerSubs = newProgram.valuePerSubs;
        _paidMembership[Programindex].timeForSubs = newProgram.timeForSubs;
        _paidMembership[Programindex].fiatValue = newProgram.fiatValue;
        _paidMembership[Programindex].decimals = newProgram.decimals;
        _paidMembership[Programindex].details = newProgram.details;
    }

    function deployMemberFromSubs(address pubaddr, optional(string) isdao, uint8 Programindex) public onlyOwnerPubkeyOptional(_paidMembership[Programindex].accessKey) accept saveMsg {
        (, uint256 keyaddr) = pubaddr.unpack(); 
        if (isdao.hasValue()) {
            if (GoshLib.calculateDaoAddress(_code[m_DaoCode], _systemcontract, isdao.get()) == pubaddr) { 
                _daoMembers[keyaddr] = isdao.get(); 
            }
        }
        uint128 valuePerSubs = _paidMembership[Programindex].valuePerSubs;
        uint128 timeForSubs = _paidMembership[Programindex].timeForSubs;
        require(_wallets.exists(keyaddr) == false, ERR_WALLET_EXIST);
        require(_paidMembership[Programindex].paidMembershipValue >= valuePerSubs, ERR_LOW_TOKEN_RESERVE);
        TvmCell s1 = GoshLib.composeWalletStateInit(_code[m_WalletCode], _systemcontract, address(this), pubaddr, 0);
        _lastAccountAddress = address.makeAddrStd(0, tvm.hash(s1));
        _wallets[keyaddr] = MemberToken(_lastAccountAddress, 0, block.timestamp + timeForSubs);
        new GoshWallet {
            stateInit: s1, value: FEE_DEPLOY_WALLET, wid: 0, flag: 1
        }(  _versionController, _pubaddr, pubaddr, _nameDao, _code[m_DaoCode], _code[m_CommitCode], 
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _code[m_TaskCode], _code[m_BigTaskCode], _code[m_DaoTagCode], _code[m_RepoTagCode], _code[m_TopicCode], _code[m_GrantCode], _versions, _limit_wallets, null,
            m_TokenLockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, 0, _rootTokenRoot);
        this.addVoteTokenPubSub{value: 0.2 ton, flag: 1}(pubaddr, valuePerSubs, block.timestamp + timeForSubs, Programindex);
        getMoney();
    }
    
    function addVoteTokenPubSub (address pub, uint128 grant, uint128 time, uint8 Programindex) public pure senderIs(address(this))  accept
    {   
        this.addVoteTokenPubSub2{value: 0.1 ton, flag: 1}(pub, grant, time, Programindex);
    }
    
    function addVoteTokenPubSub2 (address pub, uint128 grant, uint128 time, uint8 Programindex) public pure senderIs(address(this))  accept  {    
        this.addVoteTokenPubSub3{value: 0.1 ton, flag: 1}(pub, grant, time, Programindex);
    } 
    
    function addVoteTokenPubSub3 (address pub, uint128 grant, uint128 time, uint8 Programindex) public senderIs(address(this)) accept { 
        require(_paidMembership[Programindex].paidMembershipValue >= grant, ERR_LOW_TOKEN_RESERVE);  
        (, uint256 keyaddr) = pub.unpack();
        address wallet = GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0);
        GoshWallet(wallet).setLimitedWallet{value: 0.2 ton, flag: 1}(false, _limit_wallets);
        if (_wallets.exists(keyaddr) == false) { return; }
        GoshWallet(wallet).addVoteTokenSub{value:0.2 ton, flag: 1}(grant, time);
        _wallets[keyaddr].count += grant;
        _paidMembership[Programindex].paidMembershipValue -= grant;
        _allbalance += grant;
        if (_daoMembersTag.exists(keyaddr)) {
            this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, grant, true, uint256(0));
        }
    }
    
 
    function addVoteTokenPub (address pub, address pubaddr, uint128 index, uint128 grant) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index))  accept
    {   
        this.addVoteTokenPub2{value: 0.1 ton, flag: 1}(pub, grant);
    }
    
    function addVoteTokenPub2 (address pub, uint128 grant) public pure senderIs(address(this))  accept  {    
        this.addVoteTokenPub3{value: 0.1 ton, flag: 1}(pub, grant);
    } 
    
    function addVoteTokenPub3 (address pub, uint128 grant) public senderIs(address(this)) accept {   
        (, uint256 keyaddr) = pub.unpack();
        address wallet = GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0);
        require(_reserve >= grant, ERR_LOW_TOKEN_RESERVE);
        if (_wallets.exists(keyaddr) == false) { return; }
        GoshWallet(wallet).addVoteToken{value:0.2 ton, flag: 1}(grant);
        _wallets[keyaddr].count += grant;
        _reserve -= grant;
        _allbalance += grant;
        if (_daoMembersTag.exists(keyaddr)) {
            this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, grant, true, uint256(0));
        }
    }
    
    function addRegularTokenPub (address pub, address pubaddr, uint128 index, uint128 grant) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index))  accept
    {
        require(_reserve >= grant, ERR_LOW_TOKEN_RESERVE);
        GoshWallet(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pub, 0)).addRegularToken{value:0.2 ton, flag: 1}(grant);
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
        TvmCell s1 = GoshLib.composeWalletStateInit(_code[m_WalletCode], _systemcontract, address(this), pubaddr, 0);
        _lastAccountAddress = address.makeAddrStd(0, tvm.hash(s1));
        (, uint256 keyaddr) = pubaddr.unpack();
        _wallets[keyaddr] = MemberToken(_lastAccountAddress, _tokenforperson, 0);
        new GoshWallet {
            stateInit: s1, value: FEE_DEPLOY_WALLET, wid: 0, flag: 1
        }(  _versionController, _pubaddr, pubaddr, _nameDao, _code[m_DaoCode], _code[m_CommitCode], 
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _code[m_TaskCode], _code[m_BigTaskCode], _code[m_DaoTagCode], _code[m_RepoTagCode], _code[m_TopicCode], _code[m_GrantCode], _versions, _limit_wallets, null,
            m_TokenLockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, _tokenforperson, _rootTokenRoot);
        GoshWallet(_lastAccountAddress).setLimitedWallet{value: 0.2 ton, flag: 1}(false, _limit_wallets);
        _allbalance += _tokenforperson;
        if (_daoMembersTag.exists(keyaddr)) {
            this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, _tokenforperson, true, uint256(0));
        }
        _totalsupply += _tokenforperson;
        getMoney();
    }

    function deployWallets(MemberToken[] pubmem, optional(string)[] dao, uint128 index) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (address(this).balance < 100 ton) { saveaddr = pubmem; saveind = index; savedao = dao; return; }
        if (index >= pubmem.length) { return; }
        if (dao[index].hasValue()) {
            if (GoshLib.calculateDaoAddress(_code[m_DaoCode], _systemcontract, dao[index].get()) == pubmem[index].member) { 
                (, uint256 keyaddr) = pubmem[index].member.unpack();
                _daoMembers[keyaddr] = dao[index].get(); 
                deployWalletIn(pubmem[index]); 
            }
        }
        else { deployWalletIn(pubmem[index]); } 
        index += 1;
        this.deployWallets{value: 0.1 ton, flag: 1}(pubmem, dao, index);
    }
    
    function deployWalletIn(MemberToken pubaddr) private {
        tvm.accept();
        require(_reserve >= pubaddr.count, ERR_LOW_TOKEN_RESERVE);
        (, uint256 keyaddr) = pubaddr.member.unpack(); 
        require(_wallets.exists(keyaddr) == false, ERR_WALLET_EXIST);
        if (_daoMembers[keyaddr] != "") { 
            pubaddr.member = GoshLib.calculateDaoAddress(_code[m_DaoCode], _systemcontract, _daoMembers[keyaddr]);
            (, uint256 addrkey) = pubaddr.member.unpack(); 
            _daoMembers[addrkey] = _daoMembers[keyaddr];
        }
        (, keyaddr) = pubaddr.member.unpack();
        _reserve -= pubaddr.count;
        _allbalance += pubaddr.count;
        if (_daoMembersTag.exists(keyaddr)) {
            this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, pubaddr.count, true, uint256(0));
        }
        TvmCell s1 = GoshLib.composeWalletStateInit(_code[m_WalletCode], _systemcontract, address(this), pubaddr.member, 0);
        _lastAccountAddress = address.makeAddrStd(0, tvm.hash(s1));
        _wallets[keyaddr] = MemberToken(_lastAccountAddress, pubaddr.count, pubaddr.expired);
        new GoshWallet {
            stateInit: s1, value: FEE_DEPLOY_WALLET, wid: 0, flag: 1
        }(  _versionController, _pubaddr, pubaddr.member, _nameDao, _code[m_DaoCode], _code[m_CommitCode], 
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _code[m_TaskCode], _code[m_BigTaskCode], _code[m_DaoTagCode], _code[m_RepoTagCode], _code[m_TopicCode], _code[m_GrantCode], _versions, _limit_wallets, null,
            m_TokenLockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, pubaddr.count, _rootTokenRoot);
        GoshWallet(_lastAccountAddress).setLimitedWallet{value: 0.2 ton, flag: 1}(false, _limit_wallets);
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
        TvmCell s1 = GoshLib.composeWalletStateInit(_code[m_WalletCode], _systemcontract, address(this), pubaddr, 0);
        _lastAccountAddress = address.makeAddrStd(0, tvm.hash(s1));
        new GoshWallet {
            stateInit: s1, value: FEE_DEPLOY_WALLET, wid: 0, flag: 1
        }(  _versionController, _pubaddr, pubaddr, _nameDao, _code[m_DaoCode], _code[m_CommitCode], 
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _code[m_TaskCode], _code[m_BigTaskCode], _code[m_DaoTagCode], _code[m_RepoTagCode], _code[m_TopicCode], _code[m_GrantCode], _versions, 1, null,
            m_TokenLockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, 0, _rootTokenRoot);
        getMoney();
    }
    
    function deleteWalletIn(address pubaddrdeploy) private {
        (, uint256 keyaddr) = pubaddrdeploy.unpack();
        require(_wallets.exists(keyaddr) == true, ERR_WALLET_NOT_EXIST); 
        GoshWallet(_lastAccountAddress).setLimitedWallet{value: 0.2 ton, flag: 1}(true, _limit_wallets);
        _allbalance -= _wallets[keyaddr].count;
        if (_daoMembersTag.exists(keyaddr)) {
            this.changeTag{value: 0.1 ton, flag: 1}(keyaddr, _wallets[keyaddr].count, false, uint256(0));
        }
        delete _wallets[keyaddr];
        getMoney();
    }
    
    function deleteWallet(address[] pubmem, address pubaddr, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index)) {
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
        ConfigGrant grant,
        uint128 value,
        optional(string) bigtask,
        optional(ConfigCommitBase) workers
    ) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index)) accept saveMsg {
        uint128 balance = 0; 
        ConfigCommit commit;
        uint128 freebalance;
        this.calculateBalanceAssign{value:0.1 ton, flag: 1}(repoName, nametask, grant, balance, commit, freebalance, hashtag, 0, msg.sender, 0, value, bigtask, workers);
     }   

     function deployBigTask(
        address pubaddr,
        uint128 index,
        string repoName,
        string nametask,
        string[] hashtag,
        ConfigGrant grant,
        ConfigCommit commit,
        uint128 freebalance
    ) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index)) accept saveMsg {
        uint128 balance = 0; 
        this.calculateBalanceSubtask{value:0.1 ton, flag: 1}(repoName, nametask, grant, balance, commit, freebalance, hashtag, 0, msg.sender, 1, 0, null, null);
     }  

     function calculateBalanceSubtask(string repoName,
        string nametask,
        ConfigGrant grant,
        uint128 balance,
        ConfigCommit commit,
        uint128 freebalance,
        string[] hashtag,
        uint128 index, 
        address sender, 
        uint8 num,
        uint128 value,
        optional(string) bigtask,
        optional(ConfigCommitBase) workers) public pure senderIs(address(this)) accept {
        uint128 check = 0;
        for (uint128 i = index; i < grant.subtask.length; i++){
            check += 1;
            if (check == 3) { this.calculateBalanceSubtask{value:0.1 ton, flag: 1}(repoName, nametask, grant, balance, commit, freebalance, hashtag, i, sender, num, value, bigtask, workers); return; }
            balance += grant.subtask[i].grant;
            if (i != 0) { require(grant.subtask[i].lock > grant.subtask[i - 1].lock, ERR_WRONG_LOCK); }
            if (i == grant.subtask.length) { require(grant.subtask[i].grant != 0, ERR_ZERO_GRANT); }
        }       
        if (balance != freebalance) { return; }
        balance = 0;
        this.calculateBalanceAssign{value:0.1 ton, flag: 1}(repoName, nametask, grant, balance, commit, freebalance, hashtag, 0, sender, num, value, bigtask, workers);
     } 
     
     function calculateBalanceAssign(string repoName,
        string nametask,
        ConfigGrant grant,
        uint128 balance,
        ConfigCommit commit,
        uint128 freebalance,
        string[] hashtag,
        uint128 index, 
        address sender, 
        uint8 num,
        uint128 value,
        optional(string) bigtask,
        optional(ConfigCommitBase) workers) public pure senderIs(address(this)) accept {
        uint128 check = 0;
        for (uint128 i = index; i < grant.assign.length; i++){
            check += 1;
            if (check == 3) { this.calculateBalanceAssign{value:0.1 ton, flag: 1}(repoName, nametask, grant, balance, commit, freebalance, hashtag, i, sender, num, value, bigtask, workers); return; }
            balance += grant.assign[i].grant;
            if (i != 0) { require(grant.assign[i].lock > grant.assign[i - 1].lock, ERR_WRONG_LOCK); }
            if (i == grant.assign.length) { require(grant.assign[i].grant != 0, ERR_ZERO_GRANT); }
        }       
        this.calculateBalanceReview{value:0.1 ton, flag: 1}(repoName, nametask, grant, balance, commit, freebalance, hashtag, 0, sender, num, value, bigtask, workers);
     }
     
     function calculateBalanceReview(string repoName,
        string nametask,
        ConfigGrant grant,
        uint128 balance,
        ConfigCommit commit,
        uint128 freebalance,
        string[] hashtag,
        uint128 index, 
        address sender, 
        uint8 num,
        uint128 value,
        optional(string) bigtask,
        optional(ConfigCommitBase) workers) public pure senderIs(address(this)) accept {
        uint128 check = 0;
        for (uint128 i = index; i < grant.review.length; i++){
            check += 1;
            if (check == 3) { this.calculateBalanceReview{value:0.1 ton, flag: 1}(repoName, nametask, grant, balance, commit, freebalance, hashtag, i, sender, num, value, bigtask, workers); return; }
            balance += grant.review[i].grant;
            if (i != 0) { require(grant.review[i].lock > grant.review[i - 1].lock, ERR_WRONG_LOCK); }
            if (i == grant.review.length) { require(grant.review[i].grant != 0, ERR_ZERO_GRANT); }
        }       
        this.calculateBalanceManager{value:0.1 ton, flag: 1}(repoName, nametask, grant, balance, commit, freebalance, hashtag, 0, sender, num, value, bigtask, workers);
      }
      
      function calculateBalanceManager(string repoName,
        string nametask,
        ConfigGrant grant,
        uint128 balance,
        ConfigCommit commit,
        uint128 freebalance,
        string[] hashtag,
        uint128 index, 
        address sender, 
        uint8 num,      
        uint128 value,
        optional(string) bigtask,
        optional(ConfigCommitBase) workers) public senderIs(address(this)) accept {
        uint128 check = 0;
        for (uint128 i = index; i < grant.manager.length; i++){
            check += 1;
            if (check == 3) { this.calculateBalanceManager{value:0.1 ton, flag: 1}(repoName, nametask, grant, balance, commit, freebalance, hashtag, i, sender, num, value, bigtask, workers); return; }
            balance += grant.manager[i].grant;
            if (i != 0) { require(grant.manager[i].lock > grant.manager[i - 1].lock, ERR_WRONG_LOCK); }
            if (i == grant.manager.length) { require(grant.manager[i].grant != 0, ERR_ZERO_GRANT); }
        }
        require(_reserve >= balance + freebalance, ERR_LOW_TOKEN_RESERVE);
        if (bigtask.hasValue()) { require(value == balance, ERR_WRONG_LOCK); }
        if ((bigtask.hasValue() == false) || (num == 1)) { _reserve -= balance + freebalance; }
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repoName);
        if (num == 1) {
            TvmCell deployCode = GoshLib.buildBigTaskCode(_code[m_BigTaskCode], repo, version);
            TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: BigTask, varInit: {_nametask: nametask, _goshdao: address(this)}});
            optional(TvmCell) data = abi.encode(repoName, _systemcontract, _code[m_WalletCode], _code[m_DaoCode], _code[m_RepositoryCode], _code[m_TaskCode], grant, balance, freebalance, hashtag, commit);
            optional(TvmCell) data1;
            new BigTask{
                stateInit: s1, value: FEE_DEPLOY_BIGTASK, wid: 0, bounce: true, flag: 1
            }(data, data1);
            this.deployTaskTag{value:0.1 ton, flag: 1}(repo, address.makeAddrStd(0, tvm.hash(s1)), hashtag, sender);
        } else {
            TvmCell deployCode = GoshLib.buildTaskCode(_code[m_TaskCode], repo, version);
            TvmCell s1 = tvm.buildStateInit({code: deployCode, contr: Task, varInit: {_nametask: nametask, _goshdao: address(this)}});            
            optional(TvmCell) data = abi.encode(repoName, _systemcontract, _code[m_WalletCode], _code[m_DaoCode], _code[m_RepositoryCode], _code[m_BigTaskCode], grant, balance, balance, hashtag, bigtask, workers);
            if (bigtask.hasValue()) { data = abi.encode(repoName, _systemcontract, _code[m_WalletCode], _code[m_DaoCode], _code[m_RepositoryCode], _code[m_BigTaskCode], grant, uint128(0), balance, hashtag, bigtask, workers); }
            optional(TvmCell) data1;
            new Task{
                stateInit: s1, value: FEE_DEPLOY_TASK, wid: 0, bounce: true, flag: 1
            }(data, data1, data1);        
            this.deployTaskTag{value:0.1 ton, flag: 1}(repo, address.makeAddrStd(0, tvm.hash(s1)), hashtag, sender);
        }
        getMoney();
    }
    
    function deployTaskTag (address repo, address task, string[] tag, address sender) public pure senderIs(address(this)) accept {
        for (uint8 t = 0; t < tag.length; t++){ 
            GoshWallet(sender).deployTaskTag{value:0.2 ton, flag: 1}(repo, task, tag[t]);   	
        }
    }
    
    function destroyTaskTag (string nametask, address repo, string[] tag) public view senderIs(GoshLib.calculateTaskAddress(_code[m_TaskCode], address(this), repo, nametask))  accept {
        for (uint8 t = 0; t < tag.length; t++){ 
            RepoTagGosh(GoshLib.calculateTaskTagGoshAddress(_code[m_RepoTagCode], _versionController, address(this), repo, msg.sender, tag[t])).destroy { value: 0.1 ton, flag: 1}(_pubaddr, 0);
            RepoTagGosh(GoshLib.calculateTaskTagDaoAddress(_code[m_RepoTagCode], _versionController, address(this), repo, msg.sender, tag[t])).destroy { value: 0.1 ton, flag: 1}(_pubaddr, 0);
            RepoTagGosh(GoshLib.calculateTaskTagRepoAddress(_code[m_RepoTagCode], _versionController, address(this), repo, msg.sender, tag[t])).destroy { value: 0.1 ton, flag: 1}(_pubaddr, 0);
        }
    }

    function destroyTaskTagBig (string nametask, address repo, string[] tag) public view senderIs(GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], address(this), repo, nametask))  accept {
        for (uint8 t = 0; t < tag.length; t++){ 
            RepoTagGosh(GoshLib.calculateTaskTagGoshAddress(_code[m_RepoTagCode], _versionController, address(this), repo, msg.sender, tag[t])).destroy { value: 0.1 ton, flag: 1}(_pubaddr, 0);
            RepoTagGosh(GoshLib.calculateTaskTagDaoAddress(_code[m_RepoTagCode], _versionController, address(this), repo, msg.sender, tag[t])).destroy { value: 0.1 ton, flag: 1}(_pubaddr, 0);
            RepoTagGosh(GoshLib.calculateTaskTagRepoAddress(_code[m_RepoTagCode], _versionController, address(this), repo, msg.sender, tag[t])).destroy { value: 0.1 ton, flag: 1}(_pubaddr, 0);
        }
    }
    
    function checkOldTaskVersion (string nametask, string repo, string previous, address previousaddr) public view senderIs(GoshLib.calculateTaskAddress(_code[m_TaskCode], address(this), GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repo), nametask))  accept {        
        SystemContract(_systemcontract).checkOldTaskVersion2{value : 0.2 ton, flag: 1}(_nameDao, nametask, repo, previous, previousaddr, msg.sender);
    }

    function checkOldBigTaskVersion (string nametask, string repo, string previous, address previousaddr) public view senderIs(GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], address(this), GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repo), nametask))  accept {        
        SystemContract(_systemcontract).checkOldBigTaskVersion2{value : 0.2 ton, flag: 1}(_nameDao, nametask, repo, previous, previousaddr, msg.sender);
    }
    
    function checkOldTaskVersion5 (string nametask, string repo, address previous, address answer) public view senderIs(_systemcontract)  accept {       
        require(previous ==  GoshLib.calculateTaskAddress(_code[m_TaskCode], address(this), GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repo), nametask), ERR_WRONG_DATA);
        Task(previous).sendData{value:0.2 ton, flag: 1}(answer);
    }

    function checkOldBigTaskVersion5 (string nametask, string repo, address previous, address answer) public view senderIs(_systemcontract)  accept {       
        require(previous ==  GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], address(this), GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repo), nametask), ERR_WRONG_DATA);
        BigTask(previous).sendData{value:0.2 ton, flag: 1}(answer);
    }
    
    function returnTaskToken(string nametask, address repo, uint128 token) public senderIs(GoshLib.calculateTaskAddress(_code[m_TaskCode], address(this), repo, nametask)) accept {
        _reserve += token;
    }

    function returnTaskTokenBig(string nametask, address repo, uint128 token) public senderIs(GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], address(this), repo, nametask)) accept {
        _reserve += token;
    }
    
    function receiveTokentoReserve(
        address pubaddr,
        uint128 index,
        uint128 grant
    ) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index)) accept saveMsg {
        _reserve += grant;
        getMoney();
    }

    function receiveTokentoWrapper(
        address pubaddr,
        uint128 index,
        uint128 grant,
        uint256 pubkey
    ) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index)) accept saveMsg {
        RootData root = RootData(_nameDao, _nameDao, 0, 0);
        SystemContract(_systemcontract).sendTokenToRoot{value : 0.2 ton, flag: 1}(_nameDao, pubkey, grant, root);
        getMoney();
    }
    
    function deleteWallets(address[] pubmem, uint128 index) public senderIs(address(this)) {
        tvm.accept();
        if (index >= pubmem.length) { return; }
        deleteWalletIn(pubmem[index]);
        index += 1;
        this.deleteWallets{value: 0.1 ton, flag: 1}(pubmem, index);
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _systemcontract) {
            _flag = false;
            if (_volunteersnap.length > 0) { this.volunteersnap{value: 0.1 ton, flag: 1}(_volunteersnap, 0); delete _volunteersnap; }
            if (_volunteerdiff.length > 0) { this.volunteerdiff{value: 0.1 ton, flag: 1}(_volunteerdiff, 0); delete _volunteerdiff; }
            if (_volunteertree.length > 0) { this.volunteertree{value: 0.1 ton, flag: 1}(_volunteertree, 0); delete _volunteertree; }
            if (_volunteercommit.length > 0) { this.volunteercommit{value: 0.1 ton, flag: 1}(_volunteercommit, 0); delete _volunteercommit; }
            if ((saveaddr.hasValue() == true) && (saveind.hasValue() == true) && (savedao.hasValue() == true)) {
                this.deployWallets{value: 0.1 ton, flag: 1}(saveaddr.get(), savedao.get(), saveind.get());
                saveaddr = null;
                saveind = null;
                savedao = null;
            }
        }
    }

    //Getters    
    function getTaskCode(string repoName) external view returns(TvmCell) {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repoName);
        return GoshLib.buildTaskCode(_code[m_TaskCode], repo, version);
    }

    function getTaskAddr(string nametask, string repoName) external view returns(address) {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repoName);
        return GoshLib.calculateTaskAddress(_code[m_TaskCode], address(this), repo, nametask);
    }

    function getBigTaskCode(string repoName) external view returns(TvmCell) {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repoName);
        return GoshLib.buildBigTaskCode(_code[m_BigTaskCode], repo, version);
    }

    function getBigTaskAddr(string nametask, string repoName) external view returns(address) {
        address repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), repoName);
        return GoshLib.calculateBigTaskAddress(_code[m_BigTaskCode], address(this), repo, nametask);
    }
         
    function getDaoTagAddr(string daotag) external view returns(address) {
        return GoshLib.calculateDaoTagAddress(_code[m_DaoTagCode], _versionController, address(this), daotag);
    }
    
    function getAddrWallet(address pubaddr, uint128 index) external view returns(address) {
        return GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, address(this), pubaddr, index);
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
        return GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, address(this), name);
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
        (, uint256 keyaddr) = pubaddr.unpack();
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

    function getTagSupplyAddr(string tag) external view returns(address) {
        return GoshLib.calculateTagSupplyAddress(_code[m_TagSupplyCode], this, tvm.hash(tag));
    }
    
    function getDetails() external view returns(address pubaddr, bool allowMint, bool hide_voting_results, bool allow_discussion_on_proposals, bool abilityInvite, bool isRepoUpgraded, string nameDao,
    mapping(uint256 => MemberToken) wallets, uint128 reserve, uint128 allbalance, uint128 totalsupply, mapping(uint256 => string) hashtag, mapping(uint256 => address) my_wallets, mapping(uint256 => string) daoMembers, bool isCheck, mapping(uint8 => PaidMember) paidMembership, bool isUpgraded, mapping(uint256 => Multiples) daoTagData, mapping(uint256 => mapping(uint256 => bool)) daoMembersTag) {
    return (_pubaddr, _allowMint, _hide_voting_results, _allow_discussion_on_proposals, _abilityInvite, _isRepoUpgraded, _nameDao, _wallets, _reserve, _allbalance, _totalsupply, _hashtag, _my_wallets, _daoMembers, _isCheck, _paidMembership, _isUpgraded, _daoTagData, _daoMembersTag);
    }
    
    function getDaoIn() public view minValue(0.5 ton) {
        IObject(msg.sender).returnDao{value: 0.1 ton, flag: 1}(_pubaddr, _allowMint, _hide_voting_results, _allow_discussion_on_proposals, _abilityInvite, _isRepoUpgraded, _nameDao, _wallets, _reserve, _allbalance, _totalsupply, _hashtag, _my_wallets, _daoMembers, _isCheck, _paidMembership);
    }
}
