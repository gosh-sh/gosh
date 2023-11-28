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
    uint128[] _grants;
    uint128 _balance;
    address _systemcontract;
    address _tip3wallet;
    bool _readytovote = false;
    bool _ready = false;
    mapping(uint8 => TvmCell) _code;
    mapping(uint256 => MemberToken) _wallets;

    constructor(
        address pubaddr,
        address systemcontract,
        uint128[] grants,
        address tip3wallet,
        TvmCell WalletCode,
        uint128 index) onlyOwner {
        tvm.accept();
        _code[m_WalletCode] = WalletCode;
        _systemcontract = systemcontract;
        _tip3wallet = tip3wallet;
        _grants = grants;
        require(_grants.length <= 10, ERR_WRONG_NUMBER_MEMBER);
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
    }

    function setCandidates(address pubaddr, uint128 index, uint256[] pubkeys) public senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept {
        require(_ready == false, ERR_ALREADY_CONFIRMED);
        require(_readytovote == false, ERR_ALREADY_CONFIRMED);
        require(_votes.length == 0, ERR_ALREADY_CONFIRMED);
        _pubkeys = pubkeys;
        _votes = new uint128[](pubkeys.length);
        GoshDao(_goshdao).askWallets{value: 0.3 ton, flag: 1}();
        _readytovote = true;
    }

    function setWallets(mapping(uint256 => MemberToken) wallets) public senderIs(_goshdao) accept {
        _wallets = wallets;
    }

    function sendTokens(address pubaddr, uint128 index) public view senderIs(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index)) accept {
        require(_ready == true, ERR_ALREADY_CONFIRMED);
    	AFlexWallet(_tip3wallet).details{value: 1 ton}(uint32(100));
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
            int8 workchain_id) public senderIs(_tip3wallet) accept functionID(100) {
        name; symbol; decimals; root_public_key; root_address; wallet_pubkey; owner_address; lend_pubkey; lend_owners; lend_balance; binding; code_hash; code_depth; workchain_id;
        _balance = balance;
        this.sendTokensIn{value: 0.1 ton, flag: 1}(0);
    } 

    function sendTokensIn(uint128 index) public view senderIs(address(this)) accept {
        require(_ready == true, ERR_ALREADY_CONFIRMED);
        if (index >= _grants.length) { return; }
        Tip3Creds cred = Tip3Creds(_pubkeys[index], null);
    	AFlexWallet(_tip3wallet).transferToRecipient{value: 1 ton, flag: 1}(uint32(0), null, cred, _balance / 100 * _grants[index], 4.5 ton, 1 ton, true, uint128(0), null);
        this.sendTokensIn{value: 0.1 ton, flag: 1}(index + 1);
    }
    
    //Selfdestruct
    function destroy(address pubaddr, uint128 index) public {
        require(GoshLib.calculateWalletAddress(_code[m_WalletCode], _systemcontract, _goshdao, pubaddr, index) == msg.sender, ERR_SENDER_NO_ALLOWED);
        selfdestruct(_systemcontract);
    }
    
    //Getters    
    function getDetails() external view returns(uint256[], uint128[], string, bool) {
        return (_pubkeys, _grants, _name, _ready);
    }

    function getVersion() external pure returns(string, string) {
        return ("grant", version);
    }
}
