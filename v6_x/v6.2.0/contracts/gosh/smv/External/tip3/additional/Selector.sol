pragma ton-solidity >= 0.57.0;

import "../interfaces/SID.sol";
import "../interfaces/TIP3TokenWallet.sol";
import "../interfaces/TIP3TokenRoot.sol";
import "../interfaces/ITokenRoot.sol";
import "../interfaces/ITransferableOwnership.sol";
import "../interfaces/ITokenWallet.sol";
import "../interfaces/IBurnableTokenWallet.sol";
import "../interfaces/IBurnableByRootTokenRoot.sol";
import "../interfaces/IBurnableByRootTokenWallet.sol";
import "../interfaces/IDestroyable.sol";
import "../interfaces/IVersioned.sol";
import "../interfaces/IDisableableMintTokenRoot.sol";
import "../interfaces/ITokenWalletUpgradeable.sol";
import "../interfaces/ITokenRootUpgradeable.sol";
import "../interfaces/IBurnPausableTokenRoot.sol";

interface TIP3 {
    function acceptBurn(uint128 _value) external;
    function acceptTransfer(uint128 _value) external;
    function acceptMint(uint128 _value) external;
}

contract Selector {
    uint static _randomNonce;

    constructor() public {
        tvm.accept();
    }

    function calculateAcceptTransferSelector() public pure returns (bytes4) {
        TIP3 i;
        return bytes4(tvm.functionId(i.acceptTransfer) - 1);
    }

    function calculateAcceptMintSelector() public pure returns (bytes4) {
        TIP3 i;
        return bytes4(tvm.functionId(i.acceptMint) - 1);
    }

    function calculateAcceptBurnSelector() public pure returns (bytes4) {
        TIP3 i;
        return bytes4(tvm.functionId(i.acceptBurn) - 1);
    }

    function calculateTIP3TokenRootInterfaceID() public pure returns (bytes4) {
        TIP3TokenRoot i;

        return bytes4(
            tvm.functionId(i.name) ^
            tvm.functionId(i.symbol) ^
            tvm.functionId(i.decimals) ^
            tvm.functionId(i.totalSupply) ^
            tvm.functionId(i.walletCode) ^ uint32(calculateAcceptBurnSelector())
        );
    }

    function calculateTIP3TokenWalletInterfaceID() public pure returns(bytes4) {
        TIP3TokenWallet i;

        return bytes4(
            tvm.functionId(i.root) ^
            tvm.functionId(i.balance) ^
            tvm.functionId(i.walletCode) ^ uint32(calculateAcceptTransferSelector()) ^ uint32(calculateAcceptMintSelector())
        );
    }

    function calculateSIDInterfaceID() public pure returns(bytes4) {
        SID i;

        return bytes4(tvm.functionId(i.supportsInterface));
    }

    function calculateVersionedInterfaceID() public pure returns(bytes4) {
        IVersioned i;

        return bytes4(tvm.functionId(i.version));
    }

    function calculateTokenRootInterfaceID() public pure returns (bytes4) {
        ITokenRoot i;

        return bytes4(
            tvm.functionId(i.rootOwner) ^
            tvm.functionId(i.walletOf) ^
            tvm.functionId(i.mint) ^
            tvm.functionId(i.deployWallet)
        );
    }

    function calculateTokenWalletInterfaceID() public pure returns (bytes4) {
        ITokenWallet i;

        return bytes4(
            tvm.functionId(i.owner) ^
            tvm.functionId(i.transfer) ^
            tvm.functionId(i.transferToWallet)
        );
    }

    function calculateBurnableTokenWalletInterfaceID() public pure returns (bytes4) {
        IBurnableTokenWallet i;

        return bytes4(tvm.functionId(i.burn));
    }

    function calculateBurnableByRootTokenRootInterfaceID() public pure returns (bytes4) {
        IBurnableByRootTokenRoot i;

        return bytes4(
            tvm.functionId(i.burnTokens) ^
            tvm.functionId(i.disableBurnByRoot) ^
            tvm.functionId(i.burnByRootDisabled)
        );
    }

    function calculateBurnableByRootTokenWalletInterfaceID() public pure returns (bytes4) {
        IBurnableByRootTokenWallet i;

        return bytes4(tvm.functionId(i.burnByRoot));
    }

    function calculateDestroyableInterfaceID() public pure returns (bytes4) {
        IDestroyable i;

        return bytes4(tvm.functionId(i.destroy));
    }

    function calculateDisableableMintTokenRootInterfaceID() public pure returns (bytes4) {
        IDisableableMintTokenRoot i;

        return bytes4(
            tvm.functionId(i.disableMint) ^
            tvm.functionId(i.mintDisabled)
        );
    }

    function calculateTransferableOwnershipInterfaceID() public pure returns (bytes4) {
        ITransferableOwnership i;

        return bytes4(
            tvm.functionId(i.transferOwnership)
        );
    }

    function calculateBurnPausableTokenRootInterfaceID() public pure returns (bytes4) {
        IBurnPausableTokenRoot i;

        return bytes4(
            tvm.functionId(i.setBurnPaused) ^
            tvm.functionId(i.burnPaused)
        );
    }

    function calculateTokenWalletUpgradeableInterfaceID() public pure returns (bytes4) {
        ITokenWalletUpgradeable i;

        return bytes4(
            tvm.functionId(i.platformCode) ^
            tvm.functionId(i.upgrade) ^
            tvm.functionId(i.acceptUpgrade)
        );
    }

    function calculateTokenRootUpgradeableInterfaceID() public pure returns (bytes4) {
        ITokenRootUpgradeable i;

        return bytes4(
            tvm.functionId(i.walletVersion) ^
            tvm.functionId(i.platformCode)  ^
            tvm.functionId(i.requestUpgradeWallet)  ^
            tvm.functionId(i.setWalletCode)  ^
            tvm.functionId(i.upgrade)
        );
    }
}
