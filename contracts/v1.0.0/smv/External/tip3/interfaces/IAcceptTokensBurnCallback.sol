pragma ton-solidity >= 0.57.0;

/*

1)
walletOwner -> IBurnableTokenWallet(wallet).burn(...) ->
               IBurnPausableTokenRoot(root).tokensBurned(...) ->
               IAcceptTokensBurnCallback(callbackTo).onAcceptTokensBurn(...) -> ...
2)
rootOwner -> IBurnableByRootTokenRoot(root).burnTokens(...) ->
             IBurnableByRootTokenWallet(wallet).burnByRoot(...) ->
             IBurnPausableTokenRoot(root).tokensBurned(...) ->
             IAcceptTokensBurnCallback(callbackTo).onAcceptTokensBurn(...) -> ...
*/


interface IAcceptTokensBurnCallback {

    /*
        @notice Callback from TokenRoot on tokens burned
        @param amount How much tokens was burned
        @param walletOwner Burner TokenWallet owner address
        @param remainingGasTo Receiver of the remaining EVERs
        @param payload - Custom data specified in IBurnableTokenWallet.burn or IBurnableByRootTokenRoot.burnTokens
    */
    function onAcceptTokensBurn(
        uint128 amount,
        address walletOwner,
        address wallet,
        address remainingGasTo,
        TvmCell payload
    ) external;
}
