pragma ton-solidity >= 0.57.0;


interface IBounceTokensBurnCallback {

    /*
        @notice Callback from TokenWallet on tokens burn reverted
        @param tokenRoot TokenRoot of received tokens
        @param amount Reverted tokens amount
    */
    function onBounceTokensBurn(
        address tokenRoot,
        uint128 amount
    ) external;


}
