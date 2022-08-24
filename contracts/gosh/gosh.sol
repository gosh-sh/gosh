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
import "repository.sol";
import "goshdao.sol";
import "tree.sol";
import "content-signature.sol";

/* Root contract of gosh */
contract Gosh is Modifiers, Upgradable {
    string constant version = "0.10.0";

    address _creator;
    TvmCell m_RepositoryCode;
    TvmCell m_CommitCode;
    TvmCell m_WalletCode;
    TvmCell m_codeDao;
    TvmCell m_codeTag;
    TvmCell m_codeSnapshot;
    TvmCell m_codeTree;
    TvmCell m_codeDiff;
    TvmCell m_contentSignature;

    //SMV
    TvmCell m_TokenLockerCode;
    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode;

    //TIP3
    TvmCell m_TokenRootCode;
    TvmCell m_TokenWalletCode;

    address public _lastGoshDao;

    constructor(address creator) public onlyOwner {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        tvm.accept();
        _creator = creator;
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

    function _composeWalletStateInit(uint256 pubkey, uint256 rootpubkey, address dao, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(m_WalletCode, pubkey, version);
        TvmCell _contractflex = tvm.buildStateInit({
            code: deployCode,
            pubkey: pubkey,
            contr: GoshWallet,
            varInit: {_rootRepoPubkey: rootpubkey, _rootgosh : address(this), _goshdao: dao, _index: index}
        });
        return _contractflex;
    }

    function checkAccess(uint256 pubkey, uint256 rootpubkey, address sender, address dao, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubkey, rootpubkey, dao, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }

    function _composeDaoStateInit(string name) internal view returns(TvmCell) {
        TvmBuilder b;
        b.store(address(this));
        b.store(name);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        TvmCell deployCode = tvm.setCodeSalt(m_codeDao, b.toCell());
        return tvm.buildStateInit({
            code: deployCode,
            contr: GoshDao,
            varInit: {}
        });
    }

    function deployDao(string name, uint256 root_pubkey) public minValue(91 ton) {
        tvm.accept();
        TvmCell s1 = _composeDaoStateInit(name);
        _lastGoshDao = new GoshDao {stateInit: s1, value: FEE_DEPLOY_DAO - 5 ton, wid: 0, flag: 1}(
            address(this),
            _creator,
            root_pubkey,
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
            m_TokenWalletCode
        );
    }

    function _composeCommitStateInit(string _commit, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(m_CommitCode, repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
    }

    //Setters

    //SMV

    /* TvmCell m_TokenLockerCode;
    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode; */

    function setTokenRoot(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_TokenRootCode = code;
    }

    function setTokenWallet(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_TokenWalletCode = code;
    }

    function setTokenLocker(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_TokenLockerCode = code;
    }

    function setSMVPlatform(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_SMVPlatformCode = code;
    }

    function setSMVClient(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_SMVClientCode = code;
    }

    function setSMVProposal(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_SMVProposalCode = code;
    }

    //////////////////////////////////////////////////////////////////////

    function setDiff(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_codeDiff = code;
    }

    function setRepository(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_RepositoryCode = code;
    }

    function setCommit(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_CommitCode = code;
    }

    function setSnapshot(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_codeSnapshot = code;
    }

    function setcontentSignature(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_contentSignature = code;
    }

    function setWallet(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_WalletCode = code;
    }

    function setDao(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_codeDao = code;
    }

    function setTree(TvmCell code) public  onlyOwner {
        tvm.accept();
        m_codeTree = code;
    }

    function setTag(TvmCell code) public  onlyOwner {
        tvm.accept();
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

    function getDaoWalletCode(uint256 pubkey) external view returns(TvmCell) {
        return GoshLib.buildWalletCode(m_WalletCode, pubkey, version);
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

    // Upgradable
    function onCodeUpgrade() internal override {
        tvm.resetStorage();
    }
}
