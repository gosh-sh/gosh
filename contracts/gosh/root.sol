// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.65.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import "./modifiers/modifiers.sol";
import "gosh.sol";

struct GoshV {
    string Key;
    TvmCell Value;
}
/* Root contract of goshroot */
contract Root is Modifiers {
    string constant _version = "1.0.0";

    mapping(uint256 => GoshV) _GoshCode;

    constructor() public onlyOwner {
        require(tvm.pubkey() != 0, ERR_NEED_PUBKEY);
        tvm.accept();
    }

    function deployGosh(string version) public onlyOwner accept saveMsg {
        require(_GoshCode.exists(tvm.hash(version)), ERR_GOSH_BAD_VERSION);
        TvmCell s1 = tvm.buildStateInit({
            code: _GoshCode[tvm.hash(version)].Value,
            contr: GoshRoot,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        new GoshRoot {stateInit: s1, value: FEE_DEPLOY_GOSH, wid: 0, flag: 1}();
    }

    function setGoshCode(TvmCell code, string version) public  onlyOwner accept {       
        require(_GoshCode.exists(tvm.hash(version)) == false, ERR_GOSH_BAD_VERSION);
        _GoshCode[tvm.hash(version)] = GoshV(version, code);
    }
    
    function checkUpdateRepo2(string name, string namedao, string version, AddrVersion prev, address answer) public view {
        require(_GoshCode.exists(tvm.hash(version)), ERR_GOSH_BAD_VERSION);
        require(_GoshCode.exists(tvm.hash(prev.version)), ERR_GOSH_BAD_VERSION);
        TvmCell s1 = tvm.buildStateInit({
            code: _GoshCode[tvm.hash(version)].Value,
            contr: GoshRoot,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        address addr = address.makeAddrStd(0, tvm.hash(s1));
        require(addr == msg.sender, ERR_SENDER_NO_ALLOWED);
        tvm.accept();
        s1 = tvm.buildStateInit({
            code: _GoshCode[tvm.hash(prev.version)].Value,
            contr: GoshRoot,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        addr = address.makeAddrStd(0, tvm.hash(s1));
        GoshRoot(addr).checkUpdateRepo3{value : 0.15 ton, flag: 1}(name, namedao, prev, answer);
    }
    
    function updateCode(TvmCell newcode, TvmCell cell) public onlyOwner accept saveMsg {
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
        onCodeUpgrade(cell);
    }

    function onCodeUpgrade(TvmCell cell) private pure {
    }

    //Getters
    function getGoshCode(string version) external view returns(GoshV) {
        require(_GoshCode.exists(tvm.hash(version)), ERR_GOSH_BAD_VERSION);
        return _GoshCode[tvm.hash(version)];
    }

    function getGoshAddr(string version) external view returns(address) {
        require(_GoshCode.exists(tvm.hash(version)), ERR_GOSH_BAD_VERSION);
        TvmCell s1 = tvm.buildStateInit({
            code: _GoshCode[tvm.hash(version)].Value,
            contr: GoshRoot,
            pubkey: tvm.pubkey(),
            varInit: {}
        });
        return address.makeAddrStd(0, tvm.hash(s1));
    }

    function getVersions() external view returns(mapping(uint256 => GoshV)) {
        return _GoshCode;
    }

    function getVersion() external pure returns(string) {
        return _version;
    }
}
