// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
import "../field.sol";
import "../profile.sol";
import "../award.sol";
import "../forest.sol";

library GameLib {
    string constant versionLib = "0.0.1";

    function calculateFieldAddress(TvmCell code, address fabric, Position position, string version) public returns(address) {
        TvmCell s1 = composeFieldStateInit(code, fabric, position, version);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeFieldStateInit(TvmCell code, address fabric, Position position, string version) public returns(TvmCell) {
        TvmCell s1 = tvm.buildStateInit({
            code: buildFieldCode(code, version),
            contr: Field,
            varInit: {_fabric: fabric, _position : position}
        });
        return s1;
    }

    function calculateForestAddress(TvmCell code, address fabric, Position position, string version) public returns(address) {
        TvmCell s1 = composeForestStateInit(code, fabric, position, version);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeForestStateInit(TvmCell code, address fabric, Position position, string version) public returns(TvmCell) {
        TvmCell s1 = tvm.buildStateInit({
            code: buildFieldCode(code, version),
            contr: Forest,
            varInit: {_fabric: fabric, _position : position}
        });
        return s1;
    }

    function buildFieldCode(
        TvmCell originalCode,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildForestCode(
        TvmCell originalCode,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function calculateProfileAddress(TvmCell code, address fabric, uint256 pubkey, string version) public returns(address) {
        TvmCell s1 = composeProfileStateInit(code, fabric, pubkey, version);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeProfileStateInit(TvmCell code, address fabric, uint256 pubkey, string version) public returns(TvmCell) {
        TvmCell s1 = tvm.buildStateInit({
            code: buildProfileCode(code, version),
            contr: Profile,
            pubkey: pubkey,
            varInit: {_fabric : fabric}
        });
        return s1;
    }

    function buildProfileCode(
        TvmCell originalCode,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function calculateAwardAddress(TvmCell code, address fabric, uint128 index, string version) public returns(address) {
        TvmCell s1 = composeAwardStateInit(code, fabric, index, version);
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function composeAwardStateInit(TvmCell code, address fabric, uint128 index, string version) public returns(TvmCell) {
        TvmCell s1 = tvm.buildStateInit({
            code: buildAwardCode(code, version),
            contr: Award,
            varInit: {_fabric : fabric, _index : index}
        });
        return s1;
    }

    function buildAwardCode(
        TvmCell originalCode,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
}
