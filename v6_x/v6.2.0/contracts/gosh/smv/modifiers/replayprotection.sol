// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * GOSH contracts
 *
 * Copyright (C) 2022 Serhii Horielyshev, GOSH pubkey 0xd060e0375b470815ea99d6bb2890a2a726c5b0579b83c742f5bb70e10a771a04
 */
pragma ever-solidity >=0.66.0;

import "./errors.sol";
import "./structs/structs.sol";

abstract contract ReplayProtection is Errors {   
    string constant versionRP = "6.2.0";
    
    mapping(uint32 => mapping(uint256 => bool)) messages;
    // Iteration count for cleaning mapping `messages`
    uint8 constant MAX_CLEANUP_ITERATIONS = 20;
    // Information about the last message
    MessageInfo lastMessage;
    // Dummy variable to demonstrate contract functionality.
    uint __value;
    
    modifier onlyOwner {
        require(msg.pubkey() == tvm.pubkey(), ERR_NOT_OWNER);
        _;
    }
    
    modifier accept() {
        tvm.accept();
        _;
    }
    
    modifier saveMsg() {
        _saveMsg();
        tvm.commit();
        _;
    }

    function _saveMsg() inline internal {
        gc();
        messages[lastMessage.expireAt][lastMessage.messageHash] = true;
    }
    
    // Function with predefined name which is used to replace custom replay protection.
    function afterSignatureCheck(TvmSlice body, TvmCell message) private inline returns (TvmSlice) {
        body.load(uint64); // The first 64 bits contain timestamp which is usually used to differentiate messages.
        // check expireAt
        uint32 expireAt = body.load(uint32);
        require(expireAt > block.timestamp, ERR_MESSAGE_EXPIRED);   // Check whether the message is not expired.
        require(expireAt < block.timestamp + 5 minutes, ERR_MESSAGE_WITH_HUGE_EXPIREAT); // Check whether expireAt is not too huge.

        // Check whether the message is not expired and then save (messageHash, expireAt) in the state variable
        uint messageHash = tvm.hash(message);
        optional(mapping(uint256 => bool)) m = messages.fetch(expireAt);
        require(!m.hasValue() || !m.get()[messageHash], ERR_MESSAGE_IS_EXIST);
        lastMessage = MessageInfo({messageHash: messageHash, expireAt: expireAt});

        // After reading message headers this function must return the rest of the body slice.
        return body;
    }
    
    /// Delete expired messages from `messages`.
    function gc() private {
        uint counter = 0;
        for ((uint32 expireAt, mapping(uint256 => bool) m) : messages) {
            m; // suspend compilation warning
            if (counter >= MAX_CLEANUP_ITERATIONS) {
                break;
            }
            counter++;
            if (expireAt <= block.timestamp) {
                delete messages[expireAt];
            } else {
                break;
            }
        }
    }
}
