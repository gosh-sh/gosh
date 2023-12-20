// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "checkerLib.sol";
import "checker.sol";

contract Proposal_Test {
    
    string constant _version = "1.0.0";

    modifier onlyOwner {
        require (msg.pubkey() == tvm.pubkey(), ERR_WRONG_SENDER) ;
        _;
    }

    modifier accept {
        tvm.accept();
        _;
    }

    modifier senderIs(address sender) {
        require(msg.sender == sender, ERR_WRONG_SENDER);
        _;
    }

    uint256 _hash;
    uint256 _newhash;
    address static  _checker;
    TransactionPatch[] _transactions;
    uint128 static _index;

    mapping(uint16 => uint256) _vdict;
    
    constructor(
        uint256 hash,
        uint256 newhash,
        TransactionPatch[] transactions
    ) accept {
        _hash = hash;
        _newhash = newhash;
        require ( _checker == msg.sender, ERR_WRONG_SENDER);
        _transactions = transactions;
//        (optional(TvmCell) data) = tvm.rawConfigParam(34);
//        ValidatorSet vset = data.get().toSlice().load(ValidatorSet);
//        _vdict = vset.vdict;
//        if (data.hasValue() == false) { selfdestruct( _checker); }
    }

    function setvdict(uint256 key) public accept {
        _vdict[0] = key;
    }

    function setVote(uint16 id) public {
        if (_vdict.exists(id)) {
//            TvmSlice data = _vdict[id];
//            data.skip(4 * 8);
            uint256 pub = _vdict[id];
            require(pub == msg.pubkey(), ERR_WRONG_SENDER);
            tvm.accept();
            optional(uint256) deleted = _vdict.getDel(id);
            deleted;
            if (_vdict.empty()) {
                Checker( _checker).setNewHash{value: 0.1 ton, flag: 1}(_hash, _newhash, _index, _transactions);
            }
        }
    }

    function destroy() public senderIs( _checker) accept {
        selfdestruct( _checker);
    }

    
    //Fallback/Receive
    receive() external {
    }
    
    onBounce(TvmSlice body) pure external {
        body;
    }
    
    fallback() external {
    }

    //Getter 
    function getDetails() external view returns(uint256 hash, uint256 newhash, TransactionPatch[] transactions, uint128 index, uint128 need){
        return (_hash, _newhash, _transactions, _index, 0);
    }

    function getVersion() external pure returns(string, string) {
        return ("proposal_test", _version);
    }

    function getSet() external view returns (mapping(uint16 => uint256)) {
/*        uint16 key;
        optional(uint16, TvmSlice) res = _vdict.next(key);
        mapping(uint16 => uint256) result;
        while (res.hasValue()) {
            (uint16 newkey, TvmSlice data) = res.get();
            data.skip(4 * 8);
            uint256 pub = data.load(uint256);
            result[newkey] = pub;
            res = _vdict.next(newkey);
        }*/
        return _vdict;
    }

    
    function getValidatorId(uint256 pubkey) external pure returns (optional(uint16)) {
        pubkey;
/*        uint16 key;
        optional(uint16) result;
        optional(uint16, TvmSlice) res = _vdict.next(key);
        while (res.hasValue()) {
            (uint16 newkey, TvmSlice data) = res.get();
            data.skip(4 * 8);
            uint256 pub = data.load(uint256);
            if (pubkey == pub) {
                result = newkey;
                return result;
            }
        }
        return result;*/
        return 0;
    }
}
