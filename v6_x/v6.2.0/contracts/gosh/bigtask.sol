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
import "./libraries/GoshLib.sol";
import "goshwallet.sol";
import "goshdao.sol";
import "task.sol";
import "repository.sol";

/* Root contract of bigtask */
contract BigTask is Modifiers{
    string constant version = "6.2.0";

    string static _nametask;
    string _repoName;
    address _repo;
    bool _ready = false;
    address _systemcontract;
    address static _goshdao;
    mapping(uint8 => TvmCell) _code;

    mapping(address => uint128) _assigners;
    mapping(address => uint128) _reviewers;
    mapping(address => uint128) _managers;
    uint128 public _assignfull = 0;
    uint128 public _reviewfull = 0;
    uint128 public _managerfull = 0;
    uint128 public _subtaskfull = 0;
    uint128 _assigncomplete = 0;
    uint128 _reviewcomplete = 0;
    uint128 _managercomplete = 0;
    uint128 _subtaskcomplete = 0;
    bool _allassign = false;
    bool _allreview = false;
    bool _allmanager = false;
    bool _allsubtask = false;
    uint128 _lastassign = 0;
    uint128 _lastreview = 0;
    uint128 _lastmanager = 0;
    uint128 _lastsubtask = 0;
    uint128 _balance;
    uint128 _freebalance;
    bool _waitForUpdate = false;
    address _previousVersionAddr;
    string _previousVersion;
    ConfigCommit[] _candidates;
    ConfigGrant _grant;
    string[] public _hashtag;
    uint128 _indexFinal;
    uint128 public _locktime = 0;
    uint128 _fullAssign = 0;
    uint128 _fullReview = 0;
    uint128 _fullManager = 0;
    uint128 _fullSubtask = 0;
    uint128 _subtaskgranted = 0;
    uint128 _fullSubtaskValue = 0;
    mapping(uint128 => Subtask) _subtask;
    uint128 _subtasskbalance = 0;
    uint128 _subtasksize = 0;
    uint128 _destroyedSubTask = 0;
    uint128 _approvedSubTask = 0;

    constructor(
        optional(TvmCell) defaultData,
        optional(TvmCell) previousVersion
        ) senderIs(_goshdao) {
        require(_nametask != "", ERR_NO_DATA);
        tvm.accept();
        if (defaultData.hasValue()) {
            ConfigCommit commit;
            (_repoName, _systemcontract, _code[m_WalletCode], _code[m_DaoCode], _code[m_RepositoryCode], _code[m_TaskCode], _grant, _balance, _freebalance, _hashtag, commit) = abi.decode(defaultData.get(),(string, address, TvmCell, TvmCell, TvmCell, TvmCell, ConfigGrant, uint128, uint128, string[], ConfigCommit));
            _repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, _repoName);
            this.isReady{value: 0.1 ton, flag: 1}(commit);
            return;
        }
        require(previousVersion.hasValue() == true, ERR_WRONG_DATA);
        (_repoName, _systemcontract, _code[m_WalletCode], _code[m_DaoCode], _code[m_RepositoryCode], _code[m_TaskCode], _hashtag, _previousVersion, _previousVersionAddr) = abi.decode(previousVersion.get(),(string, address, TvmCell, TvmCell, TvmCell, TvmCell, string[], string, address));
        _repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, _repoName);
        GoshDao(_goshdao).checkOldBigTaskVersion{value: 0.2 ton, flag: 1}(_nametask, _repoName, _previousVersion, _previousVersionAddr);
        _waitForUpdate = true;
    }

    function sendData(address toSend) public senderIs(_goshdao) accept {
        TvmCell data = abi.encode (_nametask, _repoName, _ready, _candidates, _grant, _indexFinal, _locktime, _fullAssign, _fullReview, _fullManager, _fullSubtask, _assigners, _reviewers, _managers, _assignfull, _reviewfull, _managerfull, _subtaskfull, _assigncomplete, _reviewcomplete, _managercomplete, _subtaskcomplete, _allassign, _allreview, _allmanager, _allsubtask, _lastassign, _lastreview, _lastmanager, _lastsubtask, _balance, _freebalance, _subtask, _subtasskbalance, _subtaskgranted, _fullSubtaskValue, _subtasksize, _destroyedSubTask, _approvedSubTask);
        BigTask(toSend).getUpgradeData{value: 0.1 ton, flag: 1}(data);
        GoshDao(_goshdao).destroyTaskTag{value: 0.21 ton, flag: 1}(_nametask, _repo, _hashtag);
        selfdestruct(_systemcontract);
    }

    function getUpgradeData(TvmCell data) public senderIs(_previousVersionAddr) accept {
            string name;
            (name, _repoName, _ready, _candidates, _grant, _indexFinal, _locktime, _fullAssign, _fullReview, _fullManager, _fullSubtask, _assigners, _reviewers, _managers, _assignfull, _reviewfull, _managerfull, _subtaskfull, _assigncomplete, _reviewcomplete, _managercomplete, _subtaskcomplete, _allassign, _allreview, _allmanager, _allsubtask, _lastassign, _lastreview, _lastmanager, _lastsubtask, _balance, _freebalance, _subtask, _subtasskbalance, _subtaskgranted, _fullSubtaskValue, _subtasksize, _destroyedSubTask, _approvedSubTask) = 
            abi.decode(data, (string, string, bool, ConfigCommit[], ConfigGrant, uint128, uint128, uint128, uint128, uint128, uint128,  mapping(address => uint128), mapping(address => uint128), mapping(address => uint128), uint128, uint128, uint128, uint128,  uint128, uint128, uint128, uint128, bool, bool, bool, bool, uint128, uint128, uint128, uint128, uint128, uint128, mapping(uint128 => Subtask), uint128, uint128, uint128, uint128, uint128, uint128));
            _repo = GoshLib.calculateRepositoryAddress(_code[m_RepositoryCode], _systemcontract, _goshdao, _repoName);
            address zero;
            if (_ready == true) {
                this.checkdaoMember{value:0.1 ton, flag: 1}(_candidates[_indexFinal].daoMembers, zero);
            }
            else { _waitForUpdate = false; }
            require(name == _nametask, ERR_WRONG_DATA);
    }

    function checkdaoMember(mapping(address => string) daoMember, address key) public senderIs(address(this)) accept {
        optional(address, string) res = daoMember.next(key);
        if (res.hasValue() == false) { _waitForUpdate = false; return; }
        string name;
        (key, name) = res.get();
        address addr = GoshLib.calculateDaoAddress(_code[m_DaoCode], _systemcontract, name);
        _candidates[_indexFinal].daoMembers[addr] = name;
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
        this.checkdaoMember{value:0.1 ton, flag: 1}(daoMember, key);
    }

    function isReady(ConfigCommit commit) public senderIs(address(this)) {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        require(_ready == false, ERR_TASK_COMPLETED);
        _candidates.push(commit);
        tvm.accept();
        this.calculateAssignLength{value : 0.15 ton, flag: 1}(uint128(_candidates.length - 1));
    }

    function calculateAssignLength (uint128 index) public view senderIs(address(this)) accept {
        uint128 assignfull = uint128(_candidates[index].pubaddrassign.keys().length);
        this.calculateReviewLength{value : 0.15 ton, flag: 1}(index, assignfull);
    }

    function calculateReviewLength (uint128 index, uint128 assignfull) public view senderIs(address(this)) accept {
        uint128 reviewfull = uint128(_candidates[index].pubaddrreview.keys().length);
        this.calculateManagerLength{value : 0.15 ton, flag: 1}(index, assignfull, reviewfull);
    }

    function calculateManagerLength (uint128 index, uint128 assignfull, uint128 reviewfull) public senderIs(address(this)) accept {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        require(_ready == false, ERR_TASK_COMPLETED);
        uint128 managerfull = uint128(_candidates[index].pubaddrmanager.keys().length);
        require(assignfull + reviewfull + managerfull > 0, ERR_DIFFERENT_COUNT);
        _assignfull = assignfull;
        _reviewfull = reviewfull;
        _managerfull = managerfull;
        _subtaskfull = 1;
        _indexFinal = index;
    }

    function approveSmallTask(address pubaddr, uint128 index, uint128 taskindex, ConfigCommitBase commit) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept {
        require(_candidates[0].pubaddrmanager.exists(pubaddr), ERR_INVALID_SENDER);
        Task(GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, _repo, _subtask[taskindex].name)).isReadyBig{value: 0.2 ton, flag: 1}(commit);
        return;
    }

    function approveReady(address pubaddr, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept {
        require(_candidates[0].pubaddrmanager.exists(pubaddr), ERR_INVALID_SENDER);
        if (_approvedSubTask != _subtasksize) { return; }
        _ready = true;
        _locktime = block.timestamp;
        this.sendReady{value: 0.1 ton, flag: 1}(0);
    }

    function deploySubTask(address pubaddr, uint128 index,
        string repoName,
        string nametask,
        string[] hashtag,
        ConfigGrant grant,
        uint128 value,
        optional(ConfigCommitBase) workers ) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept {
        require(_candidates[0].pubaddrmanager.exists(pubaddr), ERR_INVALID_SENDER);
        if (_subtasksize >= 100) { return; }
        require(_ready == false, ERR_TASK_COMPLETED);
        if ((_candidates[_indexFinal].pubaddrassign.exists(pubaddr) == false) && (_candidates[_indexFinal].pubaddrreview.exists(pubaddr) == false) && (_candidates[_indexFinal].pubaddrmanager.exists(pubaddr) == false)) { return; }
        if (_fullSubtaskValue + value > _freebalance) { return; }
        GoshWallet(msg.sender).deployTaskFromBigTask{value: 0.1 ton}(_nametask, repoName, nametask, hashtag, grant, value, workers);
    }

    function deploySubTaskFinal(
        string nametask,
        uint128 value) public senderIs(GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, _repo, nametask)) accept {
        if (_subtasksize >= 100) { 
            Task(msg.sender).destroyBig{value: 0.1 ton, flag: 1}();
            return; 
        }
        if(_ready == true) { 
            Task(msg.sender).destroyBig{value: 0.1 ton, flag: 1}();
            return; 
        }
        if (_fullSubtaskValue + value > _freebalance)  { 
            Task(msg.sender).destroyBig{value: 0.1 ton, flag: 1}();
            return; 
        }
        _fullSubtaskValue += value;
        _subtask[_subtasksize] = Subtask(value, nametask);
        _subtasksize += 1;
    }

    function destroySubTaskFinal(
        string nametask,
        bool ready) public senderIs(GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, _repo, nametask)) accept {
        _destroyedSubTask += 1;
        if (ready == false) { _approvedSubTask += 1; }
        address key;
        optional(address, bool) res = _candidates[_indexFinal].pubaddrmanager.next(key);
        if (res.hasValue()) { 
            checkempty();
        }
    }

    function approvedSub(
        string nametask) public senderIs(GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, _repo, nametask)) accept {
        if (_ready == false) { _approvedSubTask += 1; }
    }

    function destroySubTask(address pubaddr,
        uint128 index,
        uint128 index1) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept {
        require(_candidates[0].pubaddrmanager.exists(pubaddr), ERR_INVALID_SENDER);
        require(_ready == false, ERR_TASK_COMPLETED);
        _fullSubtaskValue -= _subtask[index1].value;
        Task(GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, _repo, _subtask[index1].name)).destroyBig{value: 0.1 ton, flag: 1}();
        delete _subtask[index1];
    }

    function getGrant(address pubaddr, uint128 typegrant, uint128 index) public {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        require(_ready == true, ERR_TASK_NOT_COMPLETED);
        require(block.timestamp >= _locktime, ERR_NOT_READY);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        checkempty();
        if (m_assign == typegrant) {
            require(_candidates[_indexFinal].pubaddrassign.exists(pubaddr), ERR_ASSIGN_NOT_EXIST);
            this.getGrantAssign{value: 0.2 ton, flag: 1}(pubaddr);
        }
        if (m_review == typegrant) {
            require(_candidates[_indexFinal].pubaddrreview.exists(pubaddr), ERR_REVIEW_NOT_EXIST);
            this.getGrantReview{value: 0.2 ton, flag: 1}(pubaddr);
        }
        if (m_manager == typegrant) {
            require(_candidates[_indexFinal].pubaddrmanager.exists(pubaddr), ERR_MANAGER_NOT_EXIST);
            this.getGrantManager{value: 0.2 ton, flag: 1}(pubaddr);
        }
    }

    function getGrantAssign(address pubaddr) public senderIs(address(this)) accept {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        uint128 check = 0;
        for (uint128 i = _lastassign; i < _grant.assign.length; i++){
            check += 1;
            if (check == 3) { this.getGrantAssign{value: 0.2 ton, flag: 1}(pubaddr); return; }
            if (block.timestamp >= _grant.assign[i].lock + _locktime) {
                _fullAssign += _grant.assign[i].grant;
                _grant.assign[i].grant = 0;
                _lastassign = i + 1;
                if (i == _grant.assign.length - 1) { _allassign = true; }
            } else { break; }
        }
        uint128 diff = _fullAssign / _assignfull - _assigners[pubaddr];
        _balance -= diff;
        if (diff == 0) { return; }
        _assigners[pubaddr] += diff;
        if ((_allassign == true) && (diff != 0)) { _assigncomplete += 1; }
        address addr = GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, 0);
        GoshWallet(addr).grantTokenBig{value: 0.1 ton, flag: 1}(_nametask, _repo, diff);
        checkempty();
        return;
    }

    function getGrantReview(address pubaddr) public senderIs(address(this)) accept {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        uint128 check = 0;
        for (uint128 i = _lastreview; i < _grant.review.length; i++){
            check += 1;
            if (check == 3) { this.getGrantReview{value: 0.2 ton, flag: 1}(pubaddr); return; }
            if (block.timestamp >= _grant.review[i].lock + _locktime) {
                _fullReview += _grant.review[i].grant;
                _grant.review[i].grant = 0;
                _lastreview = i + 1;
                if (i == _grant.review.length - 1) { _allreview = true; }
            } else { break; }
        }
        uint128 diff = _fullReview / _reviewfull - _reviewers[pubaddr];
        _balance -= diff;
        if (diff == 0) { return; }
        _reviewers[pubaddr] += diff;
        if ((_allreview == true) && (diff != 0)) { _reviewcomplete += 1; }
        address addr = GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, 0);
        GoshWallet(addr).grantTokenBig{value: 0.1 ton, flag: 1}(_nametask, _repo, diff);
        checkempty();
        return;
    }

    function getGrantManager(address pubaddr) public senderIs(address(this)) accept {
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        uint128 check = 0;
        for (uint128 i = _lastmanager; i < _grant.manager.length; i++){
            check += 1;
            if (check == 3) { this.getGrantManager{value: 0.2 ton, flag: 1}(pubaddr); return; }
            if (block.timestamp >= _grant.manager[i].lock + _locktime) {
                _fullManager += _grant.manager[i].grant;
                _grant.manager[i].grant = 0;
                _lastmanager = i + 1;
                if (i == _grant.manager.length - 1) { _allmanager = true; }
            } else { break; }
        }
        uint128 diff = _fullManager / _managerfull - _managers[pubaddr];
        _balance -= diff;
        if (diff == 0) { return; }
        _managers[pubaddr] += diff;
        if ((_allmanager == true) && (diff != 0)) { _managercomplete += 1; }
        address addr = GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, 0);
        GoshWallet(addr).grantTokenBig{value: 0.1 ton, flag: 1}(_nametask, _repo, diff);
        checkempty();
        return;
    }

    function getGrantSubTask(string nametask) public {
        if (msg.sender != address(this)) { require(GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, _repo, nametask) == msg.sender, ERR_SENDER_NO_ALLOWED); }
        require(_waitForUpdate == false, ERR_WRONG_UPGRADE_STATUS);
        tvm.accept();
        uint128 check = 0;
        for (uint128 i = _lastsubtask; i < _grant.subtask.length; i++){
            check += 1;
            if (check == 3) { this.getGrantSubTask{value: 0.2 ton, flag: 1}(nametask); return; }
            if (block.timestamp >= _grant.subtask[i].lock + _locktime) {
                _fullSubtask += _grant.subtask[i].grant;
                _grant.subtask[i].grant = 0;
                _lastsubtask = i + 1;
                if (i == _grant.subtask.length - 1) { _allsubtask = true; }
            } else { break; }
        }
        uint128 diff = _fullSubtask - _subtaskgranted;
        if (diff == 0) { return; }
        _subtaskgranted = _fullSubtask;
        this.grantTokenToSubtask{value: 0.1 ton, flag: 1}(diff, 0, 0);
        return;
    }

    function sendReady(uint128 index) public view senderIs(address(this)) accept {
        if (index > _subtasksize - 1) { return; }
        if (_subtask.exists(index)) {
            Task(GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, _repo, _subtask[index].name)).isReadyBalance{value: 0.2 ton, flag: 1}();
        }
        this.sendReady{value: 0.1 ton, flag: 1}(index + 1);
    }

    function grantTokenToSubtask(uint128 diff, uint128 granted, uint128 index) public senderIs(address(this)) accept {
        if (index > _subtasksize - 1) { 
            _subtaskgranted -= diff - granted; 
            if ((_allsubtask == true) && (diff == granted)) { _subtaskcomplete += 1; }
            return; 
        }
        uint128 sm = diff * _subtask[index].value;
        sm /= _fullSubtaskValue;
        granted += sm;
        if (granted > diff) { return; }
        this.grantTokenToSubtask{value: 0.1 ton, flag: 1}(diff, granted, index + 1);
        if (sm != 0) { Task(GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, _repo, _subtask[index].name)).grantToken{value: 0.2 ton, flag: 1}(sm); }
    }

    function checkempty() private {
        if (_assigncomplete != _assignfull) { return; }
        if (_reviewcomplete != _reviewfull) { return; }
        if (_managercomplete != _managerfull) { return; }
        if ((_subtaskcomplete != _subtaskfull) && (_subtasksize != 0)) { return; }
        if (_subtasksize != _destroyedSubTask) { return; }
        GoshDao(_goshdao).returnTaskTokenBig{value: 0.2 ton, flag: 1}(_nametask, _repo, _freebalance + _balance - _subtaskgranted);
        GoshDao(_goshdao).destroyTaskTagBig{value: 0.21 ton, flag: 1}(_nametask, _repo, _hashtag);
        selfdestruct(_systemcontract);
    }

    //Selfdestruct

    function destroy(address pubaddr, uint128 index) public view {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        require(_candidates[0].pubaddrmanager.exists(pubaddr), ERR_INVALID_SENDER);
        require(_ready == false, ERR_TASK_COMPLETED);
        tvm.accept();
        GoshDao(_goshdao).returnTaskTokenBig{value: 0.2 ton, flag: 1}(_nametask, _repo, _freebalance + _balance - _subtaskgranted);
        GoshDao(_goshdao).destroyTaskTagBig{value: 0.21 ton, flag: 1}(_nametask, _repo, _hashtag);
        this.destroySubTaskIn{value: 0.1 ton, flag: 1}(0);
    }

    function destroySubTaskIn(
        uint128 index1) public senderIs(address(this)) accept {
        require(_ready == false, ERR_TASK_COMPLETED);
        if (_subtask.exists(index1)){
            Task(GoshLib.calculateTaskAddress(_code[m_TaskCode], _goshdao, _repo, _subtask[index1].name)).destroyBig{value: 0.1 ton, flag: 1}();
            delete _subtask[index1];
        }
        if (index1 >= _subtasksize) { selfdestruct(_systemcontract); return; }
        this.destroySubTaskIn{value: 0.1 ton, flag: 1}(index1 + 1);
    }

    //Getters
    function getTaskIn() public view minValue(0.5 ton) {
        TvmCell data = abi.encode (_nametask, _repoName, _repo, _ready, _candidates, _grant, _indexFinal, _locktime, _fullAssign, _fullReview, _fullManager, _assigners, _reviewers, _managers, _assignfull, _reviewfull, _managerfull, _assigncomplete, _reviewcomplete, _managercomplete, _allassign, _allreview, _allmanager, _lastassign, _lastreview, _lastmanager, _balance);
        IObject(msg.sender).returnTask{value: 0.1 ton, flag: 1}(data);
    }

    function getStatus() external view returns(string nametask, address repo, ConfigCommit[] candidates, ConfigGrant grant, bool ready, uint128 indexFinal, string[] hashtag, uint128 locktime, mapping(uint128 => Subtask) subtask, uint128 fullSubtaskValue) {
        return (_nametask, _repo, _candidates, _grant, _ready, _indexFinal, _hashtag, _locktime, _subtask, _fullSubtaskValue);
    }
    function getVersion() external pure returns(string, string) {
        return ("bigtask", version);
    }
}
