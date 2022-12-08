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
import "./libraries/GoshLib.sol";
import "../smv/TokenRootOwner.sol";


/* Root contract of gosh */
contract GoshDao is Modifiers, TokenRootOwner {
    string constant version = "1.0.0";

    address[] _volunteersnap;
    address[] _volunteerdiff;
    address static _systemcontract;
    address _pubaddr;
    address _profiledao;
    string _nameDao;
    optional(address) _previous;
    mapping(uint256 => address  ) _wallets;
    mapping(uint8 => TvmCell) _code;
    
    uint128 _tokenforperson = 100;
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
    
    uint128 timeMoney = 0;
    optional(address[]) saveaddr;
    optional(uint128) saveind;
    
    constructor(
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
        else { this.deployWallets{value: 0.1 ton, flag: 1}(pubmem, 0); }
        ProfileDao(_profiledao).deployedDao{value: 0.1 ton, flag: 1}(_nameDao, version);
    }
    
    function getPreviousInfo(string name) public internalMsg view {
        require(_nameDao == name, ERR_WRONG_DAO);
        tvm.accept();
        GoshDao(msg.sender).getPreviousInfo1{value: 0.1 ton, flag: 1}(_wallets);
    }
    
    function getPreviousInfo1(mapping(uint256 => address) wallets) public internalMsg view {
        require(_previous.hasValue() == true, ERR_FIRST_DAO);
        require(_previous.get() == msg.sender, ERR_WRONG_DAO);
        tvm.accept();
        uint256 zero;
        this.returnWallets{value: 0.1 ton}(zero, wallets);
    }
    
    function returnWallets(uint256 key, mapping(uint256 => address) wallets) public internalMsg senderIs(address(this)) accept {
        optional(uint256, address) res = wallets.next(key);
        if (res.hasValue()) {
            address pub;
            (key, pub) = res.get();
            deployWalletIn(address.makeAddrStd(0, key));
            this.returnWallets{value: 0.1 ton, flag: 1}(key, wallets);
        }
        getMoney();
    }
    
    function getMoney() private {
        if (now - timeMoney > 3600) { _flag = false; timeMoney = now; }
        if (_flag == true) { return; }
        if (address(this).balance > 50000 ton) { return; }
        tvm.accept();
        _flag = true;
        SystemContract(_systemcontract).sendMoneyDao{value : 0.2 ton}(_nameDao, 50000 ton);
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
    
    function volunteersnap(address[] snap, uint128 index) public senderIs(address(this)) accept {
        snap[index].transfer(10 ton);
        this.volunteersnap(snap, index + 1);
        getMoney();       
    }
    
    function volunteerdiff(address[] diff, uint128 index) public senderIs(address(this)) accept {
        diff[index].transfer(10 ton);
        this.volunteerdiff(diff, index + 1);
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
    
    function upgradeTokens(uint128 newvalue, address pub, uint128 index) public senderIs(getAddrWalletIn(pub, index))  accept {
        getMoney();
        _tokenforperson = newvalue;
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
            address pubaddr;
            (key, pubaddr) = res.get();
            GoshWallet(pubaddr).setTombstoneWallet{value: 0.1 ton, flag: 1}(description);
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


    function deployWallets(address[] pubmem, uint128 index) public senderIs(address(this)) {
        tvm.accept();
        getMoney();
        if (address(this).balance < 100 ton) { saveaddr = pubmem; saveind = index; return; }
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
        }(  _pubaddr, pubaddr, _nameDao, _code[m_CommitCode], 
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode], _code[m_SnapshotCode], _code[m_TreeCode], _code[m_DiffCode], _code[m_contentSignature], _limit_wallets, null,
            m_TokenLockerCode, m_tokenWalletCode, m_SMVPlatformCode,
            m_SMVClientCode, m_SMVProposalCode, _tokenforperson, _rootTokenRoot);
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
    
    //Fallback/Receive
    receive() external {
        if (msg.sender == _systemcontract) {
            _flag = false;
            if (_volunteersnap.length > 0) { this.volunteersnap{value: 0.1 ton, flag: 1}(_volunteersnap, 0); delete _volunteersnap; }
            if (_volunteerdiff.length > 0) { this.volunteerdiff{value: 0.1 ton, flag: 1}(_volunteerdiff, 0); delete _volunteerdiff; }
            if ((saveaddr.hasValue() == true) && (saveind.hasValue() == true)) {
                this.deployWallets{value: 0.1 ton, flag: 1}(saveaddr.get(), saveind.get());
                saveaddr = null;
                saveind = null;
            }
        }
    }

    //Getters    
    function getSnapshotAddr(string branch, address repo, string name) private view returns(address) {
        TvmCell deployCode = GoshLib.buildSnapshotCode(_code[m_SnapshotCode], repo, branch, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Snapshot, varInit: {NameOfFile: branch + "/" + name}});
        return address.makeAddrStd(0, tvm.hash(stateInit));
    }
    
    function getAddrWallet(address pubaddr, uint128 index) external view returns(address) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function getDaoTokenConfig() external view returns(uint128) {
        return _tokenforperson;
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
    
    function getConfig() external view returns(uint128, uint128) {
        return (_limit_wallets, _tokenforperson);
    }

    function getVersion() external pure returns(string, string) {
        return ("goshdao", version);
    }
        
    function getOwner() external view returns(address) {
        return _pubaddr;
    }
    
    function getPreviousDaoAddr() external view returns(optional(address)) {
        return _previous;
    }
}
