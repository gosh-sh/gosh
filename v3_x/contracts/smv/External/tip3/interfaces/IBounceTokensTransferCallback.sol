pragma ton-solidity >= 0.57.0;


interface IBounceTokensTransferCallback {

    /*
        @notice Callback from TokenWallet when tokens transfer reverted
        @param tokenWallet TokenWallet for which tokens were received
        @param tokenRoot TokenRoot of received tokens
        @param amount Reverted tokens amount
        @param revertedFrom Address which declained acceptTransfer
    */
    function onBounceTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address revertedFrom
    ) external;


}
