// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

import "../AchiNakiValidatorNodeWallet.sol";
import "../ValidatorEpocheContract.sol";

library ValidatorLib {
    string constant versionLib = "1.0.0";

    function calculateValidatorWalletAddress(TvmCell code, address root, uint256 pubkey) public returns(address) {
        TvmCell s1 = composeValidatorWalletStateInit(code, root, pubkey);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeValidatorWalletStateInit(TvmCell code, address root, uint256 pubkey) public returns(TvmCell) {
        return tvm.buildStateInit({
            code: buildValidatorWalletCode(code),
            contr: AchiNakiValidatorNodeWallet,
            pubkey: pubkey,
            varInit: { _pubkey : pubkey, _root : root }
        });
    }

    function buildValidatorWalletCode(
        TvmCell originalCode
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(versionLib);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function calculateValidatorEpocheAddress(TvmCell code, address root, uint256 pubkey, uint64 SeqNoStart) public returns(address) {
        TvmCell s1 = composeValidatorEpocheStateInit(code, root, pubkey, SeqNoStart);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeValidatorEpocheStateInit(TvmCell code, address root, uint256 pubkey, uint64 SeqNoStart) public returns(TvmCell) {
        return tvm.buildStateInit({
            code: buildValidatorEpocheCode(code, root),
            contr: ValidatorEpoche,
            pubkey: pubkey,
            varInit: { _pubkey : pubkey, _SeqNoStart : SeqNoStart }
        });
    }

    function buildValidatorEpocheCode(
        TvmCell originalCode,
        address root
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(versionLib);
        b.store(root);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
}
