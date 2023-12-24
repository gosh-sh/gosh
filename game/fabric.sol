// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./libraries/GameLib.sol";
import "./profile.sol";
import "./constants.sol";
import "./award.sol";

/* System contract of Gosh version*/
contract Fabric is Constants {
    string constant version = "0.0.1";

    mapping(uint8 => TvmCell) public _code;

    constructor(mapping(uint8 => TvmCell) code) {
        tvm.accept();
        _code = code;
    }

    function increaseBalance(uint256 pubkey) public view senderIs(GameLib.calculateProfileAddress(_code[m_ProfileCode], this, pubkey, version)) accept {
        msg.sender.transfer(1000 ever);
    }

    function deployAwards() public view onlyOwner {
        this.deployAwardsIn{value: 0.1 ever, flag: 1}(0);
    }

    function deployAwardsIn(uint128 index) public view senderIs(this) {
        if (index < AWARD_NUM) {
            new Award {
                stateInit: GameLib.composeAwardStateInit(_code[m_AwardCode], this, index, version), 
                value: 50 ton, 
                wid: 0, 
                flag: 1
            }(_code[m_FieldCode], _code[m_ProfileCode]);
        }
        else { return; }
        this.deployAwardsIn{value: 0.1 ever, flag: 1}(index + 1);
    }

    function deployNewProfile(uint256 pubkey) public view {
        new Profile {
            stateInit: GameLib.composeProfileStateInit(_code[m_ProfileCode], this, pubkey, version), 
            value: 100 ton, 
            wid: 0, 
            flag: 1
        }(_code[m_FieldCode], _code[m_ProfileCode], _code[m_AwardCode]);
        return;
    }

    function setCode(TvmCell code, uint8 id) public  onlyOwner accept {
        _code[id] = code;
    }

    function getAwardAddress(uint128 index) external view returns(address) {
        return GameLib.calculateAwardAddress(_code[m_AwardCode], this, index, version);
    }

    function getFieldAddress(Position position) external view returns(address) {
        return GameLib.calculateFieldAddress(_code[m_FieldCode], this, position, version);
    }

    function getProfileAddress(uint256 pubkey) external view returns(address) {
        return GameLib.calculateProfileAddress(_code[m_ProfileCode], this, pubkey, version);
    }

    //Upgrade
    function updateCode(TvmCell newcode, TvmCell cell) public onlyOwner accept saveMsg {
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
        onCodeUpgrade(cell);
    }

    function onCodeUpgrade(TvmCell cell) private pure {
    }
}
