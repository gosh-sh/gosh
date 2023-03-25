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
import "./libraries/GoshLib.sol";
import "goshwallet.sol";
import "goshdao.sol";
import "task.sol";
import "repository.sol";

/* Root contract of task */
contract Task is Modifiers{
    string constant version = "3.0.0";
    
    string static _nametask;
    string _repoName;
    address _repo;
    bool _ready = false;
    address _systemcontract;
    address static _goshdao;
    mapping(uint8 => TvmCell) _code;
    ConfigCommitBase[] _candidates;   
    ConfigGrant _grant;   
    string[] public _hashtag;
    uint128 _indexFinal;
    uint128 public _locktime = 0;
    uint128 _fullAssign = 0;
    uint128 _fullReview = 0;
    uint128 _fullManager = 0;
    mapping(address => uint128) _assigners;
    mapping(address => uint128) _reviewers;
    mapping(address => uint128) _managers;
    mapping(address => string) _daoMember;
    uint128 public _assignfull = 0;
    uint128 public _reviewfull = 0;
    uint128 public _managerfull = 0;
    uint128 _assigncomplete = 0;
    uint128 _reviewcomplete = 0;
    uint128 _managercomplete = 0;
    bool _allassign = false;
    bool _allreview = false;
    bool _allmanager = false;
    uint128 _lastassign = 0;
    uint128 _lastreview = 0;
    uint128 _lastmanager = 0;
    uint128 _balance;
    bool _waitForUpdate = false;
    address _previousVersionAddr;
    string _previousVersion;
    
    constructor(
        optional(TvmCell) defaultData,
        optional(TvmCell) extraData,
        optional(TvmCell) previousVersion
        ) public senderIs(_goshdao) {
        require(_nametask != "", ERR_NO_DATA);
        tvm.accept();
        if (defaultData.hasValue()) { 
            (_repoName, _systemcontract, _code[m_WalletCode], _code[m_DaoCode], _code[m_RepositoryCode], _grant, _balance, _hashtag) = abi.decode(defaultData.get(),(string, address, TvmCell, TvmCell, TvmCell, ConfigGrant, uint128, string[]));
            _repo = _buildRepositoryAddr(_repoName);
            return;
        } 
        if (extraData.hasValue() == true) {
            TvmCell extraData1;
            (_code, extraData1) = abi.decode(extraData.get(),(mapping(uint8 => TvmCell), TvmCell));
            string name;
            address dao;
            (name, _repoName, _ready, _systemcontract, dao, _candidates, _grant, _hashtag, _indexFinal, _locktime, _fullAssign, _fullReview, _fullManager, _assigners, _reviewers, _managers, _assignfull, _reviewfull, _managerfull, _assigncomplete, _reviewcomplete, _managercomplete, _allassign, _allreview, _allmanager, _lastassign, _lastreview, _lastmanager, _balance) = abi.decode(extraData1, (string, string, bool, address, address, ConfigCommitBase[], ConfigGrant, string[], uint128, uint128, uint128, uint128, uint128, mapping(address => uint128), mapping(address => uint128), mapping(address => uint128), uint128, uint128, uint128, uint128, uint128, uint128, bool, bool, bool, uint128, uint128, uint128, uint128));
            require(name == _nametask, ERR_WRONG_DATA);
            require(dao == _goshdao, ERR_WRONG_DATA);   
            _repo = _buildRepositoryAddr(_repoName);
            return;         
        }
        require(previousVersion.hasValue() == true, ERR_WRONG_DATA);
        (_repoName, _systemcontract, _code[m_WalletCode], _code[m_DaoCode], _code[m_RepositoryCode], _previousVersion, _previousVersionAddr) = abi.decode(previousVersion.get(),(string, address, TvmCell, TvmCell, TvmCell, string, address));
        _repo = _buildRepositoryAddr(_repoName);
        GoshDao(_goshdao).checkOldTaskVersion{value: 0.2 ton}(_nametask, _repoName, _previousVersion, _previousVersionAddr);
        _waitForUpdate = true;
    }
    
    function sendData(address toSend) public senderIs(_goshdao) accept {
        TvmCell data = abi.encode (_nametask, _repoName, _repo, _ready, _candidates, _grant, _indexFinal, _locktime, _fullAssign, _fullReview, _fullManager, _assigners, _reviewers, _managers, _assignfull, _reviewfull, _managerfull, _assigncomplete, _reviewcomplete, _managercomplete, _allassign, _allreview, _allmanager, _lastassign, _lastreview, _lastmanager, _balance, _daoMember);
        Task(toSend).getUpgradeData{value: 0.1 ton}(data);
        selfdestruct(giver);
    }
    
    function getUpgradeData(TvmCell data) public senderIs(_previousVersionAddr) accept {
            string name;
            mapping(address => string) daoMember;
            (name, _repoName, _repo, _ready, _candidates, _grant, _indexFinal, _locktime, _fullAssign, _fullReview, _fullManager, _assigners, _reviewers, _managers, _assignfull, _reviewfull, _managerfull, _assigncomplete, _reviewcomplete, _managercomplete, _allassign, _allreview, _allmanager, _lastassign, _lastreview, _lastmanager, _balance, daoMember) = abi.decode(data, (string, string, address, bool, ConfigCommitBase[], ConfigGrant, uint128, uint128, uint128, uint128, uint128, mapping(address => uint128), mapping(address => uint128), mapping(address => uint128), uint128, uint128, uint128, uint128, uint128, uint128, bool, bool, bool, uint128, uint128, uint128, uint128, mapping(address => string)));
            address zero;
            this.checkdaoMember{value:0.1 ton}(daoMember, zero);
            require(name == _nametask, ERR_WRONG_DATA);       
    }
    
    function checkdaoMember(mapping(address => string) daoMember, address key) public senderIs(address(this)) accept {
        optional(address, string) res = daoMember.next(key);
        if (res.hasValue() == false) { _waitForUpdate = false; return; }
        string name;
        (key, name) = res.get();
        address addr = getAddrDaoIn(name);
        _daoMember[addr] = name;
        if (_candidates[_indexFinal].pubaddrassign.exists(key) == true) {
            _candidates[_indexFinal].pubaddrassign[addr] = _candidates[_indexFinal].pubaddrassign[key];
            delete _candidates[_indexFinal].pubaddrassign[key];
        }
        if (_candidates[_indexFinal].pubaddrreview.exists(key) == true) {
            _candidates[_indexFinal].pubaddrreview[addr] = _candidates[_indexFinal].pubaddrreview[key];
            delete _candidates[_indexFinal].pubaddrreview[key];
        }
        if (_candidates[_indexFinal].pubaddrmanager.exists(key) == true) {
            _candidates[_indexFinal].pubaddrmanager[addr] = _candidates[_indexFinal].pubaddrmanager[key];
            delete _candidates[_indexFinal].pubaddrmanager[key];
        }
        if (_assigners.exists(key) == true) {
            _assigners[addr] = _assigners[key];
            delete _assigners[key];
        }
        if (_reviewers.exists(key) == true) {
            _reviewers[addr] = _reviewers[key];
            delete _reviewers[key];
        }
        if (_managers.exists(key) == true) {
            _managers[addr] = _managers[key];
            delete _managers[key];
        }
        this.checkdaoMember{value:0.1 ton}(daoMember, key);
    }
 /*   
    function setConfig(ConfigGrant grant, uint128 index) public {
        require(_ready == false, ERR_TASK_COMPLETED);
        checkAccess(_pubaddr, msg.sender, index);
        _grant = grant;
    } 
 */   
    function isReady(ConfigCommitBase commit) public senderIs(_repo) {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        require(_ready == false, ERR_TASK_COMPLETED);
        _candidates.push(commit);
//    } 
//    
//    function confirmSmv(address pubaddr, uint128 index1, uint128 index2) public {
//       require(_ready == false, ERR_TASK_COMPLETED);
//       require(index1 < _candidates.length, ERR_TASK_COMPLETED);
//       checkAccess(pubaddr, msg.sender, index2);
        tvm.accept();
        this.calculateAssignLength{value : 0.15 ton}(uint128(_candidates.length - 1));
    }
    
    function calculateAssignLength (uint128 index) public view senderIs(address(this)) accept {   
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS); 
        require(_ready == false, ERR_TASK_COMPLETED);    
        uint128 assignfull = uint128(_candidates[index].pubaddrassign.keys().length);
        this.calculateReviewLength{value : 0.15 ton}(index, assignfull);
    }
    
    function calculateReviewLength (uint128 index, uint128 assignfull) public view senderIs(address(this)) accept {   
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);   
        require(_ready == false, ERR_TASK_COMPLETED);  
        uint128 reviewfull = uint128(_candidates[index].pubaddrreview.keys().length);
        this.calculateManagerLength{value : 0.15 ton}(index, assignfull, reviewfull);
    }
    
    function calculateManagerLength (uint128 index, uint128 assignfull, uint128 reviewfull) public senderIs(address(this)) accept { 
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        require(_ready == false, ERR_TASK_COMPLETED);       
        uint128 managerfull = uint128(_candidates[index].pubaddrmanager.keys().length);
        require(assignfull + reviewfull + managerfull > 0, ERR_DIFFERENT_COUNT); 
        _assignfull = assignfull;
        _reviewfull = reviewfull;
        _managerfull = managerfull;
        _indexFinal = index;
        _ready = true;
        _locktime = now;
    }
        
    function getGrant(address pubaddr, uint128 typegrant, uint128 index) public view {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        require(_ready == true, ERR_TASK_NOT_COMPLETED);
        require(now >= _locktime, ERR_NOT_READY);
        checkAccess(pubaddr, msg.sender, index); 
        tvm.accept();
        if (m_assign == typegrant) {
            require(_candidates[_indexFinal].pubaddrassign.exists(pubaddr), ERR_ASSIGN_NOT_EXIST);
            this.getGrantAssign{value: 0.2 ton}(pubaddr);
        }
        if (m_review == typegrant) {
            require(_candidates[_indexFinal].pubaddrreview.exists(pubaddr), ERR_REVIEW_NOT_EXIST);
            this.getGrantReview{value: 0.2 ton}(pubaddr);
        }
        if (m_manager == typegrant) {
            require(_candidates[_indexFinal].pubaddrmanager.exists(pubaddr), ERR_MANAGER_NOT_EXIST);
            this.getGrantManager{value: 0.2 ton}(pubaddr);
        }    
    }
    
    function getGrantAssign(address pubaddr) public senderIs(address(this)) accept {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        uint128 check = 0;
        for (uint128 i = _lastassign; i < _grant.assign.length; i++){
            check += 1;
            if (check == 3) { this.getGrantAssign{value: 0.2 ton}(pubaddr); return; }
            if (now >= _grant.assign[i].lock + _locktime) { 
                _fullAssign += _grant.assign[i].grant; 
                _grant.assign[i].grant = 0; 
                _lastassign = i + 1;
                if (i == _grant.assign.length - 1) { _allassign = true; } 
            } else { break; }
        }
        uint128 diff = _fullAssign / _assignfull - _assigners[pubaddr];
        _balance -= diff;
        if (diff == 0) { return; }
        _assigners[pubaddr] = _fullAssign / _assignfull;
        if ((_allassign == true) && (diff != 0)) { _assigncomplete += 1; }
        TvmCell s1 = _composeWalletStateInit(pubaddr, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        GoshWallet(addr).grantToken{value: 0.1 ton}(_nametask, _repo, diff);
        checkempty(addr);
        return;
    }
    
    function getGrantReview(address pubaddr) public senderIs(address(this)) accept {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        uint128 check = 0;
        for (uint128 i = _lastreview; i < _grant.review.length; i++){
            check += 1;
            if (check == 3) { this.getGrantReview{value: 0.2 ton}(pubaddr); return; }
            if (now >= _grant.review[i].lock + _locktime) { 
                _fullReview += _grant.review[i].grant; 
                _grant.review[i].grant = 0; 
                _lastreview = i + 1;
                if (i == _grant.review.length - 1) { _allreview = true; } 
            } else { break; }
        }
        uint128 diff = _fullReview / _reviewfull - _reviewers[pubaddr];
        _balance -= diff;
        if (diff == 0) { return; }
        _reviewers[pubaddr] = _fullReview / _reviewfull;
        if ((_allreview == true) && (diff != 0)) { _reviewcomplete += 1; }
        TvmCell s1 = _composeWalletStateInit(pubaddr, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        GoshWallet(addr).grantToken{value: 0.1 ton}(_nametask, _repo, diff);
        checkempty(addr);
        return;
    }
    
    function getGrantManager(address pubaddr) public senderIs(address(this)) accept {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        uint128 check = 0;
        for (uint128 i = _lastmanager; i < _grant.manager.length; i++){
            check += 1;
            if (check == 3) { this.getGrantManager{value: 0.2 ton}(pubaddr); return; }
            if (now >= _grant.manager[i].lock + _locktime) { 
                _fullManager += _grant.manager[i].grant; 
                _grant.manager[i].grant = 0; 
                _lastmanager = i + 1;
                if (i == _grant.manager.length - 1) { _allmanager = true; } 
            } else { break; }
        }
        uint128 diff = _fullManager / _managerfull - _managers[pubaddr];
        _balance -= diff;
        if (diff == 0) { return; }
        _managers[pubaddr] = _fullManager / _managerfull;
        if ((_allmanager == true) && (diff != 0)) { _managercomplete += 1; }
        TvmCell s1 = _composeWalletStateInit(pubaddr, 0);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        GoshWallet(addr).grantToken{value: 0.1 ton}(_nametask, _repo, diff);
        checkempty(addr);
        return;
    }
    
    function checkAccess(address pubaddr, address sender, uint128 index) internal view returns(bool) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        return addr == sender;
    }
    
    function checkempty(address addr) private {
        if (_assigncomplete != _assignfull) { return; }
        if (_reviewcomplete != _reviewfull) { return; }
        if (_managercomplete != _managerfull) { return; }
        GoshDao(_goshdao).returnTaskToken{value: 0.2 ton}(_nametask, _repo, _balance);
        GoshDao(_goshdao).destroyTaskTag{value: 0.21 ton}(_nametask, _repo, _hashtag, addr);
        selfdestruct(giver);
    }
    
    
    function _composeWalletStateInit(address pubaddr, uint128 index) internal view returns(TvmCell) {
        TvmCell deployCode = GoshLib.buildWalletCode(_code[m_WalletCode], pubaddr, version);
        TvmCell _contract = tvm.buildStateInit({
            code: deployCode,
            contr: GoshWallet,
            varInit: {_systemcontract : _systemcontract, _goshdao: _goshdao, _index: index}
        });
        return _contract;
    }
    
    function getAddrWalletIn(address pubaddr, uint128 index) private view returns(address) {
        TvmCell s1 = _composeWalletStateInit(pubaddr, index);
        return address.makeAddrStd(0, tvm.hash(s1));
    }
    
    function getAddrDaoIn(string name) private view returns(address) {
        TvmCell s1 = _composeDaoStateInit(name);
        return address.makeAddrStd(0, tvm.hash(s1));
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
            varInit: { _systemcontract : _systemcontract }
        });
    }
    
    function _buildRepositoryAddr(string name) private view returns (address) {
        TvmCell deployCode = GoshLib.buildRepositoryCode(
            _code[m_RepositoryCode], _systemcontract, _goshdao, version
        );
        return address(tvm.hash(tvm.buildStateInit({
            code: deployCode,
            contr: Repository,
            varInit: { _name: name }
        })));
    }
    
    //Selfdestruct
    
    function destroy(address pubaddr, uint128 index) public {
        require(checkAccess(pubaddr, msg.sender, index), ERR_SENDER_NO_ALLOWED);
        require(_ready == false, ERR_TASK_COMPLETED);
        GoshDao(_goshdao).returnTaskToken{value: 0.2 ton}(_nametask, _repo, _balance);
        GoshDao(_goshdao).destroyTaskTag{value: 0.21 ton}(_nametask, _repo, _hashtag, msg.sender);
        selfdestruct(giver);
    }
    
    //Getters 
    function getTaskIn() public view minValue(0.3 ton) {
        TvmCell data = abi.encode (_nametask, _repoName, _repo, _ready, _candidates, _grant, _indexFinal, _locktime, _fullAssign, _fullReview, _fullManager, _assigners, _reviewers, _managers, _assignfull, _reviewfull, _managerfull, _assigncomplete, _reviewcomplete, _managercomplete, _allassign, _allreview, _allmanager, _lastassign, _lastreview, _lastmanager, _balance, _daoMember);
        IObject(msg.sender).returnTask{value: 0.1 ton}(data);
    }
       
    function getStatus() external view returns(string nametask, address repo, ConfigCommitBase[] candidates, ConfigGrant grant, bool ready, uint128 indexFinal, string[] hashtag, uint128 locktime) {
        return (_nametask, _repo, _candidates, _grant, _ready, _indexFinal, _hashtag, _locktime);
    }
    function getVersion() external pure returns(string, string) {
        return ("task", version);
    }
}
