pragma ton-solidity >= 0.57.0;


interface ITransferTokenRootOwnershipCallback {

    function onTransferTokenRootOwnership(
        address oldOwner,
        address newOwner,
        address remainingGasTo,
        TvmCell payload
    ) external;

}
