pragma ton-solidity >= 0.57.0;

import "../additional/Wallet.sol";
import "../TokenRoot.sol";


struct CallbackData {
    address oldOwner;
    address newOwner;
    address remainingGasTo;
    TvmCell payload;
}


contract TestRootTransferCallback is Wallet, ITransferTokenRootOwnershipCallback {

    address public _root;
    CallbackData public _callback;

    constructor() public {
        tvm.accept();
    }

    function setRoot(address root) public {
        tvm.accept();
        _root = root;
    }

    function onTransferTokenRootOwnership(
        address oldOwner,
        address newOwner,
        address remainingGasTo,
        TvmCell payload
    ) public override {
        require(msg.sender == _root, TokenErrors.NOT_ROOT);
        _callback = CallbackData(oldOwner, newOwner, remainingGasTo, payload);
    }

}
