pragma ton-solidity >= 0.57.0;

import "./TIP3TokenWallet.sol";
import "./SID.sol";

interface ITokenWallet is TIP3TokenWallet, SID {

    /*
        @notice Get TokenWallet owner address
        @returns owner TokenWallet owner address
    */
    function owner() external view responsible returns (address);

    /*
        @notice Transfer tokens and optionally deploy TokenWallet for recipient
        @dev Can be called only by TokenWallet owner
        @dev If deployWalletValue !=0 deploy token wallet for recipient using that gas value
        @param amount How much tokens to transfer
        @param recipient Tokens recipient address
        @param deployWalletValue How much EVERs to attach to token wallet deploy
        @param remainingGasTo Remaining gas receiver
        @param notify Notify receiver on incoming transfer
        @param payload Notification payload
    */
    function transfer(
        uint128 amount,
        address recipient,
        uint128 deployWalletValue,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) external;

    /*
        @notice Transfer tokens using another TokenWallet address, that wallet must be deployed previously
        @dev Can be called only by token wallet owner
        @param amount How much tokens to transfer
        @param recipientWallet Recipient TokenWallet address
        @param remainingGasTo Remaining gas receiver
        @param notify Notify receiver on incoming transfer
        @param payload Notification payload
    */
    function transferToWallet(
        uint128 amount,
        address recipientTokenWallet,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) external;

    /*
        @notice Callback for transfer operation
        @dev Can be called only by another valid TokenWallet contract with same root
        @param amount How much tokens to receive
        @param sender Sender TokenWallet owner address
        @param remainingGasTo Remaining gas receiver
        @param notify Notify receiver on incoming transfer
        @param payload Notification payload
    */
    function acceptTransfer(
        uint128 amount,
        address sender,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) external functionID(0x67A0B95F);

    /*
        @notice Accept minted tokens from root
        @dev Can be called only by TokenRoot
        @param amount How much tokens to accept
        @param remainingGasTo Remaining gas receiver
        @param notify Notify receiver on incoming mint
        @param payload Notification payload
    */
    function acceptMint(
        uint128 amount,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) external functionID(0x4384F298);
}
