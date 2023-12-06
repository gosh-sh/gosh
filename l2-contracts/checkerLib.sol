// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "proposal.sol";
import "indexwallet.sol";

struct BlockData {
    bytes data;
    uint256 hash;
}

struct TransactionPatch {
    RootData root;
    TransactionBatch data;
}

struct RootData {
    string name;
    string symbol;
    uint8 decimals;
    uint256 ethroot;
}

struct TransactionBatch {
    uint256 pubkey;
    uint128 value;
    uint256 hash;
}

struct ValidatorSet { 
    uint8 tag; 
    uint32 utime_since;
    uint32 utime_until;
    uint16 total;
    uint16 main;
    uint64 total_weight;
    mapping(uint16 => TvmSlice) vdict;
}

uint16 constant BATCH_SIZE = 3;

uint16 constant ERR_WRONG_SENDER = 100;
uint16 constant ERR_WRONG_HASH = 101;
uint16 constant ERR_NOT_READY = 102;

contract IRootToken {
    bool static __uninitialized;
    uint64 static __replay;
    string static name_;
    string static symbol_;
    uint8 static decimals_;
    uint256 static root_pubkey_;
    optional(address) static root_owner_;
    uint128 static total_supply_;
    uint128 static total_granted_;
    optional(TvmCell) static wallet_code_;
    address static checker_;
    uint256 static ethroot_;
    uint128 static burncount_;
    optional(address) static oldroot_;
    optional(address) static newroot_;
    address static receiver_;
    optional(address) static trusted_;
    bool static flag_;
    uint32 static money_timestamp_;

    constructor(string name, string symbol, uint8 decimals, uint256 root_pubkey, optional(address) root_owner, uint128 total_supply, address checker, uint256 eth_root, optional(address) oldroot, optional(address) newroot, address receiver, optional(address) trusted, TvmCell walletCode) functionID(0xa) {
    }
}

interface ARootToken {
    function  grantbatch(uint32 _answer_id, TransactionBatch[] transactions, uint128 a, uint128 b) external functionID(0x3f6);
}

library ProposalLib {
    function calculateProposalAddress(TvmCell code, uint256 hash, uint128 index, address checker) public returns(address) {
        TvmCell s1 = composeProposalStateInit(code, hash, index, checker);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function calculateRootAddress(TvmCell code, RootData root, uint256 pubkey, address receiver) public returns(address) {
        TvmCell s1 = composeRootStateInit(code, root.name, root.symbol, root.decimals, root.ethroot, pubkey, receiver);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeRootStateInit(TvmCell code, string name, string symbol, uint8 decimals, uint256 ethroot, uint256 pubkey, address receiver) public returns(TvmCell) {
        TvmCell s1 = tvm.buildStateInit({
            code: code,
            contr: IRootToken,
            varInit: {name_ : name, symbol_ : symbol, decimals_ : decimals, ethroot_ : ethroot, root_pubkey_: pubkey, root_owner_: null, receiver_: receiver, trusted_: null}
        });
        return s1;
    }
    
    function calculateIndexWalletAddress(TvmCell code, address checker, RootData root, uint256 pubkey) public returns(address) {
        TvmCell s1 = composeIndexWalletStateInit(code, checker, root, pubkey);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeIndexWalletStateInit(TvmCell code, address checker, RootData root, uint256 pubkey) public returns(TvmCell) {
        TvmCell IndexWalletcode = buildIndexWalletCode(code, pubkey);
        TvmCell s1 = tvm.buildStateInit({
            code: IndexWalletcode,
            contr: IndexWallet,
            varInit: {_checker: checker, _root: root}
        });
        return s1;
    }

    function composeProposalStateInit(TvmCell code, uint256 hash, uint128 index, address checker) public returns(TvmCell) {
        TvmCell Proposalcode = buildProposalCode(code, hash);
        TvmCell s1 = tvm.buildStateInit({
            code: Proposalcode,
            contr: Proposal,
            varInit: {_index: index, _checker: checker}
        });
        return s1;
    }

    function buildProposalCode(
        TvmCell originalCode,
        uint256 hash
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildIndexWalletCode(
        TvmCell originalCode,
        uint256 pubkey
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(pubkey);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
}