pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../interfaces/ITransferTokenRootOwnershipCallback.sol";
import "../interfaces/IAcceptTokensBurnCallback.sol";
import "../interfaces/ITokenRoot.sol";
import "../interfaces/ITokenWallet.sol";
import "../structures/ICallbackParamsStructure.sol";
import "../libraries/TokenErrors.sol";
import "../libraries/TokenMsgFlag.sol";


/*
    @title Fungible token  root contract
*/
abstract contract TokenRootBase is ITokenRoot, ICallbackParamsStructure {

    string static name_;
    string static symbol_;
    uint8 static decimals_;

    address static rootOwner_;

    TvmCell static walletCode_;

    uint128 totalSupply_;

    fallback() external {
    }

    modifier onlyRootOwner() {
        require(rootOwner_.value != 0 && rootOwner_ == msg.sender, TokenErrors.NOT_OWNER);
        _;
    }

    function name() override external view responsible returns (string) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } name_;
    }

    function symbol() override external view responsible returns (string) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } symbol_;
    }

    function decimals() override external view responsible returns (uint8) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } decimals_;
    }

    function totalSupply() override external view responsible returns (uint128) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } totalSupply_;
    }

    function walletCode() override external view responsible returns (TvmCell) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } walletCode_;
    }

    function rootOwner() override external view responsible returns (address) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } rootOwner_;
    }

    /*
        @notice Derive token wallet address from the public key or address
        @param walletOwner Token wallet owner address
        @returns walletOwner Token wallet address
    */
    function walletOf(address walletOwner)
        override
        public
        view
        responsible
        returns (address)
    {
        require(walletOwner.value != 0, TokenErrors.WRONG_WALLET_OWNER);
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } _getExpectedWalletAddress(walletOwner);
    }

    /*
        @notice Deploy new token wallet with empty tokens balance
        @dev Can be called by anyone to deploy new token wallet
        @param walletOwner Token wallet owner address
        @param deployWalletValue
    */
    function deployWallet(address walletOwner, uint128 deployWalletValue)
        public
        override
        responsible
        returns (address tokenWallet)
    {
        require(walletOwner.value != 0, TokenErrors.WRONG_WALLET_OWNER);
        tvm.rawReserve(_reserve(), 0);

        tokenWallet = _deployWallet(_buildWalletInitData(walletOwner), deployWalletValue, msg.sender);

        return { value: 0, flag: TokenMsgFlag.ALL_NOT_RESERVED, bounce: false } tokenWallet;
    }

    /*
        @notice Mint tokens to recipient with deploy wallet optional
        @dev Can be called only by owner
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
    )
        override
        external
        onlyRootOwner
    {
        require(_mintEnabled(), TokenErrors.MINT_DISABLED);
        require(amount > 0, TokenErrors.WRONG_AMOUNT);
        require(recipient.value != 0, TokenErrors.WRONG_RECIPIENT);

        tvm.rawReserve(_reserve(), 0);
        _mint(amount, recipient, deployWalletValue, remainingGasTo, notify, payload);
    }

    /*
        @notice Callback for token wallet tokens burn operation
        @dev Decrease total supply
        @dev Can be called only by correct token wallet contract
        @dev Fails if root token is paused
        @param tokens How much tokens was burned
        @param sender_public_key Token wallet owner public key
        @param sender_address Token wallet owner address
        @param send_gas_to Remaining balance receiver
        @param callback_address Callback receiver address
        @param callback_payload Callback payload
    */
    function acceptBurn(
        uint128 amount,
        address walletOwner,
        address remainingGasTo,
        address callbackTo,
        TvmCell payload
    )
        override
        external
        functionID(0x192B51B1)
    {
        require(_burnEnabled(), TokenErrors.BURN_DISABLED);
        require(msg.sender == _getExpectedWalletAddress(walletOwner), TokenErrors.SENDER_IS_NOT_VALID_WALLET);

        tvm.rawReserve(address(this).balance - msg.value, 2);

        totalSupply_ -= amount;

        if (callbackTo.value == 0) {
            remainingGasTo.transfer({
                value: 0,
                flag: TokenMsgFlag.ALL_NOT_RESERVED + TokenMsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        } else {
            IAcceptTokensBurnCallback(callbackTo).onAcceptTokensBurn{
                value: 0,
                flag: TokenMsgFlag.ALL_NOT_RESERVED + TokenMsgFlag.IGNORE_ERRORS,
                bounce: false
            }(
                amount,
                walletOwner,
                msg.sender,
                remainingGasTo,
                payload
            );
        }

    }

    // =============== Support functions ==================

    function _mint(
        uint128 amount,
        address recipient,
        uint128 deployWalletValue,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    )
        internal
    {
        TvmCell stateInit = _buildWalletInitData(recipient);

        address recipientWallet;

        if(deployWalletValue > 0) {
            recipientWallet = _deployWallet(stateInit, deployWalletValue, remainingGasTo);
        } else {
            recipientWallet = address(tvm.hash(stateInit));
        }

        totalSupply_ += amount;

        ITokenWallet(recipientWallet).acceptMint{ value: 0, flag: TokenMsgFlag.ALL_NOT_RESERVED, bounce: true }(
            amount,
            remainingGasTo,
            notify,
            payload
        );
    }

    /*
        @notice Derive wallet address from owner
        @param wallet_public_key_ Token wallet owner public key
        @param owner_address_ Token wallet owner address
    */
    function _getExpectedWalletAddress(address walletOwner) internal view returns (address) {
        return address(tvm.hash(_buildWalletInitData(walletOwner)));
    }

    /*
        @notice On-bounce handler
        @dev Used in case token wallet .accept fails so the totalSupply_ can be decreased back
    */
    onBounce(TvmSlice slice) external {
        if (slice.decode(uint32) == tvm.functionId(ITokenWallet.acceptMint)) {
            totalSupply_ -= slice.decode(uint128);
        }
    }

    /*
        @notice Withdraw all surplus balance in EVERs
        @dev Can by called only by owner address
        @param to Withdraw receiver
    */
    function sendSurplusGas(address to) external view onlyRootOwner {
        tvm.rawReserve(_targetBalance(), 0);
        to.transfer({
            value: 0,
            flag: TokenMsgFlag.ALL_NOT_RESERVED + TokenMsgFlag.IGNORE_ERRORS,
            bounce: false
        });
    }

    function _reserve() internal pure returns (uint128) {
        return math.max(address(this).balance - msg.value, _targetBalance());
    }

    function _targetBalance() virtual internal pure returns (uint128);
    function _mintEnabled() virtual internal view returns (bool);
    function _burnEnabled() virtual internal view returns (bool);
    function _buildWalletInitData(address walletOwner) virtual internal view returns (TvmCell);
    function _deployWallet(TvmCell initData, uint128 deployWalletValue, address remainingGasTo) virtual internal view returns (address);

}
