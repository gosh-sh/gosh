pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./TokenWalletBase.sol";
import "../interfaces/ITokenRoot.sol";
import "../interfaces/IDestroyable.sol";
import "../libraries/TokenErrors.sol";
import "../libraries/TokenMsgFlag.sol";


abstract contract TokenWalletDestroyableBase is TokenWalletBase, IDestroyable {

    function destroy(address remainingGasTo) override external onlyOwner {
        require(balance_ == 0, TokenErrors.NON_EMPTY_BALANCE);
        remainingGasTo.transfer({
            value: 0,
            flag: TokenMsgFlag.ALL_NOT_RESERVED + TokenMsgFlag.DESTROY_IF_ZERO,
            bounce: false
        });
    }
}
