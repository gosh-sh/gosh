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
import "proposal.sol";

contract Receiver {

    string constant _version = "1.0.0";

    TvmCell _rootCode;

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
    ) accept {
    }

    function setRootCode(TvmCell code) public onlyOwner accept {
        _rootCode = code;
    }

    function burnTokens(RootData  root, uint256 pubkey, optional(address) owner, uint128 tokens, uint256 to) public view senderIs(ProposalLib.calculateRootAddress(_rootCode, root, tvm.pubkey(), this)) accept functionID(1017) {
        pubkey; owner; tokens; to;
        return;
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
