pragma ton-solidity >= 0.57.0;


interface IAcceptTokensMintCallback {

    /*
        @notice Callback from TokenWallet on accept minted tokens
        @param tokenRoot TokenRoot of received tokens
        @param amount Minted tokens amount
        @param remainingGasTo Address specified for receive remaining gas
        @param payload Additional data attached to mint
    */
    function onAcceptTokensMint(
        address tokenRoot,
        uint128 amount,
        address remainingGasTo,
        TvmCell payload
    ) external;


}
