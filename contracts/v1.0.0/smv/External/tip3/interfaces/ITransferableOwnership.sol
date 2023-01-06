pragma ton-solidity >= 0.57.0;

import "../structures/ICallbackParamsStructure.sol";

interface ITransferableOwnership is ICallbackParamsStructure {
    /*
        @notice Transfer ownership to new owner
        @dev Can be called only by current owner
        @param newOwner New owner
        @param remainingGasTo  Remaining gas receiver
        @param callbacks for receiving callback
    */
    function transferOwnership(
        address newOwner,
        address remainingGasTo,
        mapping(address => CallbackParams) callbacks
    ) external;
}
