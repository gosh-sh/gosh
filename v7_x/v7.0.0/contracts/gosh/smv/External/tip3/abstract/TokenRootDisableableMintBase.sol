pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./TokenRootBase.sol";
import "../interfaces/IDisableableMintTokenRoot.sol";
import "../libraries/TokenErrors.sol";
import "../libraries/TokenMsgFlag.sol";


abstract contract TokenRootDisableableMintBase is TokenRootBase, IDisableableMintTokenRoot {

    bool mintDisabled_;

    function disableMint() override external responsible onlyRootOwner returns (bool) {
        mintDisabled_ = true;
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } mintDisabled_;
    }

    function mintDisabled() override external view responsible returns (bool) {
        return { value: 0, flag: TokenMsgFlag.REMAINING_GAS, bounce: false } mintDisabled_;
    }

    function _mintEnabled() override internal view returns (bool) {
        return !mintDisabled_;
    }

}
