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

import "./libraries/GameLib.sol";
import "./constants.sol";
import "./field.sol";
import "./fabric.sol";
import "./award.sol";

contract Profile is Constants {
    string constant version = "0.0.1";

    address static _fabric;

    Position _position;
    uint128 _karma = BASE_KARMA;
    uint128 _karma_income = BASE_INCOME;
    uint128 _timeupdate = uint128(block.timestamp);

    mapping(uint8 => TvmCell) _code;
    mapping(uint8 => uint128) _awards;

    mapping(uint256 => Position) _needToPing;

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
        rnd.shuffle();
        _position = Position(rnd.next(RANGE_SPAWN), rnd.next(RANGE_SPAWN));
    }

    function increaseBalance() public view accept onlyOwner {
        require(address(this).balance <= 50 ever, ERR_LOW_BALANCE);
        Fabric(_fabric).increaseBalance{value: 0.1 ton, flag: 1}(tvm.pubkey());
    }

    function nextStep (Position my_pos, uint8 direction) public accept onlyOwner {
        require(my_pos.x == _position.x, ERR_WRONG_POSITION);
        require(my_pos.y == _position.y, ERR_WRONG_POSITION);
        require(address(this).balance >= 15 ever, ERR_LOW_BALANCE);
        reCalculateKarma();
        require(_karma >= STEP_KARMA, ERR_NOT_ENOUGH_KARMA);
        _karma -= STEP_KARMA;
        if (direction == LEFT) {
            TvmCell s1 = GameLib.composeFieldStateInit(_code[m_FieldCode], _fabric, Position(_position.x - 1, _position.y), version);
            new Field {
                stateInit: s1, value: 10 ton, wid: 0, flag: 1
            }(_code[m_FieldCode], _code[m_ProfileCode], _code[m_AwardCode], _code[m_ForestCode]);
            _position.x -= 1;
            return;
        }
        if (direction == RIGHT) {
            TvmCell s1 = GameLib.composeFieldStateInit(_code[m_FieldCode], _fabric, Position(_position.x + 1, _position.y), version);
            new Field {
                stateInit: s1, value: 10 ton, wid: 0, flag: 1
            }(_code[m_FieldCode], _code[m_ProfileCode], _code[m_AwardCode], _code[m_ForestCode]);
            _position.x += 1;
            return;
        }
        if (direction == FORWARD) {
            TvmCell s1 = GameLib.composeFieldStateInit(_code[m_FieldCode], _fabric, Position(_position.x, _position.y + 1), version);
            new Field {
                stateInit: s1, value: 10 ton, wid: 0, flag: 1
            }(_code[m_FieldCode], _code[m_ProfileCode], _code[m_AwardCode], _code[m_ForestCode]);
            _position.y += 1;
            return;
        }
        if (direction == BACK) {
            TvmCell s1 = GameLib.composeFieldStateInit(_code[m_FieldCode], _fabric, Position(_position.x, _position.y - 1), version);
            new Field {
                stateInit: s1, value: 10 ton, wid: 0, flag: 1
            }(_code[m_FieldCode], _code[m_ProfileCode], _code[m_AwardCode], _code[m_ForestCode]);
            _position.y -= 1;
            return;
        }
    }

    function dig() public accept onlyOwner  {
        reCalculateKarma();
        Field(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, _position, version)).dig{value: 0.6 ton}(tvm.pubkey());
    }

    function getAward(uint128 index, uint8 id) public senderIs(GameLib.calculateAwardAddress(_code[m_AwardCode], _fabric, index, version)) accept {
        _awards[id] += 1;
        return;
    }

    function takeKarma() public onlyOwner accept {
        reCalculateKarma();
        Field(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, _position, version)).takeMoney{value: 0.6 ton}(tvm.pubkey());
    }

    function buildTree() public onlyOwner accept {
        reCalculateKarma();
        require(_karma >= TREE_PRICE, ERR_LOW_BALANCE);
        _karma -= TREE_PRICE;
        Field(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, _position, version)).buildTree{value: 0.6 ton}(tvm.pubkey());
    }

    function reCalculateKarma() private accept {
        uint128 num = uint128(block.timestamp) - _timeupdate;
        num *= _karma_income;
        num /= 60;
        if (num == 0) { return; }
        _karma += num;
        _timeupdate += num * 60 / _karma_income;
    }

    function addToPing(Position position) public senderIs(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, position, version)) accept {
        TvmBuilder b;
        b.store(position);
        _needToPing[tvm.hash(b.toCell())] = position;
    }

    function rejectBuild(Position position, uint128 id) public senderIs(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, position, version)) accept  {
        if (id == TREE) {
            _karma += TREE_PRICE;
            return;
        }
        if (id == PIPE) {
            _karma += PIPE_PRICE;
            return;
        }
    }

    function ping(uint256[] tvmhash) public view onlyOwner accept {
        this.pingIn{value: 0.1 ton, flag: 1}(tvmhash, 0);
    }

    function pingIn(uint256[] tvmhash, uint128 index) public view senderIs(this) accept {
        Field(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, _needToPing[tvmhash[index]], version)).ping{value: 0.6 ton}(tvm.pubkey());
        if (index + 1 >= tvmhash.length) { return; }
        this.pingIn{value: 0.1 ton, flag: 1}(tvmhash, index + 1);
    } 

    function deleteFromPingList(Position position) public senderIs(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, position, version)) accept  {
        TvmBuilder b;
        b.store(position);
        delete _needToPing[tvm.hash(b.toCell())];
    }

    function takeKarmaFromTree(uint128 karma, Position position) public senderIs(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, position, version)) accept  {
        _karma += karma;
    }

    function buildFinished(Position position, Building content, uint32 timer) public senderIs(GameLib.calculateFieldAddress(_code[m_FieldCode], _fabric, position, version)) accept  {
        TvmBuilder b;
        b.store(position);
        delete _needToPing[tvm.hash(b.toCell())];
        if (content.id == TREE) {
            reCalculateKarma();
            _karma += (block.timestamp - timer) * TREE_KARMA / 3600;
            _karma_income += TREE_KARMA;
        }
    }

    //Fallback/Receive
    receive() external {
//        if (msg.sender == _systemcontract) {
//            _flag = false;
//        }
    }

    //Getters
      
    
    function getDetails() external view returns(Position position, uint128 karma, uint128 karma_income, mapping(uint8 => uint128) awards) {
        return (_position, _karma, _karma_income, _awards);
    }
}
