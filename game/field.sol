// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma ignoreIntOverflow;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./constants.sol";
import "./award.sol";
import "./profile.sol";
import "./forest.sol";
import "./libraries/GameLib.sol";

contract Field is Constants {
    string constant version = "0.0.1";

    address static _fabric;
    Position static _position;
    optional(Building) _content;
    optional(uint256) _owner;
    mapping(uint8 => TvmCell) _code;
    mapping(uint256 => bool) _visiters;
    optional(uint32) _timer;
    uint128 _tree_balance = 0;
    uint128 _tree_income = 0;
    optional(string) _union;
    uint128 _timeupdate = uint128(0);
    optional(Position) _forest;


    constructor(
        TvmCell fieldCode,
        TvmCell profileCode,
        TvmCell awardCode,
        TvmCell forestCode
    ) accept onlyOwner {
        _code[m_FieldCode] = fieldCode;
        _code[m_ProfileCode] = profileCode;
        _code[m_AwardCode] = awardCode;
        _code[m_ForestCode] = forestCode;
    }

    function dig(uint256 pubkey) public minValue(0.5 ever) senderIs(GameLib.calculateProfileAddress(_code[m_ProfileCode], _fabric, pubkey, version)) {
        reCalculateKarma();
        if ((_visiters.exists(pubkey) == false) && (_owner.hasValue() == false)) {
            rnd.shuffle();
            Award(GameLib.calculateAwardAddress(_code[m_AwardCode], _fabric, rnd.next(AWARD_NUM), version)).grant{value: 0.3 ton}(pubkey, _position);
        } 
    }

    function buildTree(uint256 pubkey) public minValue(0.5 ever) senderIs(GameLib.calculateProfileAddress(_code[m_ProfileCode], _fabric, pubkey, version)) {
        reCalculateKarma();
        if (_owner.hasValue() == false) {
            _owner = pubkey;
            _content.get().id = TREE;
            _timer = block.timestamp + TREE_TIME;
            Profile(msg.sender).addToPing{value: 0.1 ton, flag: 1}(_position);
            return;
        }
        if ((_owner.get() == pubkey) && (_content.get().id == PIPE)) {
            _timer = block.timestamp + TREE_TIME;
            _content.get().id = TREE;
            Profile(msg.sender).addToPing{value: 0.1 ton, flag: 1}(_position);
            return;
        }
        Profile(msg.sender).rejectBuild{value: 0.1 ton, flag: 1}(_position, TREE);
    }

    function takeMoney(uint256 pubkey) public minValue(0.5 ever) senderIs(GameLib.calculateProfileAddress(_code[m_ProfileCode], _fabric, pubkey, version)) {
        reCalculateKarma();
        if (_owner.hasValue() == true) {
            if (_owner.get() == pubkey) {
                Profile(msg.sender).takeKarmaFromTree{value: 0.1 ton, flag: 1}(_tree_balance, _position);
                _tree_balance = 0;
            }
        }
    }

    function buildPipe(uint256 pubkey) public minValue(0.5 ever) senderIs(GameLib.calculateProfileAddress(_code[m_ProfileCode], _fabric, pubkey, version)) {
        reCalculateKarma();
        if (_owner.hasValue() == false) {
            _owner = pubkey;
            _content.get().id = PIPE;
            _timer = block.timestamp + PIPE_TIME;
            Profile(msg.sender).addToPing{value: 0.1 ton, flag: 1}(_position);
            return;
        }
        Profile(msg.sender).rejectBuild{value: 0.1 ton, flag: 1}(_position, PIPE);
    }

    function reCalculateKarma() private accept {
        if (_timeupdate == 0) { return; }
        uint128 num = uint128(block.timestamp) - _timeupdate;
        num *= _tree_income;
        num /= 60;
        if (num == 0) { return; }
        _tree_balance += num;
        _timeupdate += num * 60 / _tree_income;
    }

    function ping(uint256 pubkey) public minValue(0.5 ever) senderIs(GameLib.calculateProfileAddress(_code[m_ProfileCode], _fabric, pubkey, version)) {
        reCalculateKarma();
        if (_owner.hasValue() == false) {
            Profile(msg.sender).deleteFromPingList(_position);
            return;
        }
        if (_owner.get() != pubkey) {
            Profile(msg.sender).deleteFromPingList(_position);
        }
        if (_owner.get() == pubkey) {
            if (_timer.hasValue() == false) {
                Profile(msg.sender).deleteFromPingList(_position);
                return;
            }
            if (block.timestamp >= _timer.get()) {
                _timeupdate = _timer.get();
                _timer = null;
                _tree_income = TREE_KARMA;
                TvmCell s1 = GameLib.composeForestStateInit(_code[m_ForestCode], _fabric, _position, version);
                new Forest  {
                    stateInit: s1, value: 10 ton, wid: 0, flag: 1
                }(_code[m_FieldCode], _code[m_ProfileCode], _code[m_AwardCode]);
                Position pos;
                pos = _position;
                pos.x += 1;
                Field(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, pos, version)).checkForest{value: 0.6 ton}(_position, _owner);
                pos.x -= 2;
                Field(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, pos, version)).checkForest{value: 0.6 ton}(_position, _owner);
                pos.x += 1;
                pos.y += 1;
                Field(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, pos, version)).checkForest{value: 0.6 ton}(_position, _owner);
                pos.y -= 2;
                Field(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, pos, version)).checkForest{value: 0.6 ton}(_position, _owner);
                reCalculateKarma();
            }
        }
    }

    function checkForest(Position pos, optional(uint256) owner) public view senderIs(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, pos, version)) accept {
        if (_owner.get() != owner.get()) { return; }
        Field(msg.sender).unionForest{value: 0.3 ton, flag: 1}(_position, _forest);
    }

    function unionForest(Position pos, optional(Position) forest) public view senderIs(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, pos, version)) accept {
        Forest(GameLib.calculateForestAddress(_code[m_ForestCode], _fabric, _forest.get(), version)).unionForest{value: 0.4 ton, flag: 1}(_position, forest);
    }

    //Fallback/Receive
    receive() external {
//        if (msg.sender == _systemcontract) {
//            _flag = false;
//        }
    }

    //Getters
      
    
    function getDetails() external view returns(Position position, optional(Building) content, optional(uint256) owner,  mapping(uint256 => bool) visiters) {
        return (_position, _content, _owner, _visiters);
    }
}
