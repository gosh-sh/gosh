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

contract ValidatorContractRoot is Modifiers {
    string constant version = "1.0.0";

    mapping(uint8 => TvmCell) _code;
    uint128 _minStake;
    uint64 _epocheDuration;

    uint128 _numberOfActiveValidators = 0;

    constructor (
        TvmCell validatorEpocheCode,
        TvmCell achiNakiValidatorNodeWalletCode,
        uint128 minStake
    ) {
        _code[m_ValidatorEpocheCode] = validatorEpocheCode;
        _code[m_AchiNakiValidatorNodeWalletCode] = achiNakiValidatorNodeWalletCode;
        _minStake = minStake;
    }

    function setConfig(uint128 minStake, uint64 epocheDuration) public onlyOwnerPubkey(tvm.pubkey()) accept {
        _minStake = minStake;
        _epocheDuration = epocheDuration;
    }

    function deployAchiNakiValidatorNodeWallet(uint256 pubkey) public view minValue(25 ton) accept {
        TvmCell data = ValidatorLib.composeValidatorWalletStateInit(_code[m_AchiNakiValidatorNodeWalletCode], address(this), pubkey);
        new AchiNakiValidatorNodeWallet {stateInit: data, value: FEE_DEPLOY_VALIDATOR_WALLET, wid: 0, flag: 1}(address(this), _code[m_ValidatorEpocheCode]);
    }

    function deployValidatorContract(uint256 pubkey, varUint32 stake, bytes[48] bls_pubkey) private view {
        uint64 SeqNoStart = block.logicaltime + 1000; //Change to SeqNo
        uint64 SeqNoFinish = SeqNoStart + _epocheDuration; //Change to SeqNo
        TvmCell data = ValidatorLib.composeValidatorEpocheStateInit(_code[m_ValidatorEpocheCode], address(this), pubkey, SeqNoStart);
        mapping(uint32 => varUint32) data_cur;
        data_cur[CURRENCIES_ID] = stake;
        new ValidatorEpoche {
            stateInit: data, 
            value: FEE_DEPLOY_VALIDATOR_EPOCHE_WALLET, 
            wid: 0, 
            flag: 1
        } (address(this), SeqNoFinish, ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey), TYPE_VALIDATOR, bls_pubkey, _code[m_AchiNakiValidatorNodeWalletCode]);
        address wallet = ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey);
        AchiNakiValidatorNodeWallet(wallet).setLockStake{value: 0.1 ton, currencies: data_cur, flag: 1}(SeqNoStart, SeqNoFinish, stake);
    }

    function increaseActiveValidatorNumber(uint256 pubkey, uint64 seqNoStart) public internalMsg senderIs(ValidatorLib.calculateValidatorEpocheAddress(_code[m_ValidatorEpocheCode], address(this), pubkey, seqNoStart)) accept {
        _numberOfActiveValidators += 1;
    }

    function decreaseActiveValidatorNumber(uint256 pubkey, uint64 seqNoStart, uint64 seqNoFinish) public internalMsg senderIs(ValidatorLib.calculateValidatorEpocheAddress(_code[m_ValidatorEpocheCode], address(this), pubkey, seqNoStart)) accept {
        _numberOfActiveValidators -= 1;
        address wallet = ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey);
        AchiNakiValidatorNodeWallet(wallet).unlockStake{value: 0.2 ton, flag: 1}(seqNoStart, seqNoFinish);
    }

    function receiveValidatorRequestWithStakeFromWallet(uint256 pubkey, bytes[48] bls_pubkey) public view internalMsg minValue(15 ton) senderIs(ValidatorLib.calculateValidatorWalletAddress(_code[m_AchiNakiValidatorNodeWalletCode] ,address(this), pubkey)) accept {
        if (msg.currencies[CURRENCIES_ID] < _minStake) {
            msg.sender.transfer({value: msg.value - 0.05 ton, currencies: msg.currencies, flag: 1});
            return;
        }
        deployValidatorContract(pubkey, msg.currencies[CURRENCIES_ID], bls_pubkey);
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
