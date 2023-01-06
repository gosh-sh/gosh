pragma ton-solidity >= 0.57.0;

import "./ITokenRoot.sol";


interface ITokenRootUpgradeable is ITokenRoot {
    function walletVersion() external view responsible returns (uint32);
    function platformCode() external view responsible returns (TvmCell);

    function requestUpgradeWallet(uint32 currentVersion, address walletOwner, address remainingGasTo) external;
    function setWalletCode(TvmCell code) external;
    function upgrade(TvmCell code) external;
}
