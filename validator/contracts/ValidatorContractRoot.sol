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

import "./modifiers/modifiers.sol";
import "./libraries/ValidatorLib.sol";
import "./AchiNakiValidatorNodeWallet.sol";
import "./ValidatorEpocheContract.sol";

interface Giver {
    function askMoney(uint128 value) external;
}

contract ValidatorContractRoot is Modifiers {
    string constant version = "1.0.0";

    mapping(uint8 => TvmCell) _code;
    uint128 _minStake;
    uint64 _epocheDuration = 1000;
    uint64 _epocheCliff = 1000;
    uint64 _waitStep = 1000;
    address _giver;

    uint128 _numberOfActiveValidators = 0;

    constructor (
        TvmCell validatorEpocheCode,
        TvmCell achiNakiValidatorNodeWalletCode,
        uint128 minStake,
        address giver
    ) {
        _code[m_ValidatorEpocheCode] = validatorEpocheCode;
        _code[m_AchiNakiValidatorNodeWalletCode] = achiNakiValidatorNodeWalletCode;
        _minStake = minStake;
        _giver = giver;
    }

    function askMoney(uint256 pubkey, uint128 value) public view senderIs(ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey)) {
        msg.sender.transfer(value);
    }

    function getMoney() private view {
        if (address(this).balance > 1000000 ton) { return; }
        Giver(_giver).askMoney{value : 0.2 ton, flag: 1}(1000000 ton);
    }

    function setConfig(uint128 minStake, uint64 epocheDuration, uint64 epocheCliff, uint64 waitStep) public onlyOwnerPubkey(tvm.pubkey()) accept {
        getMoney();
        _minStake = minStake;
        _epocheDuration = epocheDuration;
        _epocheCliff = epocheCliff;
        _waitStep = waitStep;
    }

    function deployAchiNakiValidatorNodeWallet(uint256 pubkey) public view accept {
        getMoney();
        TvmCell data = ValidatorLib.composeValidatorWalletStateInit(_code[m_AchiNakiValidatorNodeWalletCode], address(this), pubkey);
        new AchiNakiValidatorNodeWallet {stateInit: data, value: FEE_DEPLOY_VALIDATOR_WALLET, wid: 0, flag: 1}(_code[m_ValidatorEpocheCode]);
    }

    function deployValidatorContract(uint256 pubkey, varUint32 stake, bytes[48] bls_pubkey) private view {
        uint64 SeqNoStart = block.seqno + _epocheCliff; 
        uint64 SeqNoFinish = SeqNoStart + _epocheDuration; 
        TvmCell data = ValidatorLib.composeValidatorEpocheStateInit(_code[m_ValidatorEpocheCode], address(this), pubkey, SeqNoStart);
        mapping(uint32 => varUint32) data_cur;
        data_cur[CURRENCIES_ID] = stake;
        new ValidatorEpoche {
            stateInit: data, 
            value: FEE_DEPLOY_VALIDATOR_EPOCHE_WALLET, 
            wid: 0, 
            flag: 1
        } (SeqNoFinish, _waitStep, ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey), TYPE_VALIDATOR, bls_pubkey, _code[m_AchiNakiValidatorNodeWalletCode]);
        address wallet = ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey);
        AchiNakiValidatorNodeWallet(wallet).setLockStake{value: 0.1 ton, currencies: data_cur, flag: 1}(SeqNoStart, SeqNoFinish, stake);
    }

    function increaseActiveValidatorNumber(uint256 pubkey, uint64 seqNoStart) public internalMsg senderIs(ValidatorLib.calculateValidatorEpocheAddress(_code[m_ValidatorEpocheCode], address(this), pubkey, seqNoStart)) accept {
        getMoney();
        _numberOfActiveValidators += 1;
    }

    function decreaseActiveValidatorNumber(uint256 pubkey, uint64 seqNoStart, uint64 seqNoFinish, bool isSlash) public internalMsg senderIs(ValidatorLib.calculateValidatorEpocheAddress(_code[m_ValidatorEpocheCode], address(this), pubkey, seqNoStart)) accept {
        getMoney();
        _numberOfActiveValidators -= 1;
        if (isSlash == false) {
            address wallet = ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey);
            AchiNakiValidatorNodeWallet(wallet).unlockStake{value: 0.2 ton, flag: 1}(seqNoStart, seqNoFinish);
        }
    }

    function receiveValidatorRequestWithStakeFromWallet(uint256 pubkey, bytes[48] bls_pubkey) public view internalMsg minValue(15 ton) senderIs(ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey)) accept {
        if (msg.currencies[CURRENCIES_ID] < _minStake) {
            msg.sender.transfer({value: msg.value - 0.05 ton, currencies: msg.currencies, flag: 1});
            return;
        }
        deployValidatorContract(pubkey, msg.currencies[CURRENCIES_ID], bls_pubkey);
    } 

    function setNewCode(uint8 id, TvmCell code) public onlyOwner accept saveMsg { 
        _code[id] = code;
    }

    function updateCode(TvmCell newcode, TvmCell cell) public onlyOwner accept saveMsg {
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
        onCodeUpgrade(cell);
    }

    function onCodeUpgrade(TvmCell cell) private pure {
    }

/*
    function receiveValidatorRequestWithStake(uint256 pubkey, uint256 stake) private view {
        deployValidatorContract(pubkey, stake);
        return;
    } 
*/
    
    //Fallback/Receive
    receive() external {
/*
        if ((address(this).balance <= 1000 ton) || (msg.currencies[CURRENCIES_ID] < _minStake)) {
            require(msg.value > 0.05 ton, ERR_LOW_VALUE);
            msg.sender.transfer({value: msg.value - 0.05 ton, currencies: msg.currencies, flag: 1});
            return;
        }
        receiveValidatorRequestWithStake(tvm.pubkey(), msg.currencies[CURRENCIES_ID]);
*/
    }


    //Getters
    function getAchiNakiValidatorNodeWalletAddress(uint256 pubkey) external view returns(address){
        return ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey);
    }
    
    function getValidatorEpocheAddress(uint256 pubkey, uint64 SeqNoStart) external view returns(address){
        return ValidatorLib.calculateValidatorEpocheAddress(_code[m_ValidatorEpocheCode] ,address(this), pubkey, SeqNoStart);
    }

    function getDetails() external view returns(uint128 minStake, uint128 numberOfActiveValidators) {
        return (_minStake, _numberOfActiveValidators);
    }
}
