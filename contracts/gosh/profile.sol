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

contract Profile is Modifiers {

    string constant version = "0.11.0";
    
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

    uint256 static _pubkey;

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
    
    address static _goshroot;
    bool _flag = false;
    mapping(uint256 => bool) _owners;

    constructor(
    ) public senderIs(_goshroot) {
        _owners[_pubkey] = true;
//        getMoney();
    }
    
    function addPubkey(
        uint256 pubkey
    ) public onlyOwnerPubkeyList  accept saveMsg {
        _owners[pubkey] = true;
//        getMoney();
    }

    function deletePubkey(
        uint256 pubkey
    ) public onlyOwnerPubkeyList  accept saveMsg {
        delete _owners[pubkey];
//        getMoney();
    }
    
    function turnOn(address wallet, uint256 pubkey) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).turnOnPubkey{value: 0.1 ton, flag : 1}(pubkey);
//        getMoney();
    }
    
    function turnOff(address wallet) public onlyOwnerPubkeyList  accept saveMsg {
        GoshWallet(wallet).turnOffPubkey{value: 0.1 ton, flag : 1}();
//        getMoney();
    }

    //Money part
    function getMoney() private {
        if (_flag == true) { return; }
        if (address(this).balance > 1000 ton) { return; }
        _flag = true;
        GoshRoot(_goshroot).sendMoneyProfile{value : 0.2 ton}(_pubkey, 1000 ton);
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
    
    //Getters
    function getAccess() external view returns(mapping(uint256 => bool)) {
        return _owners;
    }
}
