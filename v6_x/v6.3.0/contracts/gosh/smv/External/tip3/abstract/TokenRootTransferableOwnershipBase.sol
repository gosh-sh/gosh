pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./TokenRootBase.sol";
import "../interfaces/ITransferableOwnership.sol";


abstract contract TokenRootTransferableOwnershipBase is TokenRootBase, ITransferableOwnership {

    function transferOwnership(
        address newOwner,
        address remainingGasTo,
        mapping(address => CallbackParams) callbacks
    )
        override
        external
        onlyRootOwner
    {
        tvm.rawReserve(_reserve(), 0);

        address oldOwner = rootOwner_;
        rootOwner_ = newOwner;

        optional(TvmCell) callbackToGasOwner;
        for ((address dest, CallbackParams p) : callbacks) {
            if (dest.value != 0) {
                if (remainingGasTo != dest) {
                    ITransferTokenRootOwnershipCallback(dest).onTransferTokenRootOwnership{
                        value: p.value,
                        flag: TokenMsgFlag.SENDER_PAYS_FEES,
                        bounce: false
                    }(oldOwner, rootOwner_, remainingGasTo, p.payload);
                } else {
                    callbackToGasOwner.set(p.payload);
                }
            }
        }

        if (remainingGasTo.value != 0) {
            if (callbackToGasOwner.hasValue()) {
                ITransferTokenRootOwnershipCallback(remainingGasTo).onTransferTokenRootOwnership{
                    value: 0,
                    flag: TokenMsgFlag.ALL_NOT_RESERVED,
                    bounce: false
                }(oldOwner, rootOwner_, remainingGasTo, callbackToGasOwner.get());
            } else {
                remainingGasTo.transfer({
                    value: 0,
                    flag: TokenMsgFlag.ALL_NOT_RESERVED + TokenMsgFlag.IGNORE_ERRORS,
                    bounce: false
                });
            }
        }
    }
}
