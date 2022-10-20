// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity =0.64.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./modifiers/modifiers.sol";
import "goshwallet.sol";
import "gosh.sol";
import "tree.sol";
import "diff.sol";
import "commit.sol";
import "profiledao.sol";
import "./libraries/GoshLib.sol";
import "../smv/TokenRootOwner.sol";

/* Root contract of gosh */
contract GoshDao is Modifiers, TokenRootOwner {
    string constant version = "0.11.1";
    
    uint128 _limit_wallets = 10;
    uint128 _limit_time = 100;
    uint128 _limit_messages = 10;
    
    TvmCell m_WalletCode;   
    TvmCell m_RepositoryCode;
    TvmCell m_CommitCode;
    TvmCell m_TagCode;
    TvmCell m_codeSnapshot;
    TvmCell m_codeTree;
    TvmCell m_codeDiff;
    TvmCell m_contentSignature;
    address static _goshroot;
    address _pubaddr;
    address _profiledao;
    string _nameDao;
    address _previous;
    mapping(uint256 => address  ) _wallets;
    
    //added for SMV
    TvmCell m_TokenLockerCode;
    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode;

/*     TvmCell m_TokenRootCode;
    TvmCell m_TokenWalletCode;
 */    address public _rootTokenRoot;
    address public _lastAccountAddress;
    
    bool _flag = false;
    bool _tombstone = false;

    constructor(
        address pubaddr, 
        address profiledao,
        string name, 
        address[] pubmem,
        TvmCell CommitCode,
        TvmCell RepositoryCode,
        TvmCell WalletCode,
        TvmCell TagCode,
        TvmCell codeSnapshot,
        TvmCell codeTree,
        TvmCell codeDiff,
        TvmCell contentSignature,
        /////////////////////
        TvmCell TokenLockerCode,
        TvmCell SMVPlatformCode,
        TvmCell SMVClientCode,
        TvmCell SMVProposalCode,
        TvmCell TokenRootCode,
        TvmCell TokenWalletCode,
        ////////////////////////
        /* address initialSupplyTo,
        uint128 initialSupply,
        uint128 deployWalletValue,
        bool mintDisabled,
        bool burnByRootDisabled,
        bool burnPaused,
        address remainingGasTo,
        uint256 randomNonce */ 
        optional(address) previous) public TokenRootOwner (TokenRootCode, TokenWalletCode) senderIs(_goshroot) {
        tvm.accept();
        _profiledao = profiledao;
        _pubaddr = pubaddr;
        _nameDao = name;
        m_WalletCode = WalletCode;
        m_RepositoryCode = RepositoryCode;
        m_CommitCode = CommitCode;
        m_TagCode = TagCode;
        m_codeSnapshot = codeSnapshot;
        m_codeTree = codeTree;
        m_codeDiff = codeDiff;
        /////
        m_TokenLockerCode = TokenLockerCode;
        m_SMVPlatformCode = SMVPlatformCode;

        TvmBuilder b;
        b.store(address(this));
        m_SMVProposalCode = tvm.setCodeSalt(SMVProposalCode, b.toCell());
        m_SMVClientCode = tvm.setCodeSalt(SMVClientCode, b.toCell());

/*     m_TokenRootCode = TokenRootCode;
       m_TokenWalletCode = TokenWalletCode;
 */         m_contentSignature = contentSignature;
        getMoney();
        ///////////////////////////////////////
        _rootTokenRoot = _deployRoot (address.makeAddrStd(0,0), 0, 0, false, false, true, address.makeAddrStd(0,0), now);
        if (previous.hasValue()) { 
            _previous = previous.get(); 
            GoshDao(_previous).getPreviousInfo{value: 0.1 ton, flag: 1}(_nameDao); 
        }
        else { this.deployWallets{value: 0.1 ton, flag: 1}(pubmem, 0); }
        ProfileDao(_profiledao).deployedDao{value: 0.1 ton, flag: 1}(_nameDao, version);
    }
    
    function getPreviousInfo(string name) public view {
        require(_nameDao == name, ERR_WRONG_DAO);
        tvm.accept();
        GoshDao(msg.sender).getPreviousInfo1{value: 0.1 ton, flag: 1}(_wallets);
    }
    
    function getPreviousInfo1(mapping(uint256 => address) wallets) public view {
        require(_previous == msg.sender, ERR_WRONG_DAO);
        tvm.accept();
        uint256 zero;
        this.returnWallets{value: 0.1 ton}(zero, wallets);
    }
    
    function returnWallets(uint256 key, mapping(uint256 => address) wallets) public senderIs(address(this)) accept {
        optional(uint256, address) res = wallets.next(key);
        if (res.hasValue()) {
            address pub;
            (key, pub) = res.get();
            deployWalletIn(address.makeAddrStd(0, key));
            this.returnWallets{value: 0.1 ton, flag: 1}(key, wallets);
        }
        else { _wallets = wallets; }
        getMoney();
    }
    
    function _buildRepositoryAddr(string name) private view returns (address) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            m_RepositoryCode, _goshroot, address(this), version
        );
        return address(tvm.hash(tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: { _name: name }
        })));
    }
    
    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 30000 ton) { return; }
        tvm.accept();
        _flag = true;
        GoshRoot(_goshroot).sendMoneyDao{value : 0.2 ton}(_nameDao, 50000 ton);
    }
    
    function sendMoneyDiff(address repo, string commit, uint128 index1, uint128 index2) public {
        TvmCell s0 = _composeDiffStateInit(commit, repo, index1, index2);
        address addr = address.makeAddrStd(0, tvm.hash(s0));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(100 ton);
        getMoney();
    }
    
    function _composeDiffStateInit(string commit, address repo, uint128 index1, uint128 index2) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_codeDiff, repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: DiffC, varInit: {_nameCommit: commit, _index1: index1, _index2: index2}});
        return stateInit;
    }
    
    function sendMoneyCommit(address repo, string commit) public {
        TvmCell s0 = _composeCommitStateInit(commit, repo);
        address addr = address.makeAddrStd(0, tvm.hash(s0));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(1400 ton);
        getMoney();
    }
    
    function _composeCommitStateInit(string _commit, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_CommitCode, repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
    }
    
    function sendMoneyTree(address repo, string shaTree) public {
        TvmCell s1 = _composeTreeStateInit(shaTree, repo);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(100 ton);
        getMoney();
    }
    
    function _composeTreeStateInit(string shaTree, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildTreeCode(m_codeTree, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaTree: shaTree, _repo: repo}});
        return stateInit;
    }

    //Wallet part
    function setTombstone(address pub, uint128 index, string description) public senderIs(getAddrWalletIn(pub, index))  accept {
        require(_tombstone == false, ERR_TOMBSTONE);
        _tombstone = true;
        getMoney();
        uint256 zero;
        this.askForTombstoneIn{value : 0.1 ton, flag: 1}(zero, description);
    }
    
    function askForTombstoneIn(uint256 key, string description) public senderIs(address(this))  accept {
        optional(uint256, address) res = _wallets.next(key);
        if (res.hasValue()) {
            address pub;
            (key, pub) = res.get();
            GoshWallet(getAddrWalletIn(pub, 0)).setTombstoneWallet{value: 0.1 ton, flag: 1}(description);
            this.askForTombstoneIn{value: 0.1 ton, flag: 1}(key, description);
        }
        getMoney();
    }
        
    function deployWallet(address[] pubaddrdeploy, address pubaddr, uint128 index) public senderIs(getAddrWalletIn(pubaddr, index)) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        this.deployWallets{value: 0.1 ton, flag: 1}(pubaddrdeploy, 0);
        getMoney();
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


    function deployWallets(address[] pubmem, uint128 index) public senderIs(address(this)) {
        tvm.accept();
        if (index >= pubmem.length) { return; }
        deployWalletIn(pubmem[index]);
        index += 1;
        this.deployWallets{value: 0.1 ton, flag: 1}(pubmem, index);
    }
    
    function deployWalletIn(address pubaddr) private {
        tvm.accept();
        TvmCell s1 = _composeWalletStateInit(pubaddr, 0);
        _lastAccountAddress = address.makeAddrStd(0, tvm.hash(s1));
        (int8 _, uint256 keyaddr) = pubaddr.unpack();
        _;
        _wallets[keyaddr] = _lastAccountAddress;
        new GoshWallet {
            stateInit: s1, value: FEE_DEPLOY_WALLET, wid: 0
        }(  _pubaddr, pubaddr, _nameDao, m_CommitCode, 
            m_RepositoryCode,
            m_WalletCode,
            m_TagCode, m_codeSnapshot, m_codeTree, m_codeDiff, m_contentSignature, _limit_wallets, _limit_time, _limit_messages, null,
            m_TokenLockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, _rootTokenRoot);
        getMoney();
    }
    
    function deleteWalletIn(address pubaddrdeploy) private {
        (int8 _, uint256 keyaddr) = pubaddrdeploy.unpack();
        _;
        require(_wallets.exists(keyaddr) == true, ERR_WALLET_NOT_EXIST); 
        GoshWallet(_wallets[keyaddr]).destroy{value : 0.2 ton}();
        delete _wallets[keyaddr];
        getMoney();
    }
    
    function deleteWallet(address[] pubmem, address pubaddr, uint128 index) public senderIs(getAddrWalletIn(pubaddr, index)) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();       
        this.deleteWallets{value: 0.1 ton, flag: 1}(pubmem, index);
        getMoney();
    }
    
    function deleteWallets(address[] pubmem, uint128 index) public senderIs(address(this)) {
        tvm.accept();
        if (index >= pubmem.length) { return; }
        deleteWalletIn(pubmem[index]);
        index += 1;
        this.deployWallets{value: 0.1 ton, flag: 1}(pubmem, index);
    }
    
    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(m_WalletCode, pubaddr, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_goshroot : _goshroot, _goshdao: address(this), _index: index}
        });
        return _contractflex;
    }
    
    function getConfigInfo(address pubaddr, uint128 index) public view senderIs(getAddrWalletIn(pubaddr, index)) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();
        (int8 _, uint256 keyaddr) = pubaddr.unpack();
        _;
        require(_wallets.exists(keyaddr) == true, ERR_WALLET_NOT_EXIST);
        GoshWallet(msg.sender).setConfig{value : 0.2 ton}(_limit_wallets, _limit_time, _limit_messages);
    }
    
    function _composeRepoStateInit(string name) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            m_RepositoryCode, _goshroot, address(this), version
        );
        return tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: {_name: name}
        });
    }
    
    //Setters
    function setConfig(uint128 limit_wallets /*, uint128 limit_time, uint128 limit_messages */) public onlyOwnerPubkey(_rootpubkey) {
        require(_tombstone == false, ERR_TOMBSTONE);
        tvm.accept();    
        _limit_wallets = limit_wallets;
//        _limit_time = limit_time;
//        _limit_messages = limit_messages;
        getMoney();
    }
    
    function getAddrWalletIn(address pubaddr, uint128 index) private view returns(address) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _goshroot) {
            _flag = false;
        }
    }

    //Getters    
    function getAddrWallet(address pubaddr, uint128 index) external view returns(address) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getWalletCode() external view returns(TvmCell) {
        return m_WalletCode;
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
        for ((uint256 _key, address value) : _wallets) {
            _key;
            AllWallets.push(value);
        }
        return AllWallets;
    }
    
    function getWalletsFull() external view returns(mapping(uint256 => address)) {
        return _wallets;
    }
    
    function isMember(address pubaddr) external view returns(bool) {
        (int8 _, uint256 keyaddr) = pubaddr.unpack();
        _;
        return _wallets.exists(keyaddr);
    }

    function getNameDao() external view returns(string) {
        return _nameDao;
    }
    
    function getConfig() external view returns(uint128/*, uint128, uint128*/) {
        return (_limit_wallets/*, _limit_time, _limit_messages*/);
    }

    function getVersion() external pure returns(string) {
        return version;
    }
        
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
    
    function getPreviousDaoAddr() external view returns(address) {
        return _previous;
    }
}
