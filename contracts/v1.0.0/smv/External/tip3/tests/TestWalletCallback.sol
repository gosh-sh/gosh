pragma ton-solidity >= 0.57.0;

import "../additional/Wallet.sol";
import "../TokenRoot.sol";


struct TransferData {
    uint128 amount;
    address sender;
    address senderWallet;
    address remainingGasTo;
    TvmCell payload;
}


contract TestWalletCallback is
    Wallet,
    IAcceptTokensTransferCallback,
    IBounceTokensTransferCallback,
    IAcceptTokensMintCallback,
    IAcceptTokensBurnCallback,
    IBounceTokensBurnCallback
{
    uint16 WRONG_ROOT       = 10001;
    uint16 WRONG_OWNER      = 10002;
    uint16 WRONG_WALLET     = 10003;
    uint16 WRONG_VERSION    = 10004;

    address public _root;
    address public _wallet;
    TransferData public _transfer;

    bool public _bounced;
    uint128 public _bouncedAmount;
    address public _bouncedFrom;

    bool public _minted;
    uint128 public _mintedAmount;
    TvmCell public _mintedPayload;

    bool public _burned;
    uint128 public _burnedAmount;
    TvmCell public _burnedPayload;
    bool public _burnedBounced;


    constructor(address root) public {
        tvm.accept();
        _root = root;
    }

    function deployWallet(address walletOwner, uint128 deployWalletValue) public view {
        tvm.accept();
        TokenRoot(_root).deployWallet{
            value: deployWalletValue,
            flag: TokenMsgFlag.SENDER_PAYS_FEES,
            callback: onDeployWallet
        }(walletOwner, deployWalletValue);
    }

    function onDeployWallet(address wallet) public {
        require(msg.sender == _root, WRONG_ROOT);
        _wallet = wallet;
    }

    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) public override {
        require(msg.sender == _wallet, WRONG_WALLET);
        require(tokenRoot == _root, WRONG_ROOT);
        _transfer = TransferData(amount, sender, senderWallet, remainingGasTo, payload);
        remainingGasTo.transfer({value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false});
    }

    function onBounceTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address revertedFrom
    ) public override {
        require(msg.sender == _wallet, WRONG_WALLET);
        require(tokenRoot == _root, WRONG_ROOT);
        _bounced = true;
        _bouncedAmount = amount;
        _bouncedFrom = revertedFrom;
    }

    function onAcceptTokensMint(
        address tokenRoot,
        uint128 amount,
        address remainingGasTo,
        TvmCell payload
    ) public override {
        require(msg.sender == _wallet, WRONG_WALLET);
        require(tokenRoot == _root, WRONG_ROOT);
        _minted = true;
        _mintedAmount = amount;
        _mintedPayload = payload;
        remainingGasTo.transfer({value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false});
    }

    function onAcceptTokensBurn(
        uint128 amount,
        address walletOwner,
        address wallet,
        address remainingGasTo,
        TvmCell payload
    ) public override {
        require(msg.sender == _root, WRONG_ROOT);
        require(walletOwner == address(this), WRONG_OWNER);
        require(wallet == _wallet, WRONG_WALLET);
        _burned = true;
        _burnedAmount = amount;
        _burnedPayload = payload;
        remainingGasTo.transfer({value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false});
    }

    function onBounceTokensBurn(
        address tokenRoot,
        uint128 amount
    ) public override {
        require(msg.sender == _wallet, WRONG_WALLET);
        require(tokenRoot == _root, WRONG_ROOT);
        _burnedBounced = true;
        _burnedAmount = amount;
    }

}
