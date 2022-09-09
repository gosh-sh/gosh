// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ton-solidity >=0.61.2;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import "./modifiers/modifiers.sol";
import "goshwallet.sol";
import "gosh.sol";
import "goshdao.sol";
import "profiledao.sol";

contract Profile is Modifiers {
    string constant version = "1.0.0";
    TvmCell m_codeProfileDao;

    // mapping to store hashes of inbound messages;
    mapping(uint256 => uint32) m_messages;
    LastMsg m_lastMsg;
    // Each transaction is limited by gas, so we must limit count of iteration in loop.
    uint8 constant MAX_CLEANUP_MSGS = 20;

    modifier saveMsg() {
        /* m_messages[m_lastMsg.msgHash] = m_lastMsg.expireAt;
        gc(); */
        _saveMsg();
        _;
    }

    string static _name;

    function _saveMsg() inline internal {
        m_messages[m_lastMsg.msgHash] = m_lastMsg.expireAt;
        gc();
    }

    struct LastMsg {
        uint32 expireAt;
        uint256 msgHash;
    }

    function gc() private {
        uint counter = 0;
        for ((uint256 msgHash, uint32 expireAt) : m_messages) {
            if (counter >= MAX_CLEANUP_MSGS) {
                break;
            }
            counter++;
            if (expireAt <= now) {
                delete m_messages[msgHash];
            }
        }
    }


    modifier onlyOwnerPubkeyList() {
        require (_owners.exists(msg.pubkey()) == true, ERR_SENDER_NO_ALLOWED) ;
        _;
    }

    address _goshroot;
    bool _flag = false;
    mapping(uint256 => bool) _owners;

    constructor( TvmCell codeProfileDao,
        uint256 pubkey
    ) public {
        _goshroot = msg.sender;
        m_codeProfileDao = codeProfileDao;
        _owners[pubkey] = true;
        getMoney();
    }

    function deployedWallet(address goshroot, address goshdao, uint128 index, string ver) public pure {
        goshroot; goshdao; index; ver;
    }

    function addPubkey(
        uint256 pubkey
    ) public onlyOwnerPubkeyList  accept saveMsg {
        _owners[pubkey] = true;
        getMoney();
    }

    function deletePubkey(
        uint256 pubkey
    ) public onlyOwnerPubkeyList  accept saveMsg {
        delete _owners[pubkey];
        getMoney();
    }

    function turnOn(address wallet, uint256 pubkey) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).turnOnPubkey{value: 0.1 ton, flag : 1}(pubkey);
        getMoney();
    }

    function turnOff(address wallet) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).turnOffPubkey{value: 0.1 ton, flag : 1}();
        getMoney();
    }

    function deployWallet(address dao, address pubaddr) public onlyOwnerPubkeyList  accept saveMsg {
        GoshDao(dao).deployWallet{value: 0.1 ton, flag : 1}(pubaddr);
    }

    function deleteWallet(address dao, address pubaddr) public onlyOwnerPubkeyList  accept saveMsg {
        GoshDao(dao).deleteWallet{value: 0.1 ton, flag : 1}(pubaddr);
    }

    function deployDao(string name, optional(address) previous) public onlyOwnerPubkeyList  accept saveMsg {
        TvmCell s0 = tvm.buildStateInit({
            code: m_codeProfileDao,
            contr: ProfileDao,
            varInit: {_name : name}
        });
        address daoprofile = new ProfileDao {stateInit: s0, value: FEE_DEPLOY_DAO_PROFILE, wid: 0, flag: 1}();
        ProfileDao(daoprofile).deployDao{value: 0.1 ton, flag : 1}(_goshroot, previous);
    }

    function destroyDao(string name) public onlyOwnerPubkeyList  accept saveMsg {
        TvmCell s0 = tvm.buildStateInit({
            code: m_codeProfileDao,
            contr: ProfileDao,
            varInit: {_name : name}
        });
        address daoprofile = address.makeAddrStd(0, tvm.hash(s0));
        ProfileDao(daoprofile).destroy{value: 0.1 ton, flag : 1}();
    }

    function sendMoneyProfileDao(string name, uint128 value) public view {
        tvm.accept();
        TvmCell s0 = tvm.buildStateInit({
            code: m_codeProfileDao,
            contr: ProfileDao,
            varInit: {_name : name}
        });
        address daoprofile = new ProfileDao {stateInit: s0, value: FEE_DEPLOY_DAO_PROFILE, wid: 0, flag: 1}();
        require(daoprofile == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        daoprofile.transfer(value);
    }

    //Money part
    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 1000 ton) { return; }
        _flag = true;
        GoshRoot(_goshroot).sendMoneyProfile{value : 0.2 ton}(_name, 1000 ton);
    }

    //Fallback/Receive
    receive() external {
        if (msg.sender == _goshroot) {
            _flag = false;
        }
    }

    //Selfdestruct
    function destroy() public onlyOwnerPubkeyList {
        selfdestruct(_goshroot);
    }

    //Setters
    function setNewGoshRoot(address goshroot) public onlyOwnerPubkeyList {
        tvm.accept();
        _goshroot = goshroot;
    }

    //Getters
    function getAccess() external view returns(mapping(uint256 => bool)) {
        return _owners;
    }

    function isPubkeyCorrect(uint256 pubkey) external view returns(bool) {
        return _owners.exists(pubkey);
    }

    function getProfileDaoAddr(string name) external view returns(address){
        TvmCell s0 = tvm.buildStateInit({
            code: m_codeProfileDao,
            contr: ProfileDao,
            varInit: {_name : name}
        });
        return address(tvm.hash(s0));
    }
}
