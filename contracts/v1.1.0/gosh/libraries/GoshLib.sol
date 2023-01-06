// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;
import "../goshwallet.sol";

library GoshLib {
    string constant versionLib = "1.1.0";

    function buildSignatureCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(version);
        b.store(repo);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildWalletCode(
        TvmCell originalCode,
        address pubaddr,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(pubaddr);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildRepositoryCode(
        TvmCell originalCode,
        address goshaddr,
        address dao,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(goshaddr);
        b.store(dao);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildTreeCode(
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
    
    function buildSnapshotCode(
        TvmCell originalCode,
        address repo,
        string branch,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(branch);
        b.store(version);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }

    function buildCommitCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildDiffCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildTagCode(
        TvmCell originalCode,
        address repo,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(repo);
        b.store(version);
        uint256 hash = tvm.hash(b.toCell());
        delete b;
        b.store(hash);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
    
    function buildProfileIndexCode(
        TvmCell originalCode,
        uint256 pubkey,
        address versioncontroller,
        string version
    ) public returns (TvmCell) {
        TvmBuilder b;
        b.store(pubkey);
        b.store(versioncontroller);
        b.store(version);
        return tvm.setCodeSalt(originalCode, b.toCell());
    }
}
