pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./TokenRootBase.sol";
import "../interfaces/IBurnableByRootTokenRoot.sol";
import "../interfaces/IBurnableByRootTokenWallet.sol";
import "../libraries/TokenErrors.sol";
import "../libraries/TokenMsgFlag.sol";


abstract contract TokenRootBurnableByRootBase is TokenRootBase, IBurnableByRootTokenRoot {

    bool burnByRootDisabled_;

    /*
        @notice Burn tokens at specific token wallet
        @dev Can be called only by owner address
        @dev Don't support token wallet owner public key
        @param amount How much tokens to burn
        @param owner Token wallet owner address
        @param send_gas_to Receiver of the remaining balance after burn. sender_address by default
        @param callback_address Burn callback address
        @param callback_payload Burn callback payload
    */
    function burnTokens(
        uint128 amount,
        address walletOwner,
        address remainingGasTo,
        address callbackTo,
        TvmCell payload
    )
        override
        external
        onlyRootOwner
    {
        require(!burnByRootDisabled_, TokenErrors.BURN_BY_ROOT_DISABLED);
        require(amount > 0, TokenErrors.WRONG_AMOUNT);
        require(walletOwner.value != 0, TokenErrors.WRONG_WALLET_OWNER);

        IBurnableByRootTokenWallet(_getExpectedWalletAddress(walletOwner)).burnByRoot{
            value: 0,
            bounce: true,
            flag: TokenMsgFlag.REMAINING_GAS
        }(
            amount,
            remainingGasTo,
            callbackTo,
            payload
        );
    }

    function disableBurnByRoot() override external responsible onlyRootOwner returns (bool) {
        burnByRootDisabled_ = true;
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } burnByRootDisabled_;
    }

    function burnByRootDisabled() override external view responsible returns (bool) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } burnByRootDisabled_;
    }

}
