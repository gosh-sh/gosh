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

contract IndexWallet {

    string constant _version = "1.0.0";

    address static _checker;
    RootData static _root;

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
    
    constructor(
    ) senderIs(_checker) accept {
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
        return ("indexwallet", _version);
    }
}
