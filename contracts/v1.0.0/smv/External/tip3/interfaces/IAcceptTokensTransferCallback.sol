pragma ton-solidity >= 0.57.0;

/*
    Callbacks from TokenWallet.
*/


interface IAcceptTokensTransferCallback {

    /*
        @notice Callback from TokenWallet on receive tokens transfer
        @param tokenWallet TokenWallet for which tokens were received
        @param tokenRoot TokenRoot of received tokens
        @param amount Received tokens amount
        @param sender Sender TokenWallet owner address
        @param senderWallet Sender TokenWallet address
        @param remainingGasTo Address specified for receive remaining gas
        @param payload Additional data attached to transfer by sender
    */
    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) external;


}
