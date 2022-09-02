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
import "goshdao.sol";
import "Upgradable.sol";
import "repository.sol";
import "commit.sol";
import "profile.sol";
import "content-signature.sol";
import "./libraries/GoshLib.sol";

/* Root contract of Gosh */
contract GoshRoot is Modifiers, Upgradable{
    string constant version = "0.11.0";
    
    bool _flag = true;
    TvmCell m_RepositoryCode;
    TvmCell m_CommitCode;
    TvmCell m_WalletCode;
    TvmCell m_codeDao;
    TvmCell m_codeTag;
    TvmCell m_codeSnapshot;
    TvmCell m_codeTree;
    TvmCell m_codeDiff;
    TvmCell m_contentSignature;
    TvmCell m_codeProfile;

    //SMV
    TvmCell m_TokenLockerCode;
    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode;

    //TIP3
    TvmCell m_TokenRootCode;
    TvmCell m_TokenWalletCode;

    address public _lastGoshDao;
    
    constructor() public onlyOwner {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        tvm.accept();
    }
    
    function deployProfile(uint256 pubkey) public view accept {
        tvm.accept();
        TvmCell s1 = tvm.buildStateInit({
            code: m_codeProfile,
            contr: Profile,
            varInit: {_pubkey: pubkey, _goshroot : address(this)}
        });
        new Profile {stateInit: s1, value: FEE_DEPLOY_PROFILE, wid: 0, flag: 1}();
    }

    
    function deployDao(uint256 pubkey, string name, address pubaddr, optional(address) previous) public accept {
        tvm.accept();
        require(_flag == false, ERR_GOSH_UPDATE);
        TvmCell s0 = tvm.buildStateInit({
            code: m_codeProfile,
            contr: Profile,
            varInit: {_pubkey: pubkey, _goshroot : address(this)}
        });
        require(address.makeAddrStd(0, tvm.hash(s0)) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(checkName(name), ERR_WRONG_NAME);
        TvmCell s1 = _composeDaoStateInit(name);
        _lastGoshDao = new GoshDao {stateInit: s1, value: FEE_DEPLOY_DAO, wid: 0, flag: 1}(
            pubaddr,
            name,
            m_CommitCode,
            m_RepositoryCode,
            m_WalletCode,
            m_codeTag,
            m_codeSnapshot,
            m_codeTree,
            m_codeDiff,
            m_contentSignature,
            m_TokenLockerCode,
            m_SMVPlatformCode,
            m_SMVClientCode,
            m_SMVProposalCode,
            m_TokenRootCode,
            m_TokenWalletCode,
            previous
        );
    }

    function sendMoney(address pubaddr, address goshdao, uint128 value, uint128 index) public view {
        TvmCell s1 = _composeWalletStateInit(pubaddr, goshdao, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(value);
    }
    
    function sendMoneyProfile(uint256 pubkey, uint128 value) public view {
        tvm.accept();
        TvmCell s1 = tvm.buildStateInit({
            code: m_codeProfile,
            contr: Profile,
            varInit: {_pubkey: pubkey, _goshroot : address(this)}
        });
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(value);
    }
    
    function sendMoneyDao(string name, uint128 value) public view {
        TvmCell s1 = _composeDaoStateInit(name);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        addr.transfer(value);
    }
    
    function _composeRepoStateInit(string name, address goshdao) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            m_RepositoryCode, address(this), goshdao, version
        );
        return tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: {_name: name}
        });
    }

    function _composeWalletStateInit(address pubaddr, address dao, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(m_WalletCode, pubaddr, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_goshroot : address(this), _goshdao: dao, _index: index}
        });
        return _contractflex;
    }

    function _composeDaoStateInit(string name) internal view returns(TvmCell) {
        TvmBuilder b;
        b.store(name);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        TvmCell deployCode = tvm.setCodeSalt(m_codeDao, b.toCell());
        return tvm.buildStateInit({
            code: deployCode,
            contr: GoshDao,
            varInit: { _goshroot : address(this) }
        });
    }

    function _composeCommitStateInit(string _commit, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_CommitCode, repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
    }
    
    // Upgradable
    function onCodeUpgrade() internal override {
        tvm.resetStorage();
    }
    
    //Setters
    
    function setFlag(bool flag) public onlyOwner accept {
        _flag = flag;
    }
    
    //SMV

    /* TvmCell m_TokenLockerCode;
    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode; */

    function setTokenRoot(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_TokenRootCode = code;
    }

    function setTokenWallet(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_TokenWalletCode = code;
    }

    function setTokenLocker(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_TokenLockerCode = code;
    }

    function setSMVPlatform(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_SMVPlatformCode = code;
    }

    function setSMVClient(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_SMVClientCode = code;
    }

    function setSMVProposal(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_SMVProposalCode = code;
    }

    //////////////////////////////////////////////////////////////////////

    function setProfile(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_codeProfile = code;
    }
    
    function setDiff(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_codeDiff = code;
    }

    function setRepository(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_RepositoryCode = code;
    }

    function setCommit(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_CommitCode = code;
    }

    function setSnapshot(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_codeSnapshot = code;
    }

    function setcontentSignature(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_contentSignature = code;
    }

    function setWallet(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_WalletCode = code;
    }

    function setDao(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_codeDao = code;
    }

    function setTree(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_codeTree = code;
    }

    function setTag(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        m_codeTag = code;
    }

    //Getters
    function getContentAdress(string repoName,
        string daoName,
        string commit,
        string label) external view returns(address) {
        TvmCell s1 = _composeRepoStateInit(repoName, address.makeAddrStd(0, tvm.hash(_composeDaoStateInit(daoName))));
        address repo = address.makeAddrStd(0, tvm.hash(s1));
        TvmCell deployCode = GoshLib.buildSignatureCode(m_contentSignature, repo, version);
        TvmCell s2 = tvm.buildStateInit({code: deployCode, contr: ContentSignature, varInit: {_commit : commit, _label : label}});
       return address.makeAddrStd(0, tvm.hash(s2));
    }

    function getAddrRepository(string name, string dao) external view returns(address) {
        TvmCell s1 = _composeRepoStateInit(name, address.makeAddrStd(0, tvm.hash(_composeDaoStateInit(dao))));
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getAddrDao(string name) external view returns(address) {
        TvmCell s1 = _composeDaoStateInit(name);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getRepoDaoCode(address dao) external view returns(TvmCell) {
        return GoshLib.buildRepositoryCode(
            m_RepositoryCode, address(this), dao, version
        );
    }

    function getDaoWalletCode(address pubaddr) external view returns(TvmCell) {
        return GoshLib.buildWalletCode(m_WalletCode, pubaddr, version);
    }

    function getSMVProposalCode() external view returns(TvmCell) {
        return m_SMVProposalCode;
    }

    function getSMVPlatformCode() external view returns(TvmCell) {
        return m_SMVPlatformCode;
    }

    function getSMVClientCode() external view returns(TvmCell) {
        return m_SMVClientCode;
    }

    function getRepositoryCode() external view returns(TvmCell) {
        return m_RepositoryCode;
    }

    function getCommitCode() external view returns(TvmCell) {
        return m_CommitCode;
    }

    function getSnapshotCode() external view returns(TvmCell) {
        return m_codeSnapshot;
    }

    function getTagCode() external view returns(TvmCell) {
        return m_codeTag;
    }

    function getHash(bytes state) external pure returns(uint256) {
        return tvm.hash(state);
    }

    function getVersion() external pure returns(string) {
        return version;
    }
}
