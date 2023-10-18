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

interface IRootContract {
    function grantTrusted(
        uint256 pubkey,
        uint128 value
    ) external functionID(0x400);
}

contract Trusted is Modifiers {

    string constant _version = "6.2.0";

    mapping(uint256 => bool) _access;

    TvmCell _rootCode;
    address _receiver;
    
    constructor(
    ) accept {
    }

    function addAccess(address system) public onlyOwner accept {
        TvmBuilder b;
        b.store(system);
        uint256 hash = tvm.hash(b.toCell());
        _access[hash] = true;
    }

    function deleteAccess(address system) public onlyOwner accept {
        TvmBuilder b;
        b.store(system);
        uint256 hash = tvm.hash(b.toCell());
        delete _access[hash];
    }

    function setRootCode(TvmCell code) public onlyOwner accept {
        _rootCode = code;
    }

    function setReceiver(address receiver) public onlyOwner accept {
        _receiver = receiver;
    }

    function sendTokenToRoot(uint256 pubkey, uint128 value, RootData root)  public view  {
        TvmBuilder b;
        b.store(msg.sender);
        uint256 hash = tvm.hash(b.toCell());
        require(_access.exists(hash), ERR_SENDER_NO_ALLOWED);
        IRootContract(GoshLib.calculateRootAddress(_rootCode, root, tvm.pubkey(), _receiver)).grantTrusted{value: 0.1 ton, flag: 1}(pubkey, value);
    }

    function returnTokenToDao(RootData root, string name, uint128 tokens)  public view senderIs(GoshLib.calculateRootAddress(_rootCode, root, tvm.pubkey(), _receiver)) accept functionID(1018) {

    }

    function updateCode(TvmCell newcode, TvmCell cell) public view onlyOwner accept {
        tvm.setcode(newcode);
        tvm.setCurrentCode(newcode);
//        cell = abi.encode();
        onCodeUpgrade(cell);
    }

    function onCodeUpgrade(TvmCell cell) private pure {
        cell;
    }

    function onCodeUpgrade() private pure  {
    }

    //Fallback/Receive
    receive() external pure {
    }
    
    onBounce(TvmSlice body) external pure {
        body;
    }
    
    fallback() external pure {
    }

    //Getter 
    function getVersion() external pure returns(string, string) {
        return ("receiver", _version);
    }
}
