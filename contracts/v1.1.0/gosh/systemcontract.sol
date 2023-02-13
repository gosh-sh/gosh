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
import "goshdao.sol";
import "repository.sol";
import "commit.sol";
import "profile.sol";
import "tag.sol";
import "versioncontroller.sol";
import "content-signature.sol";
import "./libraries/GoshLib.sol";

/* System contract of Gosh version*/
contract SystemContract is Modifiers {
    string constant version = "1.1.0";
    
    address _versionController;
    bool _flag = true;
    mapping(uint8 => TvmCell) _code;

    //Limits
    uint128 _limit_wallets = 64;

    //SMV
    TvmCell m_TokenLockerCode;
    TvmCell m_SMVPlatformCode;
    TvmCell m_SMVClientCode;
    TvmCell m_SMVProposalCode;

    //TIP3
    TvmCell m_TokenRootCode;
    TvmCell m_TokenWalletCode;

    address public _lastGoshDao;
    
    constructor(mapping(uint8 => TvmCell) code) public {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        tvm.accept();
        _code = code;
        _versionController = msg.sender;
    }
    
    function upgradeTag1(string namedao, string namerepo, string nametag, string namecommit, address commit, string content, string newversion) public view senderIs(getTagAddr(namedao, namerepo, nametag)) accept {
        VersionController(_versionController).upgradeTag2{value : 0.3 ton, flag: 1}(namedao, namerepo, nametag, namecommit, commit, content, newversion, version);
    }
    
    function upgradeTag3(string namedao, string namerepo, string nametag, string namecommit, address commit,  string content) public view senderIs(_versionController) accept {
        TvmCell s1 = _composeDaoStateInit(namedao);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        GoshDao(addr).upgradeTag4{value : 0.11 ton, flag: 1}(namerepo, nametag, namecommit, commit, content);
    }  
    
    function upgradeDao1(string namedao, string newversion) public view {
        TvmCell s1 = _composeDaoStateInit(namedao);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        VersionController(_versionController).upgradeDao2{value : 0.3 ton, flag: 1}(namedao, newversion, msg.sender, version);
    }
    
    function checkUpdateRepo1(string name, string namedao, AddrVersion prev, address answer) public view {
        TvmCell s1 = _composeDaoStateInit(namedao);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(_buildRepositoryAddr(name, addr) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        VersionController(_versionController).checkUpdateRepo2{value : 0.15 ton, flag: 1}(name, namedao, version, prev, answer);
    }
    
    function checkUpdateRepo3(string name, string namedao, AddrVersion prev, address answer) public view senderIs(_versionController) accept {
        TvmCell s1 = _composeDaoStateInit(namedao);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        address repo = _buildRepositoryAddr(name, addr);
        Repository(repo).checkUpdateRepo4{value : 0.15 ton, flag: 1}(prev, answer);
    }   
    
    function _buildRepositoryAddr(string name, address dao) private view returns (address) {
        return address(tvm.hash(_composeRepoStateInit(name, dao)));
    }
    
    function deployProfile(string name, uint256 pubkey) public accept saveMsg {
        require(checkName(name), ERR_WRONG_NAME);
        TvmCell s1 = tvm.buildStateInit({
            code: _code[m_ProfileCode],
            contr: Profile,
            varInit: {_name: name, _versioncontroller: _versionController}
        });
        new Profile {stateInit: s1, value: FEE_DEPLOY_PROFILE, wid: 0, flag: 1}(_code[m_ProfileDaoCode], _code[m_ProfileCode], _code[m_ProfileIndexCode], pubkey);
    }

    
    function deployDao(string name, address pubaddr, optional(address) previous, address[] pubmem) public accept saveMsg {
        require(_flag == false, ERR_GOSH_UPDATE);
        TvmCell s0 = tvm.buildStateInit({
            code: _code[m_ProfileDaoCode],
            contr: ProfileDao,
            varInit: {_name : name, _versioncontroller: _versionController}
        });
        require(address.makeAddrStd(0, tvm.hash(s0)) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(checkNameDao(name), ERR_WRONG_NAME);
        TvmCell s1 = _composeDaoStateInit(name);
        _lastGoshDao = new GoshDao {stateInit: s1, value: FEE_DEPLOY_DAO, wid: 0, flag: 1}(
            _versionController,
            pubaddr,
            msg.sender,
            name,
            pubmem,
            _limit_wallets,
            _code[m_CommitCode],
            _code[m_RepositoryCode],
            _code[m_WalletCode],
            _code[m_TagCode],
            _code[m_SnapshotCode],
            _code[m_TreeCode],
            _code[m_DiffCode],
            _code[m_contentSignature],
            _code[m_TaskCode],
            _code[m_DaoTagCode],
            _code[m_RepoTagCode],
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
    
    function sendMoneyProfile(string name, uint128 value) public view {
        tvm.accept();
        TvmCell s1 = tvm.buildStateInit({
            code: _code[m_ProfileCode],
            contr: Profile,
            varInit: {_name : name, _versioncontroller: _versionController}
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
            _code[m_RepositoryCode], address(this), goshdao, version
        );
        return tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: {_name: name}
        });
    }

    function _composeWalletStateInit(address pubaddr, address dao, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_systemcontract : address(this), _goshdao: dao, _index: index}
        });
        return _contract;
    }

    function _composeDaoStateInit(string name) internal view returns(TvmCell) {
        TvmBuilder b;
        b.store(name);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        TvmCell deployCode = tvm.setCodeSalt(_code[m_DaoCode], b.toCell());
        return tvm.buildStateInit({
            code: deployCode,
            contr: GoshDao,
            varInit: { _systemcontract : address(this) }
        });
    }

    function _composeCommitStateInit(string _commit, address repo) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildCommitCode(_code[m_CommitCode], repo, version);
        TvmCell stateInit = tvm.buildStateInit({code: deployCode, contr: Commit, varInit: {_nameCommit: _commit}});
        return stateInit;
    }
    
    //Setters
    
    function setFlag(bool flag) public onlyOwner accept saveMsg {
        _flag = flag;
    }
   
    function setLimitWallets(uint128 limit_wallets) public onlyOwner accept saveMsg {
        _limit_wallets = limit_wallets;
    }      
    
    //SMV

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
    
    function setDaoTag(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_DaoTagCode] = code;
    }
    
    function setHelpTag(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_RepoTagCode] = code;
    }
    
    function setDiff(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_DiffCode] = code;
    }

    function setRepository(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_RepositoryCode] = code;
    }

    function setCommit(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_CommitCode] = code;
    }
    
    function setTask(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_TaskCode] = code;
    }   
    
    function setSnapshot(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_SnapshotCode] = code;
    }

    function setcontentSignature(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_contentSignature] = code;
    }

    function setWallet(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_WalletCode] = code;
    }

    function setDao(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_DaoCode] = code;
    }

    function setTree(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_TreeCode] = code;
    }

    function setTag(TvmCell code) public  onlyOwner accept {
        require(_flag == true, ERR_GOSH_UPDATE);
        _code[m_TagCode] = code;
    }

    //Getters
    function getTagAddr(
        string daoName,
        string repoName,
        string nametag
    ) private view returns(address) {
        TvmCell s1 = _composeDaoStateInit(daoName);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        address repo = _buildRepositoryAddr(repoName, addr);
        TvmCell deployCode = GoshLib.buildTagCode(_code[m_TagCode], repo, version);
        TvmCell s2 = tvm.buildStateInit({code: deployCode, contr: Tag, varInit: {_nametag: nametag}});
        return address.makeAddrStd(0, tvm.hash(s2));
    }
    
    function getContentAddress(string repoName,
        string daoName,
        string commit,
        string label) external view returns(address) {
        TvmCell s1 = _composeRepoStateInit(repoName, address.makeAddrStd(0, tvm.hash(_composeDaoStateInit(daoName))));
        address repo = address.makeAddrStd(0, tvm.hash(s1));
        TvmCell deployCode = GoshLib.buildSignatureCode(_code[m_contentSignature], repo, version);
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
    
    function getAddrWallet(address pubaddr, address dao, uint128 index) external view returns(address) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, dao, index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getRepoDaoCode(address dao) external view returns(TvmCell) {
        return GoshLib.buildRepositoryCode(
            _code[m_RepositoryCode], address(this), dao, version
        );
    }    
    
    function getProfileAddr(string name) external view returns(address) {
        TvmCell s1 = tvm.buildStateInit({
            code: _code[m_ProfileCode],
            contr: Profile,
            varInit: {_name : name, _versioncontroller: _versionController}
        });
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function getProfileDaoAddr(string name) external view returns(address){
        TvmCell s0 = tvm.buildStateInit({
            code: _code[m_ProfileDaoCode],
            contr: ProfileDao,
            varInit: {_name : name, _versioncontroller: _versionController}
        });
        return address(tvm.hash(s0));
    }   
    
    function getDaoTagCode(string hashtag) external view returns(TvmCell) {
        return GoshLib.buildDaoTagCode(_code[m_DaoTagCode], hashtag, _versionController);
    }
    
    function getRepoTagGoshCode(string repotag) external view returns(TvmCell) {
        return GoshLib.buildRepoTagGoshCode(_code[m_RepoTagCode], repotag, _versionController);
    }
    
    function getRepoTagDaoCode(address dao, string repotag) external view returns(TvmCell) {
        return GoshLib.buildRepoTagDaoCode(_code[m_RepoTagCode], repotag, dao, _versionController);
    }
    
    function getTaskTagGoshCode(string tag) external view returns(TvmCell){        
        return GoshLib.buildTaskTagGoshCode(_code[m_RepoTagCode], tag, _versionController);
    }
    
    function getTaskTagDaoCode(address dao, string tag) external view returns(TvmCell){        
        return GoshLib.buildTaskTagDaoCode(_code[m_RepoTagCode], tag, dao, _versionController);
    }
    
    function getTaskTagRepoCode(address dao, address repo, string tag) external view returns(TvmCell){        
        return GoshLib.buildTaskTagRepoCode(_code[m_RepoTagCode], tag, dao, repo, _versionController);
    }
    
    function getDaoWalletCode(address pubaddr) external view returns(TvmCell) {
        return GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
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
        return _code[m_RepositoryCode];
    }

    function getCommitCode() external view returns(TvmCell) {
        return _code[m_CommitCode];
    }

    function getSnapshotCode() external view returns(TvmCell) {
        return _code[m_SnapshotCode];
    }

    function getTagCode() external view returns(TvmCell) {
        return _code[m_TagCode];
    }

    function getHash(bytes state) external pure returns(uint256) {
        return tvm.hash(state);
    }
    
    function getCreator() external view returns(address) {
        return _versionController;
    }

    function getVersion() external pure returns(string, string) {
        return ("systemcontract", version);
    }
}
