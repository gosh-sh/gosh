// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ton-solidity >=0.61.2;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./modifiers/modifiers.sol";
import "goshwallet.sol";
import "daocreator.sol";
import "tree.sol";
import "diff.sol";
import "commit.sol";
import "./libraries/GoshLib.sol";
import "../smv/TokenRootOwner.sol";

/* Root contract of gosh */
contract GoshDao is Modifiers, TokenRootOwner {
    string constant version = "0.5.3";
    
    uint128 _limit_wallets = 10;
    uint128 _limit_time = 100;
    uint128 _limit_messages = 10;
    
    address _creator;
    TvmCell m_WalletCode;   
    TvmCell m_RepositoryCode;
    TvmCell m_CommitCode;
    TvmCell m_TagCode;
    TvmCell m_codeSnapshot;
    TvmCell m_codeTree;
    TvmCell m_codeDiff;
    TvmCell m_contentSignature;
    address _rootgosh;
    string _nameDao;
    mapping(uint256 => address  ) _wallets;
    
    //added for SMV
    TvmCell m_TokenLockerCode;
    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode;

    TvmCell m_TokenRootCode;
    TvmCell m_TokenWalletCode;
    address public _rootTokenRoot;
    address public _lastAccountAddress;
    
    bool _flag = false;

    constructor(
        address rootgosh, 
        address creator,
        uint256 pubkey, 
        string name, 
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
        TvmCell TokenWalletCode
        ////////////////////////
        /* address initialSupplyTo,
        uint128 initialSupply,
        uint128 deployWalletValue,
        bool mintDisabled,
        bool burnByRootDisabled,
        bool burnPaused,
        address remainingGasTo,
        uint256 randomNonce */ ) public onlyOwner TokenRootOwner (TokenRootCode, TokenWalletCode) {
        tvm.accept();
        _creator = creator;
        _rootgosh = rootgosh;
        _rootpubkey = pubkey;
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

        m_TokenRootCode = TokenRootCode;
        m_TokenWalletCode = TokenWalletCode;
        m_contentSignature = contentSignature;
        getMoney();
        ///////////////////////////////////////
        _rootTokenRoot = _deployRoot (address.makeAddrStd(0,0), 0, 0, false, false, true, address.makeAddrStd(0,0), now);
    }
    
    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 30000 ton) { return; }
        tvm.accept();
        _flag = true;
        DaoCreator(_creator).sendMoneyDao{value : 0.2 ton}(_nameDao, 30000 ton);
    }
    
    function sendMoneyDiff(address repo, string commit, uint128 index1, uint128 index2) public {
        TvmCell s0 = _composeDiffStateInit(commit, repo, index1, index2);
        address addr = address.makeAddrStd(0, tvm.hash(s0));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(50 ton);
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
        addr.transfer(100 ton);
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
        addr.transfer(80 ton);
        getMoney();
    }
    
    function _composeTreeStateInit(string shaTree, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildTreeCode(m_codeTree, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Tree, varInit: {_shaTree: shaTree, _repo: repo}});
        return stateInit;
    }

    //Wallet part
    function deployWallet(uint256 pubkey) public onlyOwnerPubkey(_rootpubkey) {
        tvm.accept();
        TvmCell s1 = _composeWalletStateInit(pubkey, 0);
        _lastAccountAddress = address.makeAddrStd(0, tvm.hash(s1));
        _wallets[pubkey] = _lastAccountAddress;
        new GoshWallet {
            stateInit: s1, value: 60 ton, wid: 0
        }(_creator, m_CommitCode, 
            m_RepositoryCode,
            m_WalletCode,
            m_TagCode, m_codeSnapshot, m_codeTree, m_codeDiff, m_contentSignature, _limit_wallets, _limit_time, _limit_messages, 
            m_TokenLockerCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, _rootTokenRoot);
        getMoney();
    }
    
    function deleteWallet(uint256 pubkey) public onlyOwnerPubkey(_rootpubkey) {
        tvm.accept();
        require(_wallets.exists(pubkey) == true, ERR_WALLET_NOT_EXIST);
        GoshWallet(_wallets[pubkey]).destroy{value : 0.2 ton}();
        delete _wallets[pubkey];
        getMoney();
    }
    
    function _composeWalletStateInit(uint256 pubkey, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(m_WalletCode, pubkey, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            pubkey: pubkey,
            contr: GoshWallet,
            varInit: {_rootRepoPubkey: _rootpubkey, _rootgosh : _rootgosh, _goshdao: address(this), _index: index}
        });
        return _contractflex;
    }
    
    function getConfigInfo(uint256 pubkey, uint128 index) public view senderIs(getAddrWalletIn(pubkey, index)) {
        tvm.accept();
        require(_wallets.exists(pubkey) == true, ERR_WALLET_NOT_EXIST);
        GoshWallet(msg.sender).setConfig{value : 0.2 ton}(_limit_wallets, _limit_time, _limit_messages);
    }
    
    //Setters
    function setConfig(uint128 limit_wallets /*, uint128 limit_time, uint128 limit_messages */) public onlyOwnerPubkey(_rootpubkey) {
        tvm.accept();    
        _limit_wallets = limit_wallets;
//        _limit_time = limit_time;
//        _limit_messages = limit_messages;
        getMoney();
    }
    
    function getAddrWalletIn(uint256 pubkey, uint128 index) private view returns(address) {
        TvmCell s1 = _composeWalletStateInit(pubkey, index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _creator) {
            _flag = false;
        }
    }

    //Getters    
    function getAddrWallet(uint256 pubkey, uint128 index) external view returns(address) {
        TvmCell s1 = _composeWalletStateInit(pubkey, index);
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
    
    function getWallets() external view returns(address[]) {
        address[] AllWallets;
        for ((uint256 _key, address value) : _wallets) {
            _key;
            AllWallets.push(value);
        }
        return AllWallets;
    }

    function getNameDao() external view returns(string) {
        return _nameDao;
    }
    
    function getConfig() external view returns(uint128/*, uint128, uint128*/) {
        return (_limit_wallets/*, _limit_time, _limit_messages*/);
    }
    
    function getRootPubkey() external view returns(uint256) {
        return _rootpubkey;
    }

    function getVersion() external pure returns(string) {
        return version;
    }
}
