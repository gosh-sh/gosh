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
import "./smv/Interfaces/IFlexWallet.sol";
import "goshdao.sol";

contract Grant is Modifiers {
    string constant version = "6.2.0";
    
    string static _name;
    address static _goshdao;
    uint256[] _pubkeys;
    uint128[] _votes;
    uint128[] _grant;
    uint128 _indexwallet = 0;
    uint128 _indexGrant;
    address _systemcontract;
    string[] public _details;
    address[] public _tip3wallet;
    uint128[] public _balance;
    bool _readytovote = false;
    bool _ready = false;
    mapping(uint8 => TvmCell) _code;
    mapping(uint256 => MemberToken) _wallets;
    uint128 _timeofend;
    bool _inprocess = false;
    mapping (uint128 => mapping (uint256 => bool)) public _SortedForGrants;

    constructor(
        address pubaddr,
        address systemcontract,
        uint128[] grants,
        address[] tip3wallet,
        TvmCell WalletCode,
        uint128 index) onlyOwner {
        tvm.accept();
        _code[m_WalletCode] = WalletCode;
        _systemcontract = systemcontract;
        _tip3wallet = tip3wallet;
        _grant = grants;
        require(_tip3wallet.length <= 10, ERR_WRONG_NUMBER_MEMBER);
        require(_grant.length <= 10, ERR_WRONG_NUMBER_MEMBER);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
    }

    function setCandidates(address pubaddr, uint128 index, uint256[] pubkeys, string[] details, uint128 timeofend) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept {
        require(_ready == false, ERR_ALREADY_CONFIRMED);
        require(_readytovote == false, ERR_ALREADY_CONFIRMED);
        require(_votes.length == 0, ERR_ALREADY_CONFIRMED);
        _pubkeys = pubkeys;
        _votes = new uint128[](pubkeys.length);
        _details = details;
        GoshDao(_goshdao).askWallets{value: 0.3 ton, flag: 1}();
        _readytovote = true;
        _timeofend = timeofend;
    }

    function setWallets(mapping(uint256 => MemberToken) wallets) public senderIs(_goshdao) accept {
        _wallets = wallets;
    }

    function voteFromWallet(uint128 amount, uint128 indexCandidate, address pubaddr, uint128 index, string comment) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept {
        require(_timeofend <= block.timestamp, ERR_ALREADY_CONFIRMED);
        comment;
        (, uint256 keyaddr) = pubaddr.unpack();
        require(_wallets[keyaddr].count >= amount, ERR_ALREADY_CONFIRMED);
        _wallets[keyaddr].count -= amount;
        _votes[indexCandidate] += amount;
    }

    function sendTokens(address pubaddr, uint128 index) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept {
        require(_ready == true, ERR_ALREADY_CONFIRMED);
        require(_timeofend > block.timestamp, ERR_ALREADY_CONFIRMED);
    	AFlexWallet(_tip3wallet[_indexwallet]).details{value: 1 ton}(uint32(100));
        _indexwallet += 1;
    }

    function setBalance(
            string name, string symbol, uint8 decimals, uint128 balance,
            uint256 root_public_key, address root_address, uint256 wallet_pubkey,
            optional(address) owner_address,
            optional(uint256) lend_pubkey,
            lend_owner_array_record[] lend_owners,
            uint128 lend_balance,
            optional(BindInfo) binding,
            uint256 code_hash,
            uint16 code_depth,
            int8 workchain_id) public senderIs(_tip3wallet[_indexwallet - 1]) accept functionID(100) {
        name; symbol; decimals; root_public_key; root_address; wallet_pubkey; owner_address; lend_pubkey; lend_owners; lend_balance; binding; code_hash; code_depth; workchain_id;
        _balance[_indexwallet - 1] = balance;
    	if (_indexwallet < _tip3wallet.length) { 
            AFlexWallet(_tip3wallet[_indexwallet]).details{value: 1 ton}(uint32(100));
            _indexwallet += 1;
            return;
        }
        this.sortPubkeys{value: 0.1 ton, flag: 1}(0);
    } 

    function sortPubkeys(uint128 index) public senderIs(address(this)) accept {
        for (uint i = 0; i < BATCH_SIZE_TAG; i++){
            if (index + i >= _pubkeys.length) { 
                optional(uint128, mapping(uint256 => bool)) res = _SortedForGrants.max();
                (uint128 key, mapping(uint256 => bool) data) = res.get();
                this.sendTokensIn{value: 0.1 ton, flag: 1}(key, data.keys()); 
            }
            _SortedForGrants[_votes[i]][_pubkeys[i]] = true; 
        }
        this.sortPubkeys{value: 0.1 ton, flag: 1}(index + BATCH_SIZE_TAG);
    }

    function sendTokensIn(uint128 key, uint256[] keyspub) public senderIs(address(this)) accept {
        require(_ready == true, ERR_ALREADY_CONFIRMED);
        uint128 sum = 0;
        for (uint128 j = 0; j <= keyspub.length; j++) {
            if (_indexGrant + j >= _grant.length) { break; }
            sum += _grant[_indexGrant + j];
        }
        _indexGrant += uint128(keyspub.length);
        this.sendTokensFinal{value: 0.1 ton, flag: 1}(key, _SortedForGrants[key].keys(), 0, 0);
        if (_indexGrant >= _grant.length) { return; }
        optional(uint128, mapping(uint256 => bool)) res = _SortedForGrants.prev(key);
        if (res.hasValue() == false) { return; }
        (uint128 keyvote, mapping(uint256 => bool) data) = res.get();
        this.sendTokensIn{value: 0.1 ton, flag: 1}(keyvote, data.keys());
    }

    function sendTokensFinal(uint128 sum, uint256[] keyspub, uint128 indexwallet, uint128 index) public view senderIs(address(this)) accept {
        if (indexwallet >= _tip3wallet.length) { return; }
        for (uint128 j = 0; j < 3; j++){
            if (index + j >= keyspub.length) { break; }
            Tip3Creds cred = Tip3Creds(keyspub[index + j], null);
    	    AFlexWallet(_tip3wallet[indexwallet]).transferToRecipient{value: 1 ton, flag: 1}(uint32(0), null, cred, _balance[indexwallet] / 100 * sum / uint128(keyspub.length), 4.5 ton, 1 ton, true, uint128(0), null);
            if (j == 2) { 
                this.sendTokensFinal{value: 0.1 ton, flag: 1}(sum, keyspub, indexwallet, index + j + 1);
            }
        }
        this.sendTokensFinal{value: 0.1 ton, flag: 1}(sum, keyspub, indexwallet + 1, 0);
    }
    
    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public {
        require(_ready == false, ERR_ALREADY_CONFIRMED);
        require(_readytovote == false, ERR_ALREADY_CONFIRMED);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        selfdestruct(_systemcontract);
    }
    
    //Getters    
    function getDetails() external view returns(uint256[], uint128[], string, bool) {
        return (_pubkeys, _grant, _name, _ready);
    }

    function getVersion() external pure returns(string, string) {
        return ("grant", version);
    }
}