pragma ton-solidity >= 0.57.0;

import "./TIP3TokenRoot.sol";
import "./SID.sol";

interface ITokenRoot is TIP3TokenRoot, SID {

    /*
        @notice Get root owner
        @returns rootOwner
    */
    function rootOwner() external view responsible returns (address);

    /*
        @notice Derive TokenWallet address from owner address
        @param _owner TokenWallet owner address
        @returns Token wallet address
    */
    function walletOf(address owner) external view responsible returns (address);

    /*
        @notice Called by TokenWallet, when
        @dev Decrease total supply
        @dev Can be called only by correct token wallet contract
        @dev Fails if root token burn paused
        @param amount How much tokens was burned
        @param walletOwner Burner TokenWallet owner address
        @param remainingGasTo Receiver of the remaining EVERs
        @param callbackTo address of contract, which implement IBurnTokensCallback.burnCallback
               if it equals to 0:0 then no callbacks
        @param payload Custom data will be delivered into IBurnTokensCallback.burnCallback
    */
    function acceptBurn(
        uint128 amount,
        address walletOwner,
        address remainingGasTo,
        address callbackTo,
        TvmCell payload
    ) external functionID(0x192B51B1);

    /*
        @notice Mint tokens to recipient with deploy wallet optional
        @dev Can be called only by rootOwner
        @param amount How much tokens to mint
        @param recipient Minted tokens owner address
        @param deployWalletValue How much EVERs send to wallet on deployment, when == 0 then not deploy wallet before mint
        @param remainingGasTo Receiver the remaining balance after deployment. root owner by default
        @param notify - when TRUE and recipient specified 'callback' on his own TokenWallet,
                        then send IAcceptTokensTransferCallback.onAcceptTokensMint to specified callback address,
                        else this param will be ignored
        @param payload - custom payload for IAcceptTokensTransferCallback.onAcceptTokensMint
    */
    function mint(
        uint128 amount,
        address recipient,
        uint128 deployWalletValue,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) external;

    /*
        @notice Deploy new TokenWallet
        @dev Can be called by anyone
        @param owner Token wallet owner address
        @param deployWalletValue Gas value to
    */
    function deployWallet(
        address owner,
        uint128 deployWalletValue
    ) external responsible returns (address);
}
